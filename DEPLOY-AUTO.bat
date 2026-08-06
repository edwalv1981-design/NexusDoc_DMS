@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title NexusDoc DMS - Despliegue en Railway

echo =========================================================
echo    NexusDoc DMS — Verificación y Despliegue en Railway
echo =========================================================
echo.

set "GIT_CMD="

if exist "C:\Program Files\Git\cmd\git.exe" (
    set "GIT_CMD=C:\Program Files\Git\cmd\git.exe"
) else if exist "C:\Program Files (x86)\Git\cmd\git.exe" (
    set "GIT_CMD=C:\Program Files (x86)\Git\cmd\git.exe"
) else if exist "%LocalAppData%\Programs\Git\cmd\git.exe" (
    set "GIT_CMD=%LocalAppData%\Programs\Git\cmd\git.exe"
) else (
    where git >nul 2>&1
    if not errorlevel 1 set "GIT_CMD=git"
)

if "%GIT_CMD%"=="" (
    echo [ERROR] No se encontró el comando 'git' en el sistema.
    echo.
    echo Por favor ejecute una de las siguientes opciones:
    echo  1. Abra Git Bash en esta carpeta (%~dp0).
    echo  2. O abra su terminal habitual y ejecute:
    echo       git add .
    echo       git commit -m "Feat: Actualizacion NexusDoc DMS"
    echo       git push origin main
    echo.
    pause
    exit /b 1
)

echo [1/3] Preparando archivos modificados...
"%GIT_CMD%" add .

echo [2/3] Creando commit con las mejoras de Autocompletado, Seguridad y UX/UI...
"%GIT_CMD%" commit -m "Feat: Add PersonSelector auto-fill, security suite, and modern UX/UI redesign"

echo [3/3] Enviando cambios a GitHub / Railway (git push origin main)...
"%GIT_CMD%" push origin main

echo.
if errorlevel 1 (
    echo [FALLO] No se pudo realizar el push. Revise su conexión o credenciales de Git.
) else (
    echo [ÉXITO] ¡Cambios enviados a GitHub correctamente!
    echo Railway iniciará el despliegue automático en 10-30 segundos.
    echo Ingrese a https://nexusdocdms-production.up.railway.app para verificar.
)

echo.
pause
