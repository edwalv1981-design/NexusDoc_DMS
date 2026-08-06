# PowerShell Script para Despliegue en Railway
Set-Location -Path $PSScriptRoot
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "     EJECUTANDO DESPLIEGUE A GITHUB Y RAILWAY      " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

git add .
git commit -m "Feat: Deploy all improvements - PersonSelector, Security Suite, and UX/UI redesign"
git push origin main

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Comando ejecutado. Revisa tu panel de Railway.   " -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""
Read-Host -Prompt "Presiona Enter para cerrar"
