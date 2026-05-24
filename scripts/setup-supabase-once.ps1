#Requires -Version 5.1
<#
.SYNOPSIS
  One-time Supabase DB -> local .env, migrate, seed admin, Fly secrets, deploy.
.DESCRIPTION
  Opens Supabase database settings. Paste the FULL Session pooler URI from Connect,
  OR only the database password (script tries aws-0 and aws-1 poolers).
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

function Mask-DatabaseUrl([string]$url) {
  try {
    $normalized = $url.Trim() -replace '^postgresql://', 'postgres://'
    $u = [System.Uri]$normalized
    $user = [Uri]::UnescapeDataString(($u.UserInfo -split ':', 2)[0])
    $port = if ($u.Port -gt 0) { $u.Port } else { 5432 }
    $db = $u.AbsolutePath.TrimStart('/')
    if (-not $db) { $db = 'postgres' }
    return "postgres://${user}@$($u.Host):${port}/${db}"
  } catch {
    return '(URL inválida)'
  }
}

function Parse-PostgresUri([string]$raw) {
  if (-not $raw) { return $null }
  $s = $raw.Trim().Trim('"', "'")
  if ($s -match '^(?i)DATABASE_URL\s*=\s*(.+)$') { $s = $Matches[1].Trim().Trim('"', "'") }
  if ($s -match '^(?i)postgresql://') {
    $s = 'postgres://' + $s.Substring(13)
  } elseif ($s -notmatch '^(?i)postgres://') {
    if ($s -match '@') { $s = "postgres://$s" } else { return $null }
  }
  $uri = [System.Uri]$s
  $userInfo = $uri.UserInfo
  $colon = $userInfo.IndexOf(':')
  $user = if ($colon -ge 0) {
    [Uri]::UnescapeDataString($userInfo.Substring(0, $colon))
  } else {
    [Uri]::UnescapeDataString($userInfo)
  }
  $pass = if ($colon -ge 0) {
    [Uri]::UnescapeDataString($userInfo.Substring($colon + 1))
  } else { '' }
  $poolerHost = ($uri.Host -replace '\.supabase\.co$', '.supabase.com')
  $port = if ($uri.Port -gt 0) { $uri.Port } else { 6543 }
  $db = $uri.AbsolutePath.TrimStart('/')
  if (-not $db) { $db = 'postgres' }
  [PSCustomObject]@{
    User     = $user
    Password = $pass
    Host     = $poolerHost
    Port     = $port
    Database = $db
  }
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

function Build-DatabaseUrl([string]$password, [string]$hostName, [int]$port = 6543) {
  $enc = Encode-DbPassword $password
  "postgres://${ExpectedDbUser}:${enc}@${hostName}:${port}/postgres?sslmode=require"
}

function Build-DatabaseUrlFromParsed($parsed) {
  if ($parsed.User -ne $ExpectedDbUser) {
    Write-Host "Usuario URI '$($parsed.User)' != '$ExpectedDbUser' — corrigiendo al ref del proyecto." -ForegroundColor Yellow
  }
  $enc = Encode-DbPassword $parsed.Password
  "postgres://${ExpectedDbUser}:${enc}@$($parsed.Host):$($parsed.Port)/$($parsed.Database)?sslmode=require"
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
  Write-Host '  Si solo pegó contraseña, el script prueba aws-0 y aws-1 us-east-1.' -ForegroundColor DarkGray
}

function Test-Migrate([string]$url) {
  Write-Host "Probando: $(Mask-DatabaseUrl $url)" -ForegroundColor Cyan
  $env:DATABASE_URL = $url
  $env:NODE_ENV = 'production'
  Push-Location $ServerDir
  try {
    node -e "const dns=require('dns');const u=new URL(process.argv[1].replace(/^postgresql:/,'postgres:'));dns.lookup(u.hostname,(e)=>process.exit(e?1:0));" $url
    if ($LASTEXITCODE -ne 0) {
      Write-Host 'Host no resuelve en Node — omitiendo.' -ForegroundColor DarkYellow
      return $false
    }
    $output = npm run db:migrate:url 2>&1 | Out-String
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

function Try-MigrateWithHosts([string]$password, [string[]]$hostOrder) {
  foreach ($h in $hostOrder) {
    Write-Host "Pooler $h ..."
    if (-not (Test-PoolerDns $h)) { continue }
    $candidate = Build-DatabaseUrl $password $h
    if (Test-Migrate $candidate) {
      Write-Host "OK: $h" -ForegroundColor Green
      return $candidate
    }
    Write-Host "Falló migrate con $h" -ForegroundColor DarkYellow
  }
  return $null
}

function Read-ConnectionInput {
  Write-Host ''
  Write-Host 'Supabase → Settings → Database → Connect → Session pooler (URI, puerto 6543)' -ForegroundColor Cyan
  Write-Host '  1) Pegue la URI COMPLETA (recomendado — host exacto del panel)' -ForegroundColor Cyan
  Write-Host '  2) O solo la contraseña de base de datos (NO la del admin de la app)' -ForegroundColor Cyan
  Write-Host ''
  $input = Read-Host 'URI completa postgres://... o contraseña'
  if (-not $input) { throw 'Entrada vacía.' }
  return $input.Trim()
}

Repair-EnvPoolerHost

$workingUrl = $null
$preferredHosts = @()
$existingUrl = Get-ExistingDatabaseUrl

if ($existingUrl) {
  $existingParsed = Parse-PostgresUri $existingUrl
  if ($existingParsed -and $existingParsed.Host) {
    $preferredHosts += $existingParsed.Host
    Write-Host "server/.env: host $($existingParsed.Host) — $(Mask-DatabaseUrl $existingUrl)" -ForegroundColor DarkCyan
    if (Test-PoolerDns $existingParsed.Host) {
      Write-Host 'Probando DATABASE_URL existente en .env ...' -ForegroundColor Cyan
      $fixedExisting = if ($existingParsed.User -eq $ExpectedDbUser -and $existingParsed.Password) {
        ($existingUrl -replace '\.supabase\.co', '.supabase.com')
      } else {
        Build-DatabaseUrlFromParsed $existingParsed
      }
      if (Test-Migrate $fixedExisting) {
        $workingUrl = $fixedExisting
        Write-Host 'OK: conexión con .env existente.' -ForegroundColor Green
      }
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

  if ($parsed -and $parsed.Password) {
    $hostOrder = Get-PoolerHostOrder (@($parsed.Host) + $preferredHosts)
    Write-Host "URI detectada — host: $($parsed.Host), usuario: $($parsed.User)" -ForegroundColor Cyan
    if (Test-PoolerDns $parsed.Host) {
      $exactUrl = Build-DatabaseUrlFromParsed $parsed
      if (Test-Migrate $exactUrl) {
        $workingUrl = $exactUrl
        Write-Host "OK: URI del panel ($($parsed.Host))" -ForegroundColor Green
      }
    }
    if (-not $workingUrl) {
      Write-Host 'URI exacta falló — probando otros poolers ...' -ForegroundColor Yellow
      $workingUrl = Try-MigrateWithHosts $parsed.Password $hostOrder
    }
  } else {
    $hostOrder = Get-PoolerHostOrder $preferredHosts
    Write-Host "Solo contraseña — poolers: $($hostOrder -join ', ')" -ForegroundColor Cyan
    $workingUrl = Try-MigrateWithHosts $connInput $hostOrder
  }
}

if (-not $workingUrl) {
  Write-TenantErrorHint
  throw 'Migración falló. Copie la URI COMPLETA del Session pooler en Supabase Connect.'
}

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
