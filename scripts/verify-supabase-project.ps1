#Requires -Version 5.1
<#
.SYNOPSIS
  Verifica conexión Supabase usando SOLO la URI pegada desde Connect (sin adivinar host/ref).
.DESCRIPTION
  1) Abre el dashboard del proyecto (ref opcional o extraído de la URI).
  2) Pide pegar la URI exacta del Session pooler (6543) con contraseña real.
  3) Prueba SELECT 1 con pg; si falla Session, prueba Transaction (?pgbouncer=true).
  4) Solo si SELECT 1 OK, ofrece ejecutar migraciones.
#>
param(
  [string]$ProjectRef,
  [switch]$SkipBrowser,
  [switch]$RunMigrate
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'supabase-uri-helpers.ps1')

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ServerDir = Join-Path $RepoRoot 'server'

if (-not $ProjectRef) {
  $ProjectRef = 'ohwqfujrakhwxfuxo'
}

if (-not $SkipBrowser) {
  Open-SupabaseDatabaseDashboard $ProjectRef
}

$raw = Read-ConnectUriFromUser
$parsed = Parse-PostgresUri $raw
if (-not $parsed -or $parsed.IsPasswordOnly) {
  throw 'Entrada no reconocida. Pegue la URI completa desde Connect (no solo la contraseña).'
}

Assert-UriHasPassword $parsed
[void](Repair-ParsedUriHost $parsed)

$refFromUri = Get-ProjectRefFromParsed $parsed
if ($refFromUri -and $refFromUri -ne $ProjectRef) {
  Write-Host "Ref en URI: $refFromUri (parámetro -ProjectRef era $ProjectRef) — usando ref de la URI." -ForegroundColor Yellow
  $ProjectRef = $refFromUri
} elseif ($refFromUri) {
  $ProjectRef = $refFromUri
}

$url = Build-PostgresUri $parsed
Write-Host ''
Write-Host "Proyecto ref: $ProjectRef | host: $($parsed.Host):$($parsed.Port) | usuario: $($parsed.User)" -ForegroundColor Cyan

$attempt = Test-UriWithSessionThenTransaction $url $ServerDir

if (-not $attempt.Url) {
  switch ($attempt.Result.Kind) {
    'bad_password' {
      Write-ResetPasswordHint
      throw 'Contraseña incorrecta. Reset en dashboard y pegue la URI de nuevo.'
    }
    'tenant' {
      Write-TenantNotFoundHint $ProjectRef
      Write-PausedProjectHint
      throw 'Tenant or user not found — corrija host/usuario/ref según Connect o reactive el proyecto.'
    }
    'dns' {
      Write-Host 'DNS no resuelve el host de la URI. Copie el host exacto desde Connect.' -ForegroundColor Red
      throw 'Host no encontrado.'
    }
    default {
      Write-PausedProjectHint
      throw "Conexión falló: $($attempt.Result.Message)"
    }
  }
}

$workingUrl = $attempt.Url
Write-Host ''
Write-Host "Conexión OK. URL de trabajo: $(Mask-DatabaseUrl $workingUrl)" -ForegroundColor Green

if ($RunMigrate) {
  $doMigrate = 'y'
} else {
  $doMigrate = Read-Host '¿Ejecutar migraciones ahora? (s/N)'
}

if ($doMigrate -match '^(s|y|si|sí)$') {
  $env:DATABASE_URL = $workingUrl
  $env:NODE_ENV = 'production'
  $env:SUPABASE_PROJECT_REF = $ProjectRef
  Push-Location $ServerDir
  try {
    node scripts/migrate-with-url.mjs
    if ($LASTEXITCODE -ne 0) { throw 'migrate-with-url.mjs falló' }
    Write-Host 'Migraciones OK.' -ForegroundColor Green
  } finally {
    Pop-Location
  }
} else {
  Write-Host 'Sin migraciones. Guarde esta URL en server/.env como DATABASE_URL=...' -ForegroundColor Cyan
}

Write-Host ''
Write-Host 'Siguiente: .\scripts\setup-supabase-once.ps1 (misma URI) para .env, admin y Fly.' -ForegroundColor DarkGray
