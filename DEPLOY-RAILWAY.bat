@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title NexusDoc DMS - Desplegar a Railway

echo ===================================================
echo     NexusDoc DMS - Despliegue en Nube (Railway)
echo ===================================================
echo.

set "GIT_EXE=C:\Program Files\Git\cmd\git.exe"
if not exist "%GIT_EXE%" (
    set "GIT_EXE=git"
)

echo [1/3] Añadiendo cambios a Git...
"%GIT_EXE%" add .

set /p COMMIT_MSG="Ingrese el mensaje de commit (o presione Enter para usar mensaje automatico): "
if "%COMMIT_MSG%"=="" (
    set COMMIT_MSG=Actualizacion NexusDoc DMS - %DATE% %TIME%
)

echo [2/3] Creando commit...
"%GIT_EXE%" commit -m "%COMMIT_MSG%"

echo [3/3] Enviando cambios a Railway (git push origin main)...
"%GIT_EXE%" push origin main

echo.
echo [LISTO] Cambios enviados a Railway.
echo El contenedor se construira automaticamente en https://nexusdocdms-production.up.railway.app
echo.
pause
