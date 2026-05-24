#Requires -Version 5.1
param(
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$AdminEmail = $(if ($env:BOOTSTRAP_ADMIN_EMAIL) { $env:BOOTSTRAP_ADMIN_EMAIL } else { 'edwinalvarezvivero@yahoo.com' }),
  [string]$AdminPassword = $env:BOOTSTRAP_ADMIN_PASSWORD,
  [string]$FlyApp = 'nexusdoc-dms',
  [switch]$Deploy,
  [switch]$SetFlySecrets
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ServerDir = Join-Path $RepoRoot 'server'

function Get-Flyctl {
  $cmd = Get-Command flyctl -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $default = Join-Path $env:USERPROFILE '.fly\bin\flyctl.exe'
  if (Test-Path $default) { return $default }
  throw 'flyctl no encontrado. Instale: https://fly.io/docs/flyctl/install/'
}

function Show-MaskedUrl([string]$Url) {
  if (-not $Url) { return '(vacio)' }
  return ($Url -replace '(:[^:@/]+)@', ':****@')
}

if (-not $DatabaseUrl) {
  Write-Host 'DATABASE_URL no definido. Supabase Session pooler puerto 5432.' -ForegroundColor Yellow
  exit 1
}

Write-Host ('DATABASE_URL: ' + (Show-MaskedUrl $DatabaseUrl))

if (-not $AdminPassword) {
  $bytes = New-Object byte[] 24
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $AdminPassword = ([Convert]::ToBase64String($bytes) -replace '[+/=]', '').Substring(0, 20)
  Write-Host 'Contrasena bootstrap generada (guardela):' -ForegroundColor Cyan
  Write-Host $AdminPassword
}

$env:DATABASE_URL = $DatabaseUrl
$env:NODE_ENV = 'production'
$env:BOOTSTRAP_ADMIN_EMAIL = $AdminEmail
$env:BOOTSTRAP_ADMIN_PASSWORD = $AdminPassword

Push-Location $ServerDir
try {
  npm run db:migrate; if ($LASTEXITCODE -ne 0) { throw 'db:migrate fallo' }
  npm run db:migrate:status; if ($LASTEXITCODE -ne 0) { throw 'db:migrate:status fallo' }
  npm run seed:admin; if ($LASTEXITCODE -ne 0) { throw 'seed:admin fallo' }
} finally { Pop-Location }

$fly = Get-Flyctl
if ($SetFlySecrets) {
  & $fly secrets set "DATABASE_URL=$DatabaseUrl" "BOOTSTRAP_ADMIN_EMAIL=$AdminEmail" "BOOTSTRAP_ADMIN_PASSWORD=$AdminPassword" -a $FlyApp
}
if ($Deploy) {
  Push-Location $RepoRoot
  try { & $fly deploy -a $FlyApp; if ($LASTEXITCODE -ne 0) { throw 'fly deploy fallo' } }
  finally { Pop-Location }
}

Write-Host "Login: https://$FlyApp.fly.dev/  email: $AdminEmail"
