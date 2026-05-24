#Requires -Version 5.1
# Solo lo invoca ARREGLAR-LOGIN.bat (no documentar por separado).
param([switch]$WhatIf)

$ErrorActionPreference = 'Stop'

try { chcp 65001 | Out-Null } catch { }
$utf8 = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = $utf8
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ServerDir = Join-Path $RepoRoot 'server'
$EnvFile = Join-Path $ServerDir '.env'
$AdminEmail = 'edwinalvarezvivero@yahoo.com'
$AdminPassword = 'U3m3O2CJz1wnZegcsTYt'
$FlyApp = 'nexusdoc-dms'
$ProjectRef = 'oxpohwcfujrakhwxfuxo'
$DefaultPoolerHost = 'aws-0-us-east-1.pooler.supabase.com'

. (Join-Path $PSScriptRoot 'supabase-uri-helpers.ps1')

if ($WhatIf) {
    Write-Host ''
    Write-Host '[WhatIf] Script cargado correctamente. No se ejecutan migracion ni deploy.' -ForegroundColor Green
    Write-Host "RepoRoot: $RepoRoot"
    Write-Host "EnvFile: $EnvFile"
    Write-Host 'Para ejecutar con prompts: powershell -NoExit -ExecutionPolicy Bypass -File scripts\arreglar-login-core.ps1'
    exit 0
}

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
    param([string]$Prompt = 'Escriba solo la contraseña de base de datos (la que puso al crear el proyecto o al resetear)')
    $secure = Read-Host $Prompt -AsSecureString
    if (-not $secure -or $secure.Length -eq 0) { return '' }
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

function Normalize-Aws0PoolerHost([string]$hostName) {
    $h = ($hostName -replace '\.supabase\.co$', '.supabase.com')
    if ($h -match '(?i)aws-1-') {
        Write-Host 'Aviso: este script usa aws-0-us-east-1 (no aws-1). Corrija el host en Connect si el panel muestra aws-1.' -ForegroundColor Yellow
        $h = $h -replace '(?i)aws-1-', 'aws-0-'
    }
    if ($h -notmatch '(?i)aws-0-us-east-1\.pooler\.supabase\.com') {
        return $DefaultPoolerHost
    }
    $h
}

function Get-PoolerUser($parsed) {
    if ($parsed.User -match '^postgres\.([a-z0-9]+)$') { return $parsed.User }
    "postgres.$ProjectRef"
}

function New-Aws0PoolerVariant($parsed, [int]$port) {
    $qs = if ($port -eq 6543) { '?pgbouncer=true&sslmode=require' } else { '?sslmode=require' }
    [PSCustomObject]@{
        IsPasswordOnly = $false
        User           = Get-PoolerUser $parsed
        Password       = $parsed.Password
        Host           = Normalize-Aws0PoolerHost $parsed.Host
        Port           = $port
        Database       = if ($parsed.Database) { $parsed.Database } else { 'postgres' }
        Query          = $qs
    }
}

function Test-DatabaseOnAws0Ports($parsed, [string]$serverDir) {
    $lastOutput = ''
    $lastKind = 'other'
    foreach ($port in @(5432, 6543)) {
        $label = if ($port -eq 5432) { 'Session pooler aws-0:5432' } else { 'Transaction pooler aws-0:6543' }
        $variant = New-Aws0PoolerVariant $parsed $port
        $url = Build-PostgresUri $variant
        Write-Host "Probando $label ..." -ForegroundColor Cyan
        Write-Host "  $(Mask-DatabaseUrl $url)" -ForegroundColor DarkGray
        $pgTest = Test-PostgresSelect1 $url $serverDir
        if ($pgTest.ExitCode -eq 0) {
            return [PSCustomObject]@{ Ok = $true; Url = $url; Parsed = $variant; Output = $pgTest.Output }
        }
        $lastOutput = $pgTest.Output
        $lastKind = Classify-PostgresError $pgTest.Output
        Write-Host "Falló ($label): $lastOutput" -ForegroundColor Red
    }
    [PSCustomObject]@{ Ok = $false; Url = $null; Parsed = $null; Output = $lastOutput; Kind = $lastKind }
}

function Write-PausedProjectHint {
    Write-Host ''
    Write-Host 'Si el proyecto está PAUSADO (plan gratuito inactivo), restáurelo en el panel y espere 1-2 minutos:' -ForegroundColor Yellow
    Write-Host "  https://supabase.com/dashboard/project/$ProjectRef" -ForegroundColor Cyan
}

function Invoke-DatabasePasswordRecovery($parsed) {
    Write-Host ''
    Write-Host 'La contraseña de Database en Supabase NO coincide. Debe hacer Reset database password.' -ForegroundColor Red
    Write-PausedProjectHint
    $dbUrl = "https://supabase.com/dashboard/project/$ProjectRef/settings/database"
    Write-Host "Abriendo: $dbUrl" -ForegroundColor Cyan
    Start-Process $dbUrl
    Write-Host ''
    Write-Host 'En el panel: Database -> Reset database password. Luego pulse Enter aqui.' -ForegroundColor Cyan
    $null = Read-Host
    $newPassword = Read-SecureDatabasePassword -Prompt 'Escriba SOLO la contraseña NUEVA (tras Reset database password)'
    if ([string]::IsNullOrWhiteSpace($newPassword)) { Fail 'No escribió la contraseña nueva.' }
    $parsed.Password = $newPassword
    $parsed
}

function Invoke-ConnectionFailureRecovery($parsed, [string]$serverDir, [string]$lastKind) {
    if ($lastKind -eq 'tenant') {
        Write-Host ''
        Write-Host 'El pooler respondió "Tenant or user not found". Suele ser contraseña incorrecta o proyecto pausado.' -ForegroundColor Yellow
    }
    $parsed = Invoke-DatabasePasswordRecovery $parsed
    $retry = Test-DatabaseOnAws0Ports $parsed $serverDir
    if (-not $retry.Ok) {
        Write-ConnectionTestFailure $retry.Output $retry.Kind
    }
    $retry
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
    if ($parsed.Host -match '(?i)pooler\.supabase') {
        return (Normalize-Aws0PoolerHost $parsed.Host)
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

function Write-ConnectionTestFailure([string]$output, [string]$kind = $null) {
    if (-not $kind) { $kind = Classify-PostgresError $output }
    switch ($kind) {
        'bad_password' {
            Fail @"
La contraseña de Database sigue sin coincidir tras el reintento.
Reset database password en Supabase, copie la NUEVA contraseña y vuelva a ejecutar ARREGLAR-LOGIN.bat (pegue solo la contraseña si lo prefiere).
Detalle: $output
"@
        }
        'tenant' {
            Write-PausedProjectHint
            Fail @"
El pooler no reconoció el usuario o el proyecto (Tenant or user not found).
Compruebe que el proyecto NO está pausado, que la contraseña es la NUEVA tras Reset, y que usa aws-0-us-east-1 (no aws-1).
Detalle: $output
"@
        }
        'dns' {
            Fail @"
No se pudo resolver el host del pooler. Use aws-0-us-east-1.pooler.supabase.com desde Connect.
Detalle: $output
"@
        }
        default {
            Fail @"
No se pudo conectar a PostgreSQL (puertos 5432 y 6543 en aws-0).
Revise contraseña y que el proyecto no esté pausado, luego vuelva a ejecutar ARREGLAR-LOGIN.bat.
Detalle: $output
"@
        }
    }
}

Write-Host ''
Write-Host 'Copie en Supabase la ventana Connect que ya tiene abierta. Pulse Enter.' -ForegroundColor Cyan
$null = Read-Host

$firstPaste = (Read-Host 'Pegue aqui la URI de Connect (puede traer [YOUR-PASSWORD], no importa)').Trim()
if (-not $firstPaste) { Fail 'No pegó ninguna URI ni contraseña.' }

if ($firstPaste -match '^(?i)postgres(ql)?://') {
    $connectUri = $firstPaste
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
} else {
    Write-Host 'Detectamos solo la contraseña. Usaremos la URL de su proyecto automaticamente.' -ForegroundColor Yellow
    $dbPassword = $firstPaste
    $parsed = [PSCustomObject]@{
        IsPasswordOnly = $false
        User           = "postgres.$ProjectRef"
        Password       = $dbPassword
        Host           = $DefaultPoolerHost
        Port           = 5432
        Database       = 'postgres'
        Query          = '?sslmode=require'
    }
    $dbUrl = Build-PostgresUri $parsed
}
Write-Host "URI canónica: $(Mask-DatabaseUrl $dbUrl)" -ForegroundColor Cyan

Write-Host 'Probando conexión a la base de datos (aws-0, puertos 5432 y 6543)...' -ForegroundColor Yellow
$conn = Test-DatabaseOnAws0Ports $parsed $ServerDir
if (-not $conn.Ok) {
    $recoverable = @('bad_password', 'tenant', 'other') -contains $conn.Kind
    if ($recoverable) {
        $conn = Invoke-ConnectionFailureRecovery $parsed $ServerDir $conn.Kind
    } else {
        Write-ConnectionTestFailure $conn.Output $conn.Kind
    }
}
$dbUrl = $conn.Url
$parsed = $conn.Parsed
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
