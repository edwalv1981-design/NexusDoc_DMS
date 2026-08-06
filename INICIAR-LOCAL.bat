@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title NexusDoc DMS - Entorno Local

echo ===================================================
echo     NexusDoc DMS - Ejecución en Entorno Local
echo ===================================================
echo.

if not exist "%~dp0server\.env" (
    echo [INFO] Creando archivo server\.env desde server\.env.example...
    copy "%~dp0server\.env.example" "%~dp0server\.env" >nul
    echo [AVISO] Por favor verifique o configure la variable DATABASE_URL en server\.env si desea conectar a Supabase.
    echo.
)

if not exist "%~dp0node_modules" (
    echo [INFO] Instalando dependencias raíz...
    call npm install
)

if not exist "%~dp0server\node_modules" (
    echo [INFO] Instalando dependencias del servidor...
    cd "%~dp0server"
    call npm install
    cd "%~dp0"
)

if not exist "%~dp0client\node_modules" (
    echo [INFO] Instalando dependencias del cliente...
    cd "%~dp0client"
    call npm install
    cd "%~dp0"
)

echo [1/2] Iniciando Servidor Backend (Puerto 5000 / 8080)...
start "NexusDoc Backend Server" cmd /k "cd /d %~dp0server && npm run start:dev"

echo [2/2] Iniciando Cliente Frontend (Vite - http://localhost:5173)...
start "NexusDoc Frontend Client" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo Esperando 3 segundos para abrir la interfaz en el navegador...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo [LISTO] El sistema local está corriendo en dos ventanas independientes.
echo Para detenerlo, simplemente cierre las ventanas del servidor y del cliente.
echo.
pause
