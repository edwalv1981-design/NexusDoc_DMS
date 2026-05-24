#Requires -Version 5.1
<#
.SYNOPSIS
  One-time Supabase DB -> local .env, migrate, seed admin, Fly secrets, deploy.
.DESCRIPTION
  Migraciones: intenta directa db.PROJECT_REF.supabase.co:5432; si DNS falla (común en
  algunos ISPs/Windows), migra por Session pooler aws-0-us-east-1.pooler.supabase.com
  :5432 o :6543 (usuario postgres.PROJECT_REF). aws-1 solo si aws-0 falla.
  Fly secrets usan la misma URL que migró cuando fue por pooler.
  Algunos ISPs/Windows bloquean db.*.supabase.co; el pooler .supabase.com suele resolver.
  Pega URI completa del panel Connect o solo la contraseña de base de datos.
#>
param(
  [string]$ProjectRef = 'ohwqfujrakhwxfuxo',
  [string[]]$PoolerHosts = @('aws-0-us-east-1.pooler.supabase.com', 'aws-1-us-east-1.pooler.supabase.com'),
  [string]$AdminEmail = 'edwinalvarezvivero@yahoo.com',
  [string]$AdminPassword = 'U3m3O2CJz1wnZegcsTYt',
  [string]$FlyApp = 'nexusdoc-dms',
  [switch]$SkipBrowser,
  [switch]$SkipDeploy
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ServerDir = Join-Path $RepoRoot 'server'
$EnvFile = Join-Path $ServerDir '.env'
$ExpectedDbUser = "postgres.$ProjectRef"
$DirectHost = "db.$ProjectRef.supabase.co"

function Repair-EnvPoolerHost {
  if (-not (Test-Path $EnvFile)) { return }
  $content = Get-Content $EnvFile -Raw
  if ($content -notmatch 'pooler\.supabase\.co') { return }
  $fixed = $content -replace 'pooler\.supabase\.co', 'pooler.supabase.com'
  Set-Content -Path $EnvFile -Value $fixed.TrimEnd() -Encoding UTF8
  Write-Host "Corregido host pooler .supabase.co -> .supabase.com en $EnvFile" -ForegroundColor Yellow
}

function Get-Flyctl {
  $cmd = Get-Command flyctl -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $default = Join-Path $env:USERPROFILE '.fly\bin\flyctl.exe'
  if (Test-Path $default) { return $default }
  throw 'flyctl no encontrado: https://fly.io/docs/flyctl/install/'
}

function Encode-DbPassword([string]$plain) {
  [System.Uri]::EscapeDataString($plain)
}

function Test-PlaceholderPassword([string]$pass) {
  if ([string]::IsNullOrWhiteSpace($pass)) { return $true }
  $p = $pass.Trim()
  if ($p -match '^\[YOUR-PASSWORD\]$' -or $p -match '^\[PASSWORD\]$') { return $true }
  if ($p -match '^(?i)YOUR[-_]?PASSWORD$') { return $true }
  return $false
}

function Test-IsPostgresUri([string]$text) {
  $t = $text.Trim()
  return ($t -match '^(?i)postgres(ql)?://' -or ($t -match '@' -and $t -match '(?i)pooler\.supabase|\.supabase\.co'))
}

function Parse-PostgresUri([string]$raw) {
  if (-not $raw) { return $null }
  $s = $raw.Trim().Trim('"', "'")
  if ($s -match '^(?i)DATABASE_URL\s*=\s*(.+)$') { $s = $Matches[1].Trim().Trim('"', "'") }
  $s = $s -replace '^(?i)postgresql://', 'postgres://'

  if ($s -notmatch '^(?i)postgres://') {
    if ($s -match '@') { $s = "postgres://$s" } else {
      return [PSCustomObject]@{
        IsPasswordOnly = $true
        Password       = $s
      }
    }
  }

  if ($s -notmatch '^(?i)postgres://([^@]+)@(.+)$') { return $null }

  $userPart = $Matches[1]
  $rest = $Matches[2]
  $colon = $userPart.IndexOf(':')
  $user = if ($colon -ge 0) {
    [Uri]::UnescapeDataString($userPart.Substring(0, $colon))
  } else {
    [Uri]::UnescapeDataString($userPart)
  }
  $pass = if ($colon -ge 0) {
    [Uri]::UnescapeDataString($userPart.Substring($colon + 1))
  } else { '' }

  $pathQuery = $rest
  $query = ''
  $qIdx = $pathQuery.IndexOf('?')
  if ($qIdx -ge 0) {
    $query = $pathQuery.Substring($qIdx)
    $pathQuery = $pathQuery.Substring(0, $qIdx)
  }
  $slashIdx = $pathQuery.IndexOf('/')
  $hostPort = if ($slashIdx -ge 0) { $pathQuery.Substring(0, $slashIdx) } else { $pathQuery }
  $db = if ($slashIdx -ge 0) { $pathQuery.Substring($slashIdx + 1) } else { 'postgres' }
  if (-not $db) { $db = 'postgres' }

  $port = 6543
  $poolerHost = $hostPort
  $lastColon = $hostPort.LastIndexOf(':')
  if ($lastColon -gt 0) {
    $maybePort = $hostPort.Substring($lastColon + 1)
    if ($maybePort -match '^\d+$') {
      $port = [int]$maybePort
      $poolerHost = $hostPort.Substring(0, $lastColon)
    }
  }
  $poolerHost = ($poolerHost -replace '\.supabase\.co$', '.supabase.com')

  [PSCustomObject]@{
    IsPasswordOnly = $false
    User           = $user
    Password       = $pass
    Host           = $poolerHost
    Port           = $port
    Database       = $db
    Query          = $query
  }
}

function Mask-DatabaseUrl([string]$url) {
  if (-not $url) { return '(vacío)' }
  try {
    $parsed = Parse-PostgresUri $url
    if (-not $parsed -or $parsed.IsPasswordOnly) { return '(URL inválida)' }
    $cred = if ($parsed.Password -and -not (Test-PlaceholderPassword $parsed.Password)) {
      "$($parsed.User):***"
    } else {
      "$($parsed.User):(sin contraseña)"
    }
    $qs = if ($parsed.Query) { $parsed.Query } elseif ($url -match '\?') { $url.Substring($url.IndexOf('?')) } else { '?sslmode=require' }
    if ($qs -and $qs -notmatch '^\?') { $qs = "?$qs" }
    if (-not $qs) { $qs = '?sslmode=require' }
    return "postgres://${cred}@$($parsed.Host):$($parsed.Port)/$($parsed.Database)$qs"
  } catch {
    return '(URL inválida)'
  }
}

function Assert-DatabaseUrlHasPassword([string]$url) {
  $parsed = Parse-PostgresUri $url
  if (-not $parsed -or $parsed.IsPasswordOnly) {
    throw "DATABASE_URL inválida: $(Mask-DatabaseUrl $url)"
  }
  if (Test-PlaceholderPassword $parsed.Password) {
    throw "DATABASE_URL sin contraseña (reemplace [YOUR-PASSWORD] en la URI de Connect): $(Mask-DatabaseUrl $url)"
  }
}

function Build-DirectDatabaseUrl([string]$password) {
  if ([string]::IsNullOrWhiteSpace($password)) { throw 'Contraseña de base de datos vacía.' }
  $enc = Encode-DbPassword $password
  "postgres://postgres:${enc}@${DirectHost}:5432/postgres?sslmode=require"
}

function Build-SessionPoolerUrl(
  [string]$password,
  [string]$hostName,
  [string]$user = $ExpectedDbUser,
  [int]$port = 5432
) {
  if ([string]::IsNullOrWhiteSpace($password)) { throw 'Contraseña de base de datos vacía.' }
  $enc = Encode-DbPassword $password
  "postgres://${user}:${enc}@${hostName}:${port}/postgres?sslmode=require"
}

function Build-SessionPoolerUrlFromParsed($parsed) {
  if (Test-PlaceholderPassword $parsed.Password) {
    throw 'URI sin contraseña válida — reemplace [YOUR-PASSWORD] o pegue solo la contraseña.'
  }
  $hostName = ($parsed.Host -replace '\.supabase\.co$', '.supabase.com')
  $user = if ($parsed.User -eq 'postgres') { $ExpectedDbUser } else { $parsed.User }
  if ($user -ne $ExpectedDbUser -and $parsed.User -ne 'postgres') {
    Write-Host "Usuario URI '$($parsed.User)' — Session pooler usa $ExpectedDbUser." -ForegroundColor Yellow
    $user = $ExpectedDbUser
  }
  $port = if ($parsed.Port -in @(5432, 6543)) { [int]$parsed.Port } else { 5432 }
  Build-SessionPoolerUrl $parsed.Password $hostName $user $port
}

function Merge-UriWithPassword($parsed, [string]$password) {
  if ([string]::IsNullOrWhiteSpace($password)) { throw 'Contraseña vacía.' }
  $parsed.Password = $password.Trim()
  $parsed
}

function Get-ExistingDatabaseUrl {
  if (-not (Test-Path $EnvFile)) { return $null }
  foreach ($line in Get-Content $EnvFile) {
    if ($line -match '^\s*DATABASE_URL\s*=\s*(.+)\s*$') {
      return $Matches[1].Trim().Trim('"', "'")
    }
  }
  return $null
}

function Test-PoolerDns([string]$hostName) {
  try {
    $null = [System.Net.Dns]::GetHostEntry($hostName)
    Write-Host "DNS OK: $hostName" -ForegroundColor DarkGray
    return $true
  } catch {
    Write-Host "DNS falló: $hostName — $($_.Exception.Message)" -ForegroundColor DarkYellow
    return $false
  }
}

function Test-PoolerReachability([string]$hostName) {
  Write-Host "Pooler $hostName — nslookup + Test-NetConnection ..." -ForegroundColor DarkGray
  try {
    $nsLines = @(nslookup $hostName 2>&1 | ForEach-Object { "$_" })
    $nsText = $nsLines -join "`n"
    if ($nsText -match '(?i)Address(es)?\s*:\s*[\d\.a-f:]+' -or $nsText -match 'Nombre:\s') {
      $tail = $nsLines | Select-Object -Last 8
      Write-Host ($tail -join "`n") -ForegroundColor DarkGray
    } else {
      Write-Host "nslookup sin dirección para $hostName" -ForegroundColor DarkYellow
      return $false
    }
  } catch {
    Write-Host "nslookup error: $($_.Exception.Message)" -ForegroundColor DarkYellow
  }
  if (-not (Test-PoolerDns $hostName)) { return $false }
  foreach ($port in @(5432, 6543)) {
    try {
      $tnc = Test-NetConnection -ComputerName $hostName -Port $port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
      if ($tnc.TcpTestSucceeded) {
        Write-Host "TCP OK: ${hostName}:$port" -ForegroundColor DarkGreen
        return $true
      }
      Write-Host "TCP no alcanzable: ${hostName}:$port" -ForegroundColor DarkYellow
    } catch {
      Write-Host "Test-NetConnection ${hostName}:$port — $($_.Exception.Message)" -ForegroundColor DarkYellow
    }
  }
  Write-Host "DNS OK pero puertos 5432/6543 no respondieron — se intentará migrate igual." -ForegroundColor DarkYellow
  return $true
}

function Write-PasswordErrorHint {
  Write-Host ''
  Write-Host 'Contraseña incorrecta. Verifique en Supabase → Settings → Database → Reset database password.' -ForegroundColor Red
  Write-Host '  Use la contraseña de BASE DE DATOS (no la del admin de la app).' -ForegroundColor Yellow
}

function Write-TenantErrorHint {
  Write-Host ''
  Write-Host 'ERROR: Tenant or user not found — project ref, host o usuario incorrectos.' -ForegroundColor Red
  Write-Host "  Verifique ref en dashboard: https://supabase.com/dashboard/project/$ProjectRef" -ForegroundColor Yellow
  Write-Host "  Use aws-0-us-east-1.pooler.supabase.com (no aws-1 salvo que aws-0 falle)." -ForegroundColor Yellow
  Write-Host "  Usuario pooler: $ExpectedDbUser (no postgres@pooler)." -ForegroundColor Yellow
}

function Write-DirectDnsBlockedHint {
  Write-Host ''
  Write-Host "DNS no resuelve $DirectHost (Host desconocido)." -ForegroundColor Yellow
  Write-Host '  Algunos ISPs o Windows bloquean db.*.supabase.co; el pooler aws-0 suele funcionar.' -ForegroundColor Cyan
  Write-Host '  Continuando migrate por Session pooler (aws-0, puertos 5432 luego 6543)...' -ForegroundColor Cyan
}

function Test-MigrateOutput([string]$joined) {
  if ($joined -match 'password authentication failed|28P01|invalid password|Contraseña incorrecta') {
    Write-PasswordErrorHint
    return 'bad_password'
  }
  if ($joined -match 'DATABASE_URL sin contraseña|NO_PASSWORD|sin contraseña') {
    Write-Host 'Migrate rechazó URL sin contraseña.' -ForegroundColor Red
    return 'no_password'
  }
  if ($joined -match 'Tenant or user not found') {
    Write-TenantErrorHint
    return 'tenant'
  }
  return $null
}

function Test-Migrate([string]$url) {
  Assert-DatabaseUrlHasPassword $url
  Write-Host "Probando: $(Mask-DatabaseUrl $url)" -ForegroundColor Cyan
  $env:DATABASE_URL = $url
  $env:NODE_ENV = 'production'
  $env:SUPABASE_PROJECT_REF = $ProjectRef
  Push-Location $ServerDir
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    node -e "const u=new URL(process.argv[1].replace(/^postgresql:/,'postgres:'));if(!u.password){console.error('NO_PASSWORD');process.exit(2)};const dns=require('dns');dns.lookup(u.hostname,(e)=>process.exit(e?1:0));" $url
    if ($LASTEXITCODE -eq 2) {
      Write-Host 'URL sin contraseña detectada por Node — omitiendo.' -ForegroundColor Red
      return $false
    }
    if ($LASTEXITCODE -ne 0) {
      Write-Host 'Host no resuelve en Node — omitiendo.' -ForegroundColor DarkYellow
      return $false
    }

    $outputLines = [System.Collections.Generic.List[string]]::new()
    node scripts/migrate-with-url.mjs 2>&1 | ForEach-Object {
      $line = if ($_ -is [System.Management.Automation.ErrorRecord]) {
        if ($_.Exception.Message) { $_.Exception.Message } else { "$_" }
      } else {
        "$_"
      }
      [void]$outputLines.Add($line)
      Write-Host $line
    }
    $joined = $outputLines -join "`n"
    $hint = Test-MigrateOutput $joined
    if ($hint -eq 'bad_password') { return $false }
    if ($hint -in @('no_password', 'tenant')) { return $false }
    return ($LASTEXITCODE -eq 0)
  } finally {
    $ErrorActionPreference = $prevEap
    Pop-Location
  }
}

function Get-PoolerHostOrder([string[]]$preferredHosts) {
  $order = [System.Collections.Generic.List[string]]::new()
  $aws0 = $PoolerHosts[0]
  if ($aws0) { [void]$order.Add($aws0) }
  foreach ($h in $preferredHosts) {
    if ($h -and $h -match 'pooler\.supabase\.com$' -and $order -notcontains $h) {
      [void]$order.Add($h)
    }
  }
  if (-not (Test-PoolerDns $aws0)) {
    Write-Host 'aws-0 sin DNS — añadiendo aws-1 como respaldo.' -ForegroundColor Yellow
    foreach ($h in $PoolerHosts | Select-Object -Skip 1) {
      if ($h -and $order -notcontains $h) { [void]$order.Add($h) }
    }
  }
  return $order
}

function Get-FirstReachablePoolerHost([string[]]$hostOrder) {
  foreach ($h in $hostOrder) {
    if (Test-PoolerDns $h) { return $h }
  }
  return $PoolerHosts[0]
}

function Try-MigrateDirect([string]$password) {
  Write-Host "Migrate (directa) $DirectHost :5432 usuario postgres ..."
  if (-not (Test-PoolerDns $DirectHost)) {
    Write-DirectDnsBlockedHint
    return $null
  }
  $candidate = Build-DirectDatabaseUrl $password
  if (Test-Migrate $candidate) {
    Write-Host "OK migrate: direct $DirectHost" -ForegroundColor Green
    return [PSCustomObject]@{
      MigrateUrl       = $candidate
      Password         = $password
      ConnectionKind   = 'direct'
    }
  }
  Write-Host "Falló migrate con direct $DirectHost — probando Session pooler..." -ForegroundColor DarkYellow
  return $null
}

function Try-MigrateViaSessionPooler([string]$password, [string[]]$preferredHosts) {
  $hostOrder = Get-PoolerHostOrder $preferredHosts
  $primary = $hostOrder[0]
  if ($primary) { Test-PoolerReachability $primary | Out-Null }

  foreach ($h in $hostOrder) {
    if (-not (Test-PoolerDns $h)) { continue }
    foreach ($port in @(5432, 6543)) {
      $url = Build-SessionPoolerUrl $password $h $ExpectedDbUser $port
      Write-Host "Migrate Session pooler $h`:$port ($ExpectedDbUser) ..."
      if (Test-Migrate $url) {
        Write-Host "OK migrate: Session pooler $h`:$port" -ForegroundColor Green
        return [PSCustomObject]@{
          MigrateUrl     = $url
          Password       = $password
          ConnectionKind = 'pooler'
        }
      }
    }
  }
  return $null
}

function Try-MigrateWithFallback([string]$password, [string[]]$preferredHosts) {
  $direct = Try-MigrateDirect $password
  if ($direct) { return $direct }
  return Try-MigrateViaSessionPooler $password $preferredHosts
}

function Test-SessionPoolerQuery([string]$url) {
  Assert-DatabaseUrlHasPassword $url
  Write-Host "  Session pooler: $(Mask-DatabaseUrl $url)" -ForegroundColor DarkGray
  Push-Location $ServerDir
  try {
    node -e "const {Client}=require('pg');(async()=>{const c=new Client({connectionString:process.argv[1]});try{await c.connect();await c.query('SELECT 1');await c.end();process.exit(0);}catch(e){console.error(e.message);process.exit(1);}})();" $url
    return ($LASTEXITCODE -eq 0)
  } finally {
    Pop-Location
  }
}

function Resolve-SessionPoolerAppUrl([string]$password, $parsedFromConnect, [string[]]$preferredHosts) {
  $hostOrder = Get-PoolerHostOrder $preferredHosts
  $candidates = [System.Collections.Generic.List[PSCustomObject]]::new()

  if ($parsedFromConnect -and -not $parsedFromConnect.IsPasswordOnly) {
    $h = ($parsedFromConnect.Host -replace '\.supabase\.co$', '.supabase.com')
    if ($h -match 'pooler\.supabase\.com$') {
      $user = if ($parsedFromConnect.User -eq 'postgres') { $ExpectedDbUser } else { $parsedFromConnect.User }
      $uriPort = if ($parsedFromConnect.Port -in @(5432, 6543)) { [int]$parsedFromConnect.Port } else { 5432 }
      [void]$candidates.Add([PSCustomObject]@{
          Host  = $h
          User  = $user
          Port  = $uriPort
          Label = "URI Connect ($h`:$uriPort)"
        })
    }
  }

  foreach ($h in $hostOrder) {
    if (($candidates | ForEach-Object { $_.Host }) -contains $h) { continue }
    [void]$candidates.Add([PSCustomObject]@{
        Host  = $h
        User  = $ExpectedDbUser
        Port  = 5432
        Label = "$h`:5432"
      })
  }

  foreach ($c in $candidates) {
    if (-not (Test-PoolerDns $c.Host)) { continue }
    $portsToTry = @()
    if ($c.Port) { [void]$portsToTry.Add([int]$c.Port) }
    foreach ($p in @(5432, 6543)) {
      if ($portsToTry -notcontains $p) { [void]$portsToTry.Add($p) }
    }
    foreach ($port in $portsToTry) {
      $url = Build-SessionPoolerUrl $password $c.Host $c.User $port
      Write-Host "Probando Session pooler ($($c.Label), puerto $port) ..."
      if (Test-SessionPoolerQuery $url) {
        Write-Host "OK Session pooler: $($c.Host):$port" -ForegroundColor Green
        return $url
      }
    }
  }

  $fallbackHost = Get-FirstReachablePoolerHost $hostOrder
  $fallback = Build-SessionPoolerUrl $password $fallbackHost $ExpectedDbUser
  Write-Host "Ningún pooler respondió a SELECT 1 — usando DNS OK: $fallbackHost (revise en Fly si falla)." -ForegroundColor Yellow
  $fallback
}

function Resolve-PasswordForParsed($parsed, [string]$fallbackInput) {
  if (-not (Test-PlaceholderPassword $parsed.Password)) { return $parsed.Password }
  if ($fallbackInput -and -not (Test-IsPostgresUri $fallbackInput)) {
    return $fallbackInput.Trim()
  }
  Write-Host ''
  Write-Host 'La URI no incluye contraseña (o tiene [YOUR-PASSWORD]).' -ForegroundColor Yellow
  Write-Host 'Pegue la contraseña de base de datos de Supabase → Settings → Database:' -ForegroundColor Cyan
  $pw = Read-Host 'Contraseña'
  if (-not $pw) { throw 'Contraseña vacía.' }
  $pw.Trim()
}

function Read-ConnectionInput {
  Write-Host ''
  Write-Host 'Supabase → Settings → Database → Connect' -ForegroundColor Cyan
  Write-Host '  1) URI COMPLETA desde Connect (Session pooler aws-0 — detecta región)' -ForegroundColor Cyan
  Write-Host '  2) Solo la contraseña de BD (directa si DNS OK; si no, pooler aws-0 :5432/:6543)' -ForegroundColor Cyan
  Write-Host '  Nota: algunos ISPs bloquean db.*.supabase.co; el pooler aws-0 suele resolver.' -ForegroundColor DarkGray
  Write-Host ''
  $input = Read-Host 'URI completa postgres://... o contraseña'
  if (-not $input) { throw 'Entrada vacía.' }
  return $input.Trim()
}

function Try-MigrateFromParsed($parsed, [string]$password, [string[]]$preferredHosts) {
  $merged = Merge-UriWithPassword $parsed $password
  $hosts = @($preferredHosts)
  if ($merged.Host -match 'pooler\.supabase\.com') {
    $h = ($merged.Host -replace '\.supabase\.co$', '.supabase.com')
    if ($hosts -notcontains $h) { $hosts = @($h) + $hosts }
    Write-Host "URI pooler Connect ($h) — migrate con misma URL (Fly igual)." -ForegroundColor Cyan
    $url = Build-SessionPoolerUrlFromParsed $merged
    if (Test-Migrate $url) {
      return [PSCustomObject]@{
        MigrateUrl     = $url
        Password       = $merged.Password
        ConnectionKind = 'pooler'
      }
    }
    Write-Host 'Migrate con URI Connect falló — directa o aws-0 ...' -ForegroundColor Yellow
  }
  return Try-MigrateWithFallback $merged.Password $hosts
}

Repair-EnvPoolerHost

Write-Host 'Comprobando pooler Supabase (aws-0 primero)...' -ForegroundColor Cyan
Test-PoolerReachability 'aws-0-us-east-1.pooler.supabase.com' | Out-Null

$migrateResult = $null
$preferredHosts = @()
$connInput = $null
$parsedForApp = $null
$existingUrl = Get-ExistingDatabaseUrl

if ($existingUrl) {
  $existingParsed = Parse-PostgresUri $existingUrl
  if ($existingParsed -and -not $existingParsed.IsPasswordOnly -and $existingParsed.Host) {
    $parsedForApp = $existingParsed
    $preferredHosts += $existingParsed.Host
    Write-Host "server/.env: $(Mask-DatabaseUrl $existingUrl)" -ForegroundColor DarkCyan
    if (-not (Test-PlaceholderPassword $existingParsed.Password)) {
      Write-Host 'Probando DATABASE_URL existente en .env (directa, luego pooler aws-0) ...' -ForegroundColor Cyan
      $prevEap = $ErrorActionPreference
      $ErrorActionPreference = 'Continue'
      try {
        $try = Try-MigrateWithFallback $existingParsed.Password $preferredHosts
        if ($try) {
          $migrateResult = $try
          Write-Host "OK: migrate (.env, $($try.ConnectionKind))." -ForegroundColor Green
        }
      } catch {
        Write-Host $_.Exception.Message -ForegroundColor DarkYellow
      } finally {
        $ErrorActionPreference = $prevEap
      }
    } else {
      Write-Host 'server/.env sin contraseña válida — pedirá URI o contraseña.' -ForegroundColor Yellow
    }
  }
}

if (-not $migrateResult) {
  if (-not $SkipBrowser) {
    $dash = "https://supabase.com/dashboard/project/$ProjectRef/settings/database"
    Write-Host "Abriendo: $dash"
    Start-Process $dash
  }

  $connInput = Read-ConnectionInput
  $parsed = Parse-PostgresUri $connInput

  if ($parsed -and $parsed.IsPasswordOnly) {
    Write-Host 'Solo contraseña — migrate directa o pooler aws-0 si DNS directa falla' -ForegroundColor Cyan
    $migrateResult = Try-MigrateWithFallback $parsed.Password $preferredHosts
  } elseif ($parsed) {
    $parsedForApp = $parsed
    $dbPassword = Resolve-PasswordForParsed $parsed $connInput
    $migrateResult = Try-MigrateFromParsed $parsed $dbPassword $preferredHosts
  } else {
    throw 'Entrada no reconocida. Pegue postgres://... desde Connect o solo la contraseña.'
  }
}

if (-not $migrateResult) {
  Write-TenantErrorHint
  throw 'Migración falló (directa y pooler). Verifique contraseña y PROJECT_REF en el dashboard.'
}

if ($connInput -and -not $parsedForApp) {
  $parsedForApp = Parse-PostgresUri $connInput
}
if ($migrateResult.ConnectionKind -eq 'pooler') {
  $appUrl = $migrateResult.MigrateUrl
  Write-Host 'Fly/.env usarán la misma URL Session pooler que migró.' -ForegroundColor Cyan
} else {
  $appUrl = Resolve-SessionPoolerAppUrl $migrateResult.Password $parsedForApp $preferredHosts
}
Assert-DatabaseUrlHasPassword $appUrl
Write-Host "App/Fly URL (Session pooler): $(Mask-DatabaseUrl $appUrl)" -ForegroundColor Cyan

$jwt = $env:JWT_SECRET
if (-not $jwt) { $jwt = -join ((48..57 + 65..90 + 97..122 | Get-Random -Count 48 | ForEach-Object { [char]$_ })) }

$envLines = @(
  'NODE_ENV=development',
  "JWT_SECRET=$jwt",
  "DATABASE_URL=$appUrl",
  'CORS_ORIGINS=https://nexusdoc-dms.fly.dev,http://localhost:5173',
  'DB_SYNC_ALTER=false',
  "BOOTSTRAP_ADMIN_EMAIL=$AdminEmail",
  "BOOTSTRAP_ADMIN_PASSWORD=$AdminPassword",
  'BOOTSTRAP_ADMIN_NAME=Administrador Maestro'
)
Set-Content -Path $EnvFile -Value ($envLines -join "`n") -Encoding UTF8
Write-Host "Escrito $EnvFile ($(Mask-DatabaseUrl $appUrl))"

$env:DATABASE_URL = $appUrl
$env:BOOTSTRAP_ADMIN_EMAIL = $AdminEmail
$env:BOOTSTRAP_ADMIN_PASSWORD = $AdminPassword
$env:NODE_ENV = 'production'
Push-Location $ServerDir
try {
  npm run seed:admin
  if ($LASTEXITCODE -ne 0) { throw 'seed:admin falló' }
} finally { Pop-Location }

$fly = Get-Flyctl
& $fly secrets set `
  "DATABASE_URL=$appUrl" `
  "JWT_SECRET=$jwt" `
  "BOOTSTRAP_ADMIN_EMAIL=$AdminEmail" `
  "BOOTSTRAP_ADMIN_PASSWORD=$AdminPassword" `
  "CORS_ORIGINS=https://nexusdoc-dms.fly.dev" `
  -a $FlyApp
if ($LASTEXITCODE -ne 0) { throw 'fly secrets set falló' }

Write-Host ''
Write-Host 'Fly secrets DATABASE_URL actualizado (misma URL que migrate / Session pooler).' -ForegroundColor Cyan
Write-Host "  $(Mask-DatabaseUrl $appUrl)" -ForegroundColor DarkGray

if (-not $SkipDeploy) {
  Push-Location $RepoRoot
  try {
    & $fly deploy -a $FlyApp
    if ($LASTEXITCODE -ne 0) { throw 'fly deploy falló' }
  } finally { Pop-Location }
}

Write-Host ''
Write-Host "Listo. Login: https://$FlyApp.fly.dev/  |  $AdminEmail" -ForegroundColor Green
