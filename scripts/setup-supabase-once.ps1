#Requires -Version 5.1
<#
.SYNOPSIS
  Configura Supabase (Session pooler aws-0:6543), migra, seed admin, Fly secrets y deploy.
#>
param(
  [string]$ProjectRef = 'ohwqfujrakhwxfuxo',
  [string]$PoolerHost = 'aws-0-us-east-1.pooler.supabase.com',
  [int]$PoolerPort = 6543,
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
$DbUser = "postgres.$ProjectRef"

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

function Build-CanonicalDatabaseUrl([string]$password) {
  if ([string]::IsNullOrWhiteSpace($password)) { throw 'Contraseña vacía.' }
  $enc = Encode-DbPassword $password.Trim()
  "postgres://${DbUser}:${enc}@${PoolerHost}:${PoolerPort}/postgres?sslmode=require&uselibpqcompat=true"
}

function Mask-DatabaseUrl([string]$url) {
  if (-not $url) { return '(vacío)' }
  if ($url -match '^(?i)postgres(ql)?://([^:@]+):([^@]*)@([^/?#]+)') {
    return "postgres://$($Matches[2]):***@$($Matches[4])"
  }
  return '(URL inválida)'
}

function Read-DatabasePassword {
  $existing = $null
  if (Test-Path $EnvFile) {
    foreach ($line in Get-Content $EnvFile) {
      if ($line -match '^\s*DATABASE_URL\s*=\s*(.+)\s*$') {
        $existing = $Matches[1].Trim().Trim('"', "'")
        break
      }
    }
  }
  if ($existing -and $existing -match ':(?:[^@]+)@') {
    Write-Host "Usando contraseña de server/.env existente ($(Mask-DatabaseUrl $existing))" -ForegroundColor Cyan
    $uri = $existing -replace '^(?i)postgresql://', 'postgres://'
    $userinfo = ($uri -replace '^[^:]+://', '').Split('@')[0]
    $pass = if ($userinfo -match ':') { [Uri]::UnescapeDataString(($userinfo -split ':', 2)[1]) } else { '' }
    if ($pass -and $pass -notmatch 'YOUR-PASSWORD') { return $pass }
  }

  if (-not $SkipBrowser) {
    Start-Process "https://supabase.com/dashboard/project/$ProjectRef/settings/database"
  }
  Write-Host 'Supabase -> Settings -> Database -> contraseña de BASE DE DATOS (no admin app)' -ForegroundColor Cyan
  $pw = Read-Host 'Contraseña'
  if (-not $pw) { throw 'Contraseña vacía.' }
  $pw.Trim()
}

function Invoke-Migrate([string]$databaseUrl) {
  $env:DATABASE_URL = $databaseUrl
  $env:SUPABASE_PROJECT_REF = $ProjectRef
  $env:NODE_ENV = 'development'
  Push-Location $ServerDir
  try {
    npm run db:migrate:url
    if ($LASTEXITCODE -ne 0) { throw 'db:migrate:url falló' }
  } finally { Pop-Location }
}

$dbPassword = Read-DatabasePassword
$appUrl = Build-CanonicalDatabaseUrl $dbPassword
Write-Host "URL canónica: $(Mask-DatabaseUrl $appUrl)" -ForegroundColor Green

Invoke-Migrate $appUrl

$jwt = $env:JWT_SECRET
if (-not $jwt) { $jwt = -join ((48..57 + 65..90 + 97..122 | Get-Random -Count 48 | ForEach-Object { [char]$_ })) }

$envLines = @(
  'NODE_ENV=development',
  "JWT_SECRET=$jwt",
  "DATABASE_URL=$appUrl",
  "SUPABASE_PROJECT_REF=$ProjectRef",
  'CORS_ORIGINS=https://nexusdoc-dms.fly.dev,http://localhost:5173',
  'DB_SYNC_ALTER=false',
  "BOOTSTRAP_ADMIN_EMAIL=$AdminEmail",
  "BOOTSTRAP_ADMIN_PASSWORD=$AdminPassword",
  'BOOTSTRAP_ADMIN_NAME=Administrador Maestro'
)
Set-Content -Path $EnvFile -Value ($envLines -join "`n") -Encoding UTF8
Write-Host "Escrito $EnvFile" -ForegroundColor Cyan

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

& $fly secrets deploy -a $FlyApp
if ($LASTEXITCODE -ne 0) { throw 'fly secrets deploy falló' }

if (-not $SkipDeploy) {
  Push-Location $RepoRoot
  try {
    & $fly deploy -a $FlyApp
    if ($LASTEXITCODE -ne 0) { throw 'fly deploy falló' }
  } finally { Pop-Location }
}

Write-Host ''
Write-Host "Listo. Login: https://$FlyApp.fly.dev/  |  $AdminEmail" -ForegroundColor Green
