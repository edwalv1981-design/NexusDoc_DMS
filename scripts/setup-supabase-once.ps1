#Requires -Version 5.1
<#
.SYNOPSIS
  One-time Supabase DB password -> local .env, migrate, seed admin, Fly secrets, deploy.
.DESCRIPTION
  Opens Supabase database settings. You paste the database password ONCE (not the app admin password).
  Project ref: ohwqfujrakhwxfuxo (Session pooler :6543).
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

function Build-DatabaseUrl([string]$password, [string]$hostName) {
  $enc = Encode-DbPassword $password
  "postgres://postgres.${ProjectRef}:${enc}@${hostName}:6543/postgres?sslmode=require"
}

function Test-PoolerDns([string]$hostName) {
  try {
    $null = [System.Net.Dns]::GetHostEntry($hostName)
    return $true
  } catch {
    Write-Host "DNS falló para $hostName : $($_.Exception.Message)" -ForegroundColor DarkYellow
    return $false
  }
}

function Test-Migrate([string]$url) {
  $env:DATABASE_URL = $url
  $env:NODE_ENV = 'production'
  Push-Location $ServerDir
  try {
    node -e "const dns=require('dns');const u=new URL(process.argv[1].replace(/^postgresql:/,'postgres:'));dns.lookup(u.hostname,(e)=>process.exit(e?1:0));" $url
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Host no resuelve en Node — omitiendo migrate." -ForegroundColor DarkYellow
      return $false
    }
    npm run db:migrate:url 2>&1 | Out-Host
    return ($LASTEXITCODE -eq 0)
  } finally { Pop-Location }
}

function Read-DbPasswordOnce {
  Write-Host ''
  Write-Host 'Pegue la contraseña de base de datos de Supabase (Database password).' -ForegroundColor Cyan
  Write-Host 'No es la contraseña del admin de la app. Panel: Settings -> Database -> Reset database password.' -ForegroundColor Yellow
  $sec = Read-Host 'Contraseña Supabase' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

if (-not $SkipBrowser) {
  $dash = "https://supabase.com/dashboard/project/$ProjectRef/settings/database"
  Write-Host "Abriendo: $dash"
  Start-Process $dash
}

$dbPass = Read-DbPasswordOnce
if (-not $dbPass) { throw 'Contraseña vacía.' }

$workingUrl = $null
foreach ($h in $PoolerHosts) {
  Write-Host "Probando pooler $h ..."
  if (-not (Test-PoolerDns $h)) { continue }
  $candidate = Build-DatabaseUrl $dbPass $h
  if (Test-Migrate $candidate) {
    $workingUrl = $candidate
    Write-Host "OK: pooler $h" -ForegroundColor Green
    break
  }
  Write-Host "Falló migrate con $h" -ForegroundColor DarkYellow
}
if (-not $workingUrl) {
  throw 'Migración falló en todos los poolers. Verifique contraseña y región en el panel Supabase (Session pooler URI).'
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
Write-Host "Escrito $EnvFile"

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

if (-not $SkipDeploy) {
  Push-Location $RepoRoot
  try {
    & $fly deploy -a $FlyApp
    if ($LASTEXITCODE -ne 0) { throw 'fly deploy falló' }
  } finally { Pop-Location }
}

Write-Host ''
Write-Host "Listo. Login: https://$FlyApp.fly.dev/  |  $AdminEmail" -ForegroundColor Green
