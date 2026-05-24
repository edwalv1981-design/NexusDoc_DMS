@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title NexusDoc - Arreglar login

start "" "https://supabase.com/dashboard/project/oxpohwcfujrakhwxfuxo?showConnect=true&connectTab=pooler"

echo(
echo Se abre Supabase en Connect ^(Session pooler 5432^).
echo 1. Copie la URI en el panel.
echo 2. En esta ventana: pegue la URI y escriba solo la contraseña de base de datos cuando la pida.
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
  echo Si pegó la URI de Connect ^(Session pooler 5432^) y la contraseña correcta, puede ser proyecto pausado o cuenta Supabase equivocada.
)
pause
exit /b %EC%
