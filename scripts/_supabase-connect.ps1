# Shared Supabase URI helpers (dot-source from verify / setup scripts)

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
  $host = $hostPort
  $lastColon = $hostPort.LastIndexOf(':')
  if ($lastColon -gt 0) {
    $maybePort = $hostPort.Substring($lastColon + 1)
    if ($maybePort -match '^\d+$') {
      $port = [int]$maybePort
      $host = $hostPort.Substring(0, $lastColon)
    }
  }
  $host = ($host -replace '\.supabase\.co$', '.supabase.com')

  [PSCustomObject]@{
    IsPasswordOnly = $false
    User           = $user
    Password       = $pass
    Host           = $host
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

function Build-DatabaseUrlFromParsed($parsed) {
  if (Test-PlaceholderPassword $parsed.Password) {
    throw 'URI sin contraseña — reemplace [YOUR-PASSWORD] en la cadena de Connect.'
  }
  $enc = Encode-DbPassword $parsed.Password
  $qs = $parsed.Query
  if (-not $qs) { $qs = '?sslmode=require' }
  elseif ($qs -notmatch '^\?') { $qs = "?$qs" }
  if ($qs -notmatch 'sslmode=') {
    $qs = if ($qs -eq '?') { '?sslmode=require' } else { "$qs&sslmode=require" }
  }
  "postgres://$($parsed.User):${enc}@$($parsed.Host):$($parsed.Port)/$($parsed.Database)$qs"
}

function New-TransactionPoolerVariant($parsed) {
  $clone = [PSCustomObject]@{
    User     = $parsed.User
    Password = $parsed.Password
    Host     = $parsed.Host
    Port     = 6543
    Database = $parsed.Database
    Query    = '?pgbouncer=true&sslmode=require'
  }
  if ($parsed.User -eq 'postgres') {
    $ref = Get-ProjectRefFromParsed $parsed
    if ($ref) { $clone.User = "postgres.$ref" }
  }
  $clone
}

function New-SessionPoolerPort5432Variant($parsed) {
  $clone = [PSCustomObject]@{
    User     = $parsed.User
    Password = $parsed.Password
    Host     = $parsed.Host
    Port     = 5432
    Database = $parsed.Database
    Query    = if ($parsed.Query) { $parsed.Query } else { '?sslmode=require' }
  }
  if ($clone.Query -match 'pgbouncer=true') {
    $clone.Query = ($clone.Query -replace '[?&]pgbouncer=true', '') -replace '\?&', '?'
    if ($clone.Query -eq '?') { $clone.Query = '?sslmode=require' }
  }
  $clone
}

function Get-ConnectionCandidates($parsed) {
  $list = [System.Collections.Generic.List[PSCustomObject]]::new()
  $seen = @{}

  function Add-Candidate($p, [string]$label) {
    $url = Build-DatabaseUrlFromParsed $p
    if ($seen.ContainsKey($url)) { return }
    $seen[$url] = $true
    [void]$list.Add([PSCustomObject]@{ Parsed = $p; Url = $url; Label = $label })
  }

  Add-Candidate $parsed 'URI pegada (Connect)'
  if ($parsed.Port -eq 6543) {
    Add-Candidate (New-SessionPoolerPort5432Variant $parsed) 'Session pooler puerto 5432'
  }
  if ($parsed.Port -ne 6543 -or $parsed.Query -notmatch 'pgbouncer=true') {
    Add-Candidate (New-TransactionPoolerVariant $parsed) 'Transaction pooler :6543 ?pgbouncer=true'
  }
  $list
}

function Test-PgSelectOne([string]$url, [string]$ServerDir) {
  Push-Location $ServerDir
  try {
    node scripts/test-pg-connection.mjs $url 2>&1 | ForEach-Object { "$_" }
    return ($LASTEXITCODE -eq 0)
  } finally {
    Pop-Location
  }
}

function Invoke-PgTestWithHints([string]$url, [string]$ServerDir) {
  $lines = [System.Collections.Generic.List[string]]::new()
  Push-Location $ServerDir
  try {
    node scripts/test-pg-connection.mjs $url 2>&1 | ForEach-Object {
      $line = if ($_ -is [System.Management.Automation.ErrorRecord]) {
        if ($_.Exception.Message) { $_.Exception.Message } else { "$_" }
      } else { "$_" }
      [void]$lines.Add($line)
      Write-Host $line
    }
  } finally {
    Pop-Location
  }
  $joined = $lines -join "`n"
  $ok = ($LASTEXITCODE -eq 0)
  $hint = $null
  if (-not $ok) {
    if ($joined -match 'password authentication failed|28P01|invalid password') { $hint = 'bad_password' }
    elseif ($joined -match 'Tenant or user not found') { $hint = 'tenant' }
    elseif ($joined -match 'ENOTFOUND|getaddrinfo') { $hint = 'dns' }
  }
  [PSCustomObject]@{ Ok = $ok; Hint = $hint; Output = $joined }
}

function Write-SupabasePasswordResetHint {
  Write-Host ''
  Write-Host 'Contraseña rechazada por PostgreSQL.' -ForegroundColor Red
  Write-Host '  1. Supabase Dashboard → Project Settings → Database → Reset database password' -ForegroundColor Yellow
  Write-Host '  2. Pegue de nuevo la URI de Connect con la contraseña NUEVA (no adivine la antigua).' -ForegroundColor Yellow
  Write-Host '  Use la contraseña de BASE DE DATOS, no la del admin de la app.' -ForegroundColor DarkGray
}

function Write-SupabaseTenantHint([string]$ref) {
  Write-Host ''
  Write-Host 'ERROR: Tenant or user not found' -ForegroundColor Red
  Write-Host '  El pooler no reconoce usuario+host. NO construya la URL a mano.' -ForegroundColor Yellow
  Write-Host '  Copie la URI EXACTA desde Connect → Session pooler (o Transaction 6543).' -ForegroundColor Yellow
  if ($ref) {
    Write-Host "  Ref detectado en URI: $ref — confirme en dashboard:" -ForegroundColor Cyan
    Write-Host "  https://supabase.com/dashboard/project/$ref/settings/database" -ForegroundColor Cyan
  }
  Write-Host '  Proyecto pausado: Dashboard → Restore project (ver docs/DEPLOY-FLY.md).' -ForegroundColor DarkGray
}

function Write-SupabasePausedHint {
  Write-Host ''
  Write-Host 'Proyecto pausado (inactivo >7 días en plan gratuito):' -ForegroundColor Yellow
  Write-Host '  https://supabase.com/dashboard → su proyecto → "Restore project" / "Unpause"' -ForegroundColor Cyan
  Write-Host '  Espere 1–2 minutos y vuelva a pegar la URI de Connect.' -ForegroundColor DarkGray
}
