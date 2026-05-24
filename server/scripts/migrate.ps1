# Wrapper Windows: carga server/.env y ejecuta migrate-with-url.mjs
$ErrorActionPreference = 'Stop'
$serverRoot = Split-Path -Parent $PSScriptRoot
Set-Location $serverRoot
node (Join-Path $PSScriptRoot 'migrate-with-url.mjs') @args
exit $LASTEXITCODE
