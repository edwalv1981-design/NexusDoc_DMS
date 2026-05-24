#Requires -Version 5.1
# Solo lo invoca ARREGLAR-LOGIN.bat (no documentar por separado).
$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ServerDir = Join-Path $RepoRoot 'server'
$EnvFile = Join-Path $ServerDir '.env'
$AdminEmail = 'edwinalvarezvivero@yahoo.com'
$AdminPassword = 'U3m3O2CJz1wnZegcsTYt'
$FlyApp = 'nexusdoc-dms'
$ProjectRef = 'ohwqfujrakhwxfuxo'

function Get-Flyctl {
    $cmd = Get-Command flyctl -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $default = Join-Path $env:USERPROFILE '.fly\bin\flyctl.exe'
    if (Test-Path $default) { return $default }
    throw 'flyctl no está instalado. Instálelo: https://fly.io/docs/flyctl/install/'
}

function Mask-Url([string]$url) {
    if (-not $url) { return '(vacío)' }
    if ($url -match '^(?i)postgres(ql)?://([^:@]+):([^@]*)@([^/?#]+)') {
        return "postgres://$($Matches[2]):***@$($Matches[4])"
    }
    return '(URL no reconocida)'
}

function Read-ExistingJwt {
    if (-not (Test-Path $EnvFile)) { return $null }
    foreach ($line in Get-Content $EnvFile -ErrorAction SilentlyContinue) {
        if ($line -match '^\s*JWT_SECRET\s*=\s*(.+)\s*$') {
            return $Matches[1].Trim().Trim('"', "'")
        }
    }
    return $null
}

function Fail([string]$msg) {
    Write-Host ''
    Write-Host "[ERROR] $msg" -ForegroundColor Red
    exit 1
}

Write-Host ''
$dbUrl = (Read-Host 'DATABASE_URL').Trim()
if (-not $dbUrl) { Fail 'No pegó ninguna URI.' }
if ($dbUrl -match '^(?i)DATABASE_URL\s*=\s*(.+)$') { $dbUrl = $Matches[1].Trim().Trim('"', "'") }
$dbUrl = $dbUrl -replace '^(?i)postgresql://', 'postgres://'
if ($dbUrl -match '\[YOUR-PASSWORD\]') {
    Fail 'La URI aún contiene [YOUR-PASSWORD]. Sustitúyalo por la contraseña real de la base de datos.'
}
if ($dbUrl -notmatch '^(?i)postgres://') {
    Fail 'La URI debe empezar por postgres:// (cópiela desde Connect → Session pooler, puerto 6543).'
}

Write-Host "URI detectada: $(Mask-Url $dbUrl)" -ForegroundColor Cyan

$jwt = Read-ExistingJwt
if (-not $jwt) {
    $jwt = -join ((48..57 + 65..90 + 97..122 | Get-Random -Count 48 | ForEach-Object { [char]$_ }))
}

$envLines = @(
    'NODE_ENV=development',
    "JWT_SECRET=$jwt",
    "DATABASE_URL=$dbUrl",
    "SUPABASE_PROJECT_REF=$ProjectRef",
    'CORS_ORIGINS=https://nexusdoc-dms.fly.dev,http://localhost:5173',
    'DB_SYNC_ALTER=false',
    "BOOTSTRAP_ADMIN_EMAIL=$AdminEmail",
    "BOOTSTRAP_ADMIN_PASSWORD=$AdminPassword",
    'BOOTSTRAP_ADMIN_NAME=Administrador Maestro'
)
Set-Content -Path $EnvFile -Value ($envLines -join "`n") -Encoding UTF8
Write-Host "Guardado: server\.env" -ForegroundColor Green

Write-Host 'Migrando base de datos...' -ForegroundColor Yellow
$env:DATABASE_URL = $dbUrl
$env:NODE_ENV = 'development'
Push-Location $ServerDir
try {
    npm run db:migrate:url 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) {
        $hint = 'Revise la URI (Session pooler 6543) y la contraseña.'
        if ($dbUrl -match 'Tenant|tenant') {
            $hint = 'Si la URI es la de Connect con contraseña correcta: proyecto Supabase pausado o cuenta equivocada. Restaure el proyecto en el panel.'
        }
        Fail "Migración falló. $hint"
    }
} finally {
    Pop-Location
}

Write-Host 'Creando administrador...' -ForegroundColor Yellow
$env:DATABASE_URL = $dbUrl
$env:BOOTSTRAP_ADMIN_EMAIL = $AdminEmail
$env:BOOTSTRAP_ADMIN_PASSWORD = $AdminPassword
$env:NODE_ENV = 'production'
Push-Location $ServerDir
try {
    npm run seed:admin 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Fail 'No se pudo crear el administrador. Revise la URI y vuelva a ejecutar ARREGLAR-LOGIN.bat.'
    }
} finally {
    Pop-Location
}

Write-Host 'Configurando Fly.io...' -ForegroundColor Yellow
$fly = Get-Flyctl
& $fly secrets set "DATABASE_URL=$dbUrl" -a $FlyApp
if ($LASTEXITCODE -ne 0) { Fail 'fly secrets set falló. ¿Está autenticado? Ejecute: fly auth login' }

Push-Location $RepoRoot
try {
    Write-Host 'Desplegando en Fly.io (puede tardar varios minutos)...' -ForegroundColor Yellow
    & $fly deploy -a $FlyApp
    if ($LASTEXITCODE -ne 0) { Fail 'fly deploy falló.' }
} finally {
    Pop-Location
}

Write-Host ''
Write-Host '[LISTO] Puede iniciar sesión en https://nexusdoc-dms.fly.dev/dashboard' -ForegroundColor Green
Write-Host "Email: $AdminEmail" -ForegroundColor Green
Write-Host "Contraseña: $AdminPassword" -ForegroundColor Green
exit 0
