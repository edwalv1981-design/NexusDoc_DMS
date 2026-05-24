@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title NexusDoc - Arreglar login

start "" "https://supabase.com/dashboard/project/ohwqfujrakhwxfuxo"

echo(
echo En Supabase: Connect, Session pooler 6543, copie la URI y sustituya [YOUR-PASSWORD] por su contraseña real.
echo Pegue la URI completa cuando aparezca DATABASE_URL:
echo No cierre esta ventana hasta ver LISTO o ERROR.
echo(

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\arreglar-login-core.ps1"
set "EC=%ERRORLEVEL%"
echo(
if "%EC%"=="0" (
  echo [EXITO] Todo listo. Abra https://nexusdoc-dms.fly.dev/dashboard
  echo Email: edwinalvarezvivero@yahoo.com
) else (
  echo [ERROR] No se completó el arreglo.
  echo Si la URI es correcta ^(Connect, Session pooler 6543^) y falla con Tenant: proyecto Supabase pausado o cuenta equivocada.
)
pause
exit /b %EC%
