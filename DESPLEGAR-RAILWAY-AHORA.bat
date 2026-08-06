@echo off
title Despliegue en Railway - NexusDoc DMS
cd /d "%~dp0"
echo ===================================================
echo     EJECUTANDO DESPLIEGUE A GITHUB Y RAILWAY
echo ===================================================
echo.
echo Ejecutando Git...
git add .
git commit -m "Feat: Deploy all improvements - PersonSelector, Security Suite, and UX/UI redesign"
git push origin main
echo.
echo ===================================================
if %ERRORLEVEL% EQU 0 (
    echo  ¡DESPLIEGUE ENVIADO EXITOSAMENTE A RAILWAY!
) else (
    echo  Ocurrio un error o aviso al ejecutar Git.
)
echo ===================================================
echo.
pause
