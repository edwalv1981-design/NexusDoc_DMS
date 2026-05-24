#Requires -Version 5.1
<#
.SYNOPSIS
  One-time Supabase DB -> local .env, migrate, seed admin, Fly secrets, deploy.
.DESCRIPTION
  Opens Supabase database settings. Paste the FULL Session pooler URI from Connect,
  replacing [YOUR-PASSWORD] with your database password, OR paste only the password.
  Project ref: ohwqfujrakhwxfuxo (Session pooler :6543).
  User must be postgres.ohwqfujrakhwxfuxo exactly (from Connect button).
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

function Build-DatabaseUrl([string]$password, [string]$hostName, [int]$port = 6543, [string]$user = $ExpectedDbUser) {
  if ([string]::IsNullOrWhiteSpace($password)) { throw 'Contraseña de base de datos vacía.' }
  $enc = Encode-DbPassword $password
  "postgres://${user}:${enc}@${hostName}:${port}/postgres?sslmode=require"
}

function Build-DatabaseUrlFromParsed($parsed) {
  if (Test-PlaceholderPassword $parsed.Password) {
    throw 'URI sin contraseña válida — reemplace [YOUR-PASSWORD] o pegue solo la contraseña.'
  }
  $user = $ExpectedDbUser
  if ($parsed.User -eq 'postgres' -and $parsed.Host -eq $DirectHost) {
    $user = 'postgres'
  } elseif ($parsed.User -ne $ExpectedDbUser) {
    Write-Host "Usuario URI '$($parsed.User)' != '$ExpectedDbUser' — usando usuario del panel Connect." -ForegroundColor Yellow
  }
  $enc = Encode-DbPassword $parsed.Password
  $qs = if ($parsed.Query) {
    if ($parsed.Query.StartsWith('?')) { $parsed.Query } else { "?$($parsed.Query)" }
  } else { '?sslmode=require' }
  if ($qs -notmatch 'sslmode=') { $qs = if ($qs -eq '?') { '?sslmode=require' } else { "$qs&sslmode=require" } }
  "postgres://${user}:${enc}@$($parsed.Host):$($parsed.Port)/$($parsed.Database)$qs"
}

function Merge-UriWithPassword($parsed, [string]$password) {
  if ([string]::IsNullOrWhiteSpace($password)) { throw 'Contraseña vacía.' }
  $parsed.Password = $password.Trim()
  if ($parsed.User -ne $ExpectedDbUser -and $parsed.User -ne 'postgres') {
    $parsed.User = $ExpectedDbUser
  }
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

function Write-TenantErrorHint {
  Write-Host ''
  Write-Host 'ERROR: Tenant or user not found — host/región del pooler incorrecto o usuario mal escrito.' -ForegroundColor Red
  Write-Host "  Usuario debe ser exactamente: $ExpectedDbUser" -ForegroundColor Yellow
  Write-Host '  Copie la URI COMPLETA desde Supabase → Connect → Session pooler (puerto 6543).' -ForegroundColor Yellow
  Write-Host '  Reemplace [YOUR-PASSWORD] por su contraseña de base de datos (NO la del admin de la app).' -ForegroundColor Yellow
}

function Test-Migrate([string]$url) {
  Assert-DatabaseUrlHasPassword $url
  Write-Host "Probando: $(Mask-DatabaseUrl $url)" -ForegroundColor Cyan
  $env:DATABASE_URL = $url
  $env:NODE_ENV = 'production'
  Push-Location $ServerDir
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
    $output = npm run db:migrate:url 2>&1 | Out-String
    if ($output -match 'DATABASE_URL sin contraseña|NO_PASSWORD|sin contraseña') {
      Write-Host 'Migrate rechazó URL sin contraseña.' -ForegroundColor Red
      return $false
    }
    if ($output -match 'Tenant or user not found') {
      Write-TenantErrorHint
      return $false
    }
    if ($output.Trim()) { Write-Host $output }
    return ($LASTEXITCODE -eq 0)
  } finally { Pop-Location }
}

function Get-PoolerHostOrder([string[]]$preferredHosts) {
  $order = [System.Collections.Generic.List[string]]::new()
  foreach ($h in $preferredHosts) {
    if ($h -and $h -match 'pooler\.supabase\.com$' -and $order -notcontains $h) {
      [void]$order.Add($h)
    }
  }
  foreach ($h in $PoolerHosts) {
    if ($order -notcontains $h) { [void]$order.Add($h) }
  }
  return $order
}

function Try-MigrateWithHosts([string]$password, [string[]]$hostOrder, [string]$user = $ExpectedDbUser) {
  foreach ($h in $hostOrder) {
    Write-Host "Pooler $h ..."
    if (-not (Test-PoolerDns $h)) { continue }
    $candidate = Build-DatabaseUrl $password $h 6543 $user
    if (Test-Migrate $candidate) {
      Write-Host "OK: $h" -ForegroundColor Green
      return $candidate
    }
    Write-Host "Falló migrate con $h" -ForegroundColor DarkYellow
  }
  return $null
}

function Try-MigrateDirect([string]$password) {
  Write-Host "Direct connection $DirectHost :5432 (usuario postgres) ..."
  if (-not (Test-PoolerDns $DirectHost)) { return $null }
  $candidate = Build-DatabaseUrl $password $DirectHost 5432 'postgres'
  if (Test-Migrate $candidate) {
    Write-Host "OK: direct $DirectHost" -ForegroundColor Green
    return $candidate
  }
  Write-Host "Falló migrate con direct $DirectHost" -ForegroundColor DarkYellow
  return $null
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
  Write-Host 'Supabase → Settings → Database → Connect → Session pooler (URI, puerto 6543)' -ForegroundColor Cyan
  Write-Host '  1) Pegue la URI COMPLETA y reemplace [YOUR-PASSWORD] por su contraseña de BD (recomendado)' -ForegroundColor Cyan
  Write-Host '  2) O solo la contraseña de base de datos (NO la del admin de la app)' -ForegroundColor Cyan
  Write-Host ''
  $input = Read-Host 'URI completa postgres://... o contraseña'
  if (-not $input) { throw 'Entrada vacía.' }
  return $input.Trim()
}

function Try-MigrateFromParsed($parsed, [string]$password, [string[]]$preferredHosts) {
  $merged = Merge-UriWithPassword $parsed $password
  $hostOrder = Get-PoolerHostOrder (@($merged.Host) + $preferredHosts)
  Write-Host "URI — host: $($merged.Host), usuario: $($merged.User)" -ForegroundColor Cyan
  if (Test-PoolerDns $merged.Host) {
    $exactUrl = Build-DatabaseUrlFromParsed $merged
    if (Test-Migrate $exactUrl) {
      Write-Host "OK: URI del panel ($($merged.Host))" -ForegroundColor Green
      return $exactUrl
    }
  }
  Write-Host 'URI exacta falló — probando otros poolers ...' -ForegroundColor Yellow
  $url = Try-MigrateWithHosts $merged.Password $hostOrder
  if ($url) { return $url }
  return Try-MigrateDirect $merged.Password
}

Repair-EnvPoolerHost

$workingUrl = $null
$preferredHosts = @()
$existingUrl = Get-ExistingDatabaseUrl

if ($existingUrl) {
  $existingParsed = Parse-PostgresUri $existingUrl
  if ($existingParsed -and -not $existingParsed.IsPasswordOnly -and $existingParsed.Host) {
    $preferredHosts += $existingParsed.Host
    Write-Host "server/.env: host $($existingParsed.Host) — $(Mask-DatabaseUrl $existingUrl)" -ForegroundColor DarkCyan
    if (-not (Test-PlaceholderPassword $existingParsed.Password) -and (Test-PoolerDns $existingParsed.Host)) {
      Write-Host 'Probando DATABASE_URL existente en .env ...' -ForegroundColor Cyan
      try {
        $fixedExisting = Build-DatabaseUrlFromParsed $existingParsed
        if (Test-Migrate $fixedExisting) {
          $workingUrl = $fixedExisting
          Write-Host 'OK: conexión con .env existente.' -ForegroundColor Green
        }
      } catch {
        Write-Host $_.Exception.Message -ForegroundColor DarkYellow
      }
    } else {
      Write-Host 'server/.env sin contraseña válida — pedirá URI o contraseña.' -ForegroundColor Yellow
    }
  }
}

if (-not $workingUrl) {
  if (-not $SkipBrowser) {
    $dash = "https://supabase.com/dashboard/project/$ProjectRef/settings/database"
    Write-Host "Abriendo: $dash"
    Start-Process $dash
  }

  $connInput = Read-ConnectionInput
  $parsed = Parse-PostgresUri $connInput

  if ($parsed -and $parsed.IsPasswordOnly) {
    $hostOrder = Get-PoolerHostOrder $preferredHosts
    Write-Host "Solo contraseña — poolers: $($hostOrder -join ', ')" -ForegroundColor Cyan
    $workingUrl = Try-MigrateWithHosts $parsed.Password $hostOrder
    if (-not $workingUrl) {
      $workingUrl = Try-MigrateDirect $parsed.Password
    }
  } elseif ($parsed) {
    $dbPassword = Resolve-PasswordForParsed $parsed $connInput
    $workingUrl = Try-MigrateFromParsed $parsed $dbPassword $preferredHosts
  } else {
    throw 'Entrada no reconocida. Pegue postgres://... desde Connect o solo la contraseña.'
  }
}

if (-not $workingUrl) {
  Write-TenantErrorHint
  throw 'Migración falló. Copie la URI COMPLETA del Session pooler en Supabase Connect (con contraseña en la URL).'
}

Assert-DatabaseUrlHasPassword $workingUrl

$jwt = $env:JWT_SECRET
if (-not $jwt) { $jwt = -join ((48..57 + 65..90 + 97..122 | Get-Random -Count 48 | ForEach-Object { [char]$_ })) }

$envLines = @(
  'NODE_ENV=development',
  "JWT_SECRET=$jwt",
  "DATABASE_URL=$workingUrl",
  'CORS_ORIGINS=https://nexusdoc-dms.fly.dev,http://localhost:5173',
  'DB_SYNC_ALTER=false',
  "BOOTSTRAP_ADMIN_EMAIL=$AdminEmail",
  "BOOTSTRAP_ADMIN_PASSWORD=$AdminPassword",
  'BOOTSTRAP_ADMIN_NAME=Administrador Maestro'
)
Set-Content -Path $EnvFile -Value ($envLines -join "`n") -Encoding UTF8
Write-Host "Escrito $EnvFile ($(Mask-DatabaseUrl $workingUrl))"

$env:DATABASE_URL = $workingUrl
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
  "DATABASE_URL=$workingUrl" `
  "JWT_SECRET=$jwt" `
  "BOOTSTRAP_ADMIN_EMAIL=$AdminEmail" `
  "BOOTSTRAP_ADMIN_PASSWORD=$AdminPassword" `
  "CORS_ORIGINS=https://nexusdoc-dms.fly.dev" `
  -a $FlyApp
if ($LASTEXITCODE -ne 0) { throw 'fly secrets set falló' }

Write-Host ''
Write-Host 'Fly secrets DATABASE_URL actualizado.' -ForegroundColor Cyan
Write-Host "  $(Mask-DatabaseUrl $workingUrl)" -ForegroundColor DarkGray

if (-not $SkipDeploy) {
  Push-Location $RepoRoot
  try {
    & $fly deploy -a $FlyApp
    if ($LASTEXITCODE -ne 0) { throw 'fly deploy falló' }
  } finally { Pop-Location }
}

Write-Host ''
Write-Host "Listo. Login: https://$FlyApp.fly.dev/  |  $AdminEmail" -ForegroundColor Green
