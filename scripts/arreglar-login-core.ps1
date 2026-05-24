#Requires -Version 5.1
# Solo lo invoca ARREGLAR-LOGIN.bat (no documentar por separado).
$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ServerDir = Join-Path $RepoRoot 'server'
$EnvFile = Join-Path $ServerDir '.env'
$AdminEmail = 'edwinalvarezvivero@yahoo.com'
$AdminPassword = 'U3m3O2CJz1wnZegcsTYt'
$FlyApp = 'nexusdoc-dms'
$ProjectRef = 'oxpohwcfujrakhwxfuxo'
$DefaultPoolerHost = 'aws-0-us-east-1.pooler.supabase.com'

. (Join-Path $PSScriptRoot 'supabase-uri-helpers.ps1')

function Get-Flyctl {
    $cmd = Get-Command flyctl -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $default = Join-Path $env:USERPROFILE '.fly\bin\flyctl.exe'
    if (Test-Path $default) { return $default }
    throw 'flyctl no está instalado. Instálelo: https://fly.io/docs/flyctl/install/'
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

function Read-SecureDatabasePassword {
    $secure = Read-Host 'Escriba solo la contraseña de base de datos (la que puso al crear el proyecto o al resetear)' -AsSecureString
    if (-not $secure -or $secure.Length -eq 0) { return '' }
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

function Apply-DatabasePasswordToUri([string]$rawUri, [string]$plainPassword) {
    $s = $rawUri.Trim()
    if ($s -match '\[YOUR-PASSWORD\]') {
        $enc = Encode-DbPassword $plainPassword
        $s = $s -replace '\[YOUR-PASSWORD\]', $enc
    }
    $parsed = Parse-PostgresUri $s
    if (-not $parsed -or $parsed.IsPasswordOnly) { return $null }

    if (Test-PlaceholderPassword $parsed.Password) {
        $parsed.Password = $plainPassword
    } elseif ([string]::IsNullOrWhiteSpace($parsed.Password)) {
        $parsed.Password = $plainPassword
    } else {
        $parsed.Password = $plainPassword
    }
    $parsed
}

function Resolve-PoolerHost($parsed) {
    if ($parsed.Host -match '(?i)pooler\.supabase\.com') {
        return ($parsed.Host -replace '\.supabase\.co$', '.supabase.com')
    }
    $DefaultPoolerHost
}

function Build-CanonicalConnectUrl($parsed) {
    $poolerHost = Resolve-PoolerHost $parsed
    $canonical = [PSCustomObject]@{
        IsPasswordOnly = $false
        User           = "postgres.$ProjectRef"
        Password       = $parsed.Password
        Host           = $poolerHost
        Port           = 5432
        Database       = 'postgres'
        Query          = '?sslmode=require'
    }
    Build-PostgresUri $canonical
}

function Write-ConnectionTestFailure([string]$output) {
    $kind = Classify-PostgresError $output
    switch ($kind) {
        'bad_password' {
            Fail @"
Contraseña de base de datos incorrecta.
Use la contraseña que definió al crear el proyecto o al resetearla desde Connect (no la del administrador de NexusDoc).
Vuelva a ejecutar ARREGLAR-LOGIN.bat.
Detalle: $output
"@
        }
        'tenant' {
            Fail @"
El pooler no reconoció el usuario o el proyecto.
Pegue la URI exacta de Connect → Session pooler (puerto 5432). Compruebe que el proyecto no está pausado y que inició sesión en la cuenta correcta de Supabase.
Detalle: $output
"@
        }
        'dns' {
            Fail @"
No se pudo resolver el host del pooler. Copie la URI completa desde Connect sin cambiar el host.
Detalle: $output
"@
        }
        default {
            Fail @"
No se pudo conectar a PostgreSQL antes de migrar.
Revise la URI de Connect y la contraseña de base de datos, luego vuelva a ejecutar ARREGLAR-LOGIN.bat.
Detalle: $output
"@
        }
    }
}

Write-Host ''
Write-Host 'Copie en Supabase la ventana Connect que ya tiene abierta. Pulse Enter.' -ForegroundColor Cyan
$null = Read-Host

$connectUri = (Read-Host 'Pegue aqui la URI de Connect (puede traer [YOUR-PASSWORD], no importa)').Trim()
if (-not $connectUri) { Fail 'No pegó ninguna URI.' }
if ($connectUri -match '^(?i)DATABASE_URL\s*=\s*(.+)$') {
    $connectUri = $Matches[1].Trim().Trim('"', "'")
}

$dbPassword = Read-SecureDatabasePassword
if ([string]::IsNullOrWhiteSpace($dbPassword)) { Fail 'No escribió la contraseña de base de datos.' }

$parsed = Apply-DatabasePasswordToUri $connectUri $dbPassword
if (-not $parsed) {
    Fail 'No reconocimos una URI de Connect. Copie la línea postgres:// completa desde Session pooler (puerto 5432).'
}

$dbUrl = Build-CanonicalConnectUrl $parsed
Write-Host "URI canónica: $(Mask-DatabaseUrl $dbUrl)" -ForegroundColor Cyan

Write-Host 'Probando conexión a la base de datos...' -ForegroundColor Yellow
$pgTest = Test-PostgresSelect1 $dbUrl $ServerDir
if ($pgTest.ExitCode -ne 0) {
    Write-ConnectionTestFailure $pgTest.Output
}

Write-Host 'Conexión OK.' -ForegroundColor Green

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
        $hint = 'Revise la contraseña de base de datos y la URI de Connect (Session pooler 5432).'
        if ($dbUrl -match 'Tenant|tenant') {
            $hint = 'Proyecto Supabase pausado o cuenta equivocada. Restaure el proyecto en el panel y vuelva a ejecutar el script.'
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
        Fail 'No se pudo crear el administrador. Vuelva a ejecutar ARREGLAR-LOGIN.bat.'
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
