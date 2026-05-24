@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title NexusDoc - Arreglar login

echo Si ve esta ventana, el script arranco
echo.

if not exist "%~dp0scripts\arreglar-login-core.ps1" (
  echo [ERROR] No se encuentra scripts\arreglar-login-core.ps1
  echo Ruta esperada: %~dp0scripts\arreglar-login-core.ps1
  pause
  exit /b 1
)

echo Actualizando repositorio ^(git pull^)...
git pull
if errorlevel 1 (
  echo [AVISO] git pull fallo; se continua con la version local.
) else (
  echo Repositorio actualizado.
)
echo.

start "" "https://supabase.com/dashboard/project/oxpohwcfujrakhwxfuxo?showConnect=true&connectTab=pooler"

echo Se abre Supabase en Connect ^(Session pooler 5432^).
echo 1. Copie la URI en el panel.
echo 2. En la ventana de PowerShell: pegue la URI y escriba solo la contraseña de base de datos cuando la pida.
echo No cierre la ventana de PowerShell hasta ver LISTO o ERROR.
echo.

powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0scripts\arreglar-login-core.ps1"
set "EC=%ERRORLEVEL%"
echo.
if "%EC%"=="0" (
  echo [EXITO] Todo listo. Abra https://nexusdoc-dms.fly.dev/dashboard
  echo Email: edwinalvarezvivero@yahoo.com
) else (
  echo [ERROR] No se completó el arreglo.
  echo Si pegó la URI de Connect ^(Session pooler 5432^) y la contraseña correcta, puede ser proyecto pausado o cuenta Supabase equivocada.
)
pause
exit /b %EC%
