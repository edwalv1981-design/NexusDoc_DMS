#Requires -Version 5.1
# Shared Supabase URI parsing and pg connectivity tests (dot-source from other scripts).

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

  $port = 5432
  $hostName = $hostPort
  $lastColon = $hostPort.LastIndexOf(':')
  if ($lastColon -gt 0) {
    $maybePort = $hostPort.Substring($lastColon + 1)
    if ($maybePort -match '^\d+$') {
      $port = [int]$maybePort
      $hostName = $hostPort.Substring(0, $lastColon)
    }
  }
  $hostName = ($hostName -replace '\.supabase\.co$', '.supabase.com')

  [PSCustomObject]@{
    IsPasswordOnly = $false
    User           = $user
    Password       = $pass
    Host           = $hostName
    Port           = $port
    Database       = $db
    Query          = $query
  }
}

function Get-ProjectRefFromParsed($parsed) {
  if (-not $parsed -or $parsed.IsPasswordOnly) { return $null }
  if ($parsed.User -match '^postgres\.([a-z0-9]+)$') { return $Matches[1] }
  if ($parsed.Host -match '^db\.([a-z0-9]+)\.supabase\.co$') { return $Matches[1] }
  return $null
}

function Build-PostgresUri($parsed) {
  if ($parsed.IsPasswordOnly) { throw 'Se requiere URI completa, no solo contraseña.' }
  $enc = Encode-DbPassword $parsed.Password
  $qs = $parsed.Query
  if (-not $qs) { $qs = '?sslmode=require' }
  elseif ($qs -notmatch '^\?') { $qs = "?$qs" }
  if ($qs -notmatch 'sslmode=') {
    $qs = if ($qs -eq '?' -or -not $qs) { '?sslmode=require' } else { "$qs&sslmode=require" }
  }
  if ($qs -match 'sslmode=' -and $qs -notmatch 'uselibpqcompat=') {
    $qs = if ($qs -eq '?') { '?sslmode=require&uselibpqcompat=true' } else { "$qs&uselibpqcompat=true" }
  }
  "postgres://$($parsed.User):${enc}@$($parsed.Host):$($parsed.Port)/$($parsed.Database)$qs"
}

function Repair-ParsedUriHost($parsed) {
  $parsed.Host = ($parsed.Host -replace '\.supabase\.co$', '.supabase.com')
  $parsed
}

function Add-PgbouncerQuery([string]$url) {
  if ($url -match '[?&]pgbouncer=true') { return $url }
  if ($url -match '\?') { return "$url&pgbouncer=true" }
  return "$url?pgbouncer=true"
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

function Assert-UriHasPassword($parsed) {
  if (-not $parsed -or $parsed.IsPasswordOnly) {
    throw 'Pegue la URI completa de Supabase Connect (Session pooler, puerto 6543), con [YOUR-PASSWORD] sustituido por su contraseña real.'
  }
  if (Test-PlaceholderPassword $parsed.Password) {
    throw 'La URI aún tiene [YOUR-PASSWORD]. En Connect copie la cadena y reemplace ese texto por la contraseña de Database (o resetéela en el dashboard).'
  }
}

function Write-ResetPasswordHint {
  Write-Host ''
  Write-Host 'La contraseña en la URI no es válida para este proyecto.' -ForegroundColor Red
  Write-Host '  Supabase → Project Settings → Database → Reset database password' -ForegroundColor Yellow
  Write-Host '  Pegue la URI de nuevo con la contraseña NUEVA (no reutilice contraseñas antiguas como Aute2026mayo si ya la reseteó).' -ForegroundColor Yellow
}

function Write-TenantNotFoundHint([string]$projectRef) {
  Write-Host ''
  Write-Host 'ERROR: Tenant or user not found' -ForegroundColor Red
  Write-Host '  Causas habituales (en orden):' -ForegroundColor Yellow
  Write-Host '    1) Host pooler incorrecto — copie EXACTO desde Connect (aws-0 vs aws-1, región us-east-1, etc.)' -ForegroundColor Yellow
  Write-Host '    2) Usuario debe ser postgres.PROJECT_REF (no solo postgres en pooler)' -ForegroundColor Yellow
  Write-Host '    3) Proyecto pausado o ref distinto — verifique en el dashboard' -ForegroundColor Yellow
  if ($projectRef) {
    Write-Host "  Dashboard: https://supabase.com/dashboard/project/$projectRef/settings/database" -ForegroundColor Cyan
  }
}

function Write-PausedProjectHint {
  Write-Host ''
  Write-Host 'Proyecto pausado (plan gratuito inactivo):' -ForegroundColor Yellow
  Write-Host '  Dashboard → su proyecto → Restore project / Unpause' -ForegroundColor Cyan
  Write-Host '  Espere 1-2 minutos y vuelva a ejecutar este script.' -ForegroundColor Cyan
}

function Test-PostgresSelect1([string]$url, [string]$serverDir) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  Push-Location $serverDir
  try {
    $out = node -e @"
const { Client } = require('pg');
const url = process.argv[1];
(async () => {
  const c = new Client({ connectionString: url });
  try {
    await c.connect();
    await c.query('SELECT 1 AS ok');
    await c.end();
    process.exit(0);
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
})();
"@ $url 2>&1
    $text = ($out | ForEach-Object { "$_" }) -join "`n"
    return [PSCustomObject]@{ ExitCode = $LASTEXITCODE; Output = $text }
  } finally {
    Pop-Location
    $ErrorActionPreference = $prev
  }
}

function Classify-PostgresError([string]$message) {
  if ($message -match 'password authentication failed|28P01|invalid password') { return 'bad_password' }
  if ($message -match 'Tenant or user not found') { return 'tenant' }
  if ($message -match 'ENOTFOUND|getaddrinfo') { return 'dns' }
  return 'other'
}

function Test-UriConnectivity([string]$url, [string]$serverDir, [string]$label) {
  Write-Host "Probando $label ..." -ForegroundColor Cyan
  Write-Host "  $(Mask-DatabaseUrl $url)" -ForegroundColor DarkGray
  $pg = Test-PostgresSelect1 $url $serverDir
  $joined = $pg.Output
  if ($pg.ExitCode -eq 0) {
    Write-Host "OK: SELECT 1 ($label)" -ForegroundColor Green
    return [PSCustomObject]@{ Ok = $true; Message = $joined; Kind = 'ok' }
  }
  $kind = Classify-PostgresError $joined
  Write-Host "Falló ($label): $joined" -ForegroundColor Red
  [PSCustomObject]@{ Ok = $false; Message = $joined; Kind = $kind }
}

function Test-UriWithSessionThenTransaction([string]$baseUrl, [string]$serverDir) {
  $session = Test-UriConnectivity $baseUrl $serverDir 'Session pooler (URI pegada)'
  if ($session.Ok) { return [PSCustomObject]@{ Url = $baseUrl; Result = $session } }

  if ($session.Kind -eq 'bad_password') { return [PSCustomObject]@{ Url = $null; Result = $session } }
  if ($session.Kind -eq 'tenant') { return [PSCustomObject]@{ Url = $null; Result = $session } }

  $txUrl = Add-PgbouncerQuery $baseUrl
  $tx = Test-UriConnectivity $txUrl $serverDir 'Transaction pooler (?pgbouncer=true)'
  if ($tx.Ok) { return [PSCustomObject]@{ Url = $txUrl; Result = $tx } }
  [PSCustomObject]@{ Url = $null; Result = $tx }
}

function Read-ConnectUriFromUser {
  Write-Host ''
  Write-Host 'Supabase → Connect → Connection string → URI' -ForegroundColor Cyan
  Write-Host '  Modo: Session pooler, puerto 6543 (como muestra el panel)' -ForegroundColor Cyan
  Write-Host '  Sustituya [YOUR-PASSWORD] por su contraseña de Database antes de pegar.' -ForegroundColor Cyan
  Write-Host '  No invente host ni usuario — copie la línea completa.' -ForegroundColor Cyan
  Write-Host ''
  $input = Read-Host 'Pegue la URI postgres:// o postgresql:// completa'
  if (-not $input) { throw 'Entrada vacía.' }
  $input.Trim()
}

function Open-SupabaseDatabaseDashboard([string]$projectRef) {
  if (-not $projectRef) {
    Start-Process 'https://supabase.com/dashboard'
    return
  }
  $url = "https://supabase.com/dashboard/project/$projectRef/settings/database"
  Write-Host "Abriendo: $url" -ForegroundColor Cyan
  Start-Process $url
}
