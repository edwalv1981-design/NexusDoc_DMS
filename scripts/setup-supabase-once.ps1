#Requires -Version 5.1
<#
.SYNOPSIS
  Configura Supabase una vez: URI de Connect → .env → migrate → admin → Fly secrets → deploy.
.DESCRIPTION
  NO construye URLs desde un ref fijo. Solo usa la URI que usted pega desde Supabase Connect
  (Session pooler 6543), con [YOUR-PASSWORD] ya sustituido.
  Si Session falla, prueba Transaction pooler (?pgbouncer=true) en la misma URI.
#>
param(
  [string]$ProjectRef,
  [string]$AdminEmail = 'edwinalvarezvivero@yahoo.com',
  [string]$AdminPassword = 'U3m3O2CJz1wnZegcsTYt',
  [string]$FlyApp = 'nexusdoc-dms',
  [switch]$SkipBrowser,
  [switch]$SkipDeploy
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'supabase-uri-helpers.ps1')

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

function Repair-EnvPoolerHost {
  if (-not (Test-Path $EnvFile)) { return }
  $content = Get-Content $EnvFile -Raw
  if ($content -notmatch 'pooler\.supabase\.co') { return }
  $fixed = $content -replace 'pooler\.supabase\.co', 'pooler.supabase.com'
  Set-Content -Path $EnvFile -Value $fixed.TrimEnd() -Encoding UTF8
  Write-Host "Corregido pooler .supabase.co -> .supabase.com en $EnvFile" -ForegroundColor Yellow
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

function Test-Migrate([string]$url) {
  Write-Host "Migrando: $(Mask-DatabaseUrl $url)" -ForegroundColor Cyan
  $env:DATABASE_URL = $url
  $env:NODE_ENV = 'production'
  if ($script:ProjectRef) { $env:SUPABASE_PROJECT_REF = $script:ProjectRef }
  Push-Location $ServerDir
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    node scripts/migrate-with-url.mjs 2>&1 | ForEach-Object { Write-Host $_ }
    return ($LASTEXITCODE -eq 0)
  } finally {
    $ErrorActionPreference = $prev
    Pop-Location
  }
}

Repair-EnvPoolerHost

$workingUrl = $null
$existingUrl = Get-ExistingDatabaseUrl

if ($existingUrl) {
  $existingParsed = Parse-PostgresUri $existingUrl
  if ($existingParsed -and -not $existingParsed.IsPasswordOnly) {
    try {
      Assert-UriHasPassword $existingParsed
      [void](Repair-ParsedUriHost $existingParsed)
      $script:ProjectRef = Get-ProjectRefFromParsed $existingParsed
      if (-not $ProjectRef) { $ProjectRef = $script:ProjectRef }
      $candidate = Build-PostgresUri $existingParsed
      Write-Host "Probando server/.env existente ..." -ForegroundColor Cyan
      $attempt = Test-UriWithSessionThenTransaction $candidate $ServerDir
      if ($attempt.Url) {
        $workingUrl = $attempt.Url
        Write-Host 'server/.env: SELECT 1 OK.' -ForegroundColor Green
      }
    } catch {
      Write-Host $_.Exception.Message -ForegroundColor Yellow
    }
  }
}

if (-not $workingUrl) {
  if (-not $SkipBrowser) {
    Open-SupabaseDatabaseDashboard $(if ($ProjectRef) { $ProjectRef } else { 'ohwqfujrakhwxfuxo' })
  }

  $raw = Read-ConnectUriFromUser
  $parsed = Parse-PostgresUri $raw
  if (-not $parsed -or $parsed.IsPasswordOnly) {
    throw 'Pegue la URI completa desde Connect (Session pooler 6543), no solo la contraseña.'
  }

  Assert-UriHasPassword $parsed
  [void](Repair-ParsedUriHost $parsed)

  $script:ProjectRef = Get-ProjectRefFromParsed $parsed
  if ($ProjectRef -and $script:ProjectRef -and $ProjectRef -ne $script:ProjectRef) {
    Write-Host "Ref URI ($script:ProjectRef) difiere de -ProjectRef ($ProjectRef); usando ref de la URI." -ForegroundColor Yellow
  }
  if ($script:ProjectRef) { $ProjectRef = $script:ProjectRef }

  $url = Build-PostgresUri $parsed
  $attempt = Test-UriWithSessionThenTransaction $url $ServerDir

  if (-not $attempt.Url) {
    switch ($attempt.Result.Kind) {
      'bad_password' {
        Write-ResetPasswordHint
        throw 'Contraseña incorrecta. Reset database password en Supabase y pegue la URI de nuevo.'
      }
      'tenant' {
        Write-TenantNotFoundHint $ProjectRef
        Write-PausedProjectHint
        throw 'Tenant or user not found — use la URI exacta de Connect o reactive el proyecto pausado.'
      }
      default {
        Write-PausedProjectHint
        throw "No se pudo conectar: $($attempt.Result.Message)"
      }
    }
  }

  $workingUrl = $attempt.Url
}

if (-not (Test-Migrate $workingUrl)) {
  throw 'Migración falló tras conexión SELECT 1. Revise logs arriba.'
}

$jwt = $env:JWT_SECRET
if (-not $jwt) {
  $jwt = -join ((48..57 + 65..90 + 97..122 | Get-Random -Count 48 | ForEach-Object { [char]$_ }))
}

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
Write-Host "Escrito $EnvFile — $(Mask-DatabaseUrl $workingUrl)" -ForegroundColor Green

$env:DATABASE_URL = $workingUrl
$env:BOOTSTRAP_ADMIN_EMAIL = $AdminEmail
$env:BOOTSTRAP_ADMIN_PASSWORD = $AdminPassword
$env:NODE_ENV = 'production'
Push-Location $ServerDir
try {
  npm run seed:admin
  if ($LASTEXITCODE -ne 0) { throw 'seed:admin falló' }
} finally {
  Pop-Location
}

$fly = Get-Flyctl
Push-Location $RepoRoot
try {
  & $fly secrets set `
    "DATABASE_URL=$workingUrl" `
    "JWT_SECRET=$jwt" `
    "BOOTSTRAP_ADMIN_EMAIL=$AdminEmail" `
    "BOOTSTRAP_ADMIN_PASSWORD=$AdminPassword" `
    "CORS_ORIGINS=https://nexusdoc-dms.fly.dev" `
    -a $FlyApp
  if ($LASTEXITCODE -ne 0) { throw 'fly secrets set falló' }
} finally {
  Pop-Location
}

Write-Host ''
Write-Host 'Fly secrets DATABASE_URL = misma URI verificada (Session o Transaction).' -ForegroundColor Cyan
Write-Host "  $(Mask-DatabaseUrl $workingUrl)" -ForegroundColor DarkGray

if (-not $SkipDeploy) {
  Push-Location $RepoRoot
  try {
    & $fly deploy -a $FlyApp
    if ($LASTEXITCODE -ne 0) { throw 'fly deploy falló' }
  } finally {
    Pop-Location
  }
}

Write-Host ''
Write-Host "Listo. Login: https://$FlyApp.fly.dev/  |  $AdminEmail" -ForegroundColor Green
