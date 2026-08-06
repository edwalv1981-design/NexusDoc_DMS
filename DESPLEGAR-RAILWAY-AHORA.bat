@echo off
cd /d "C:\sistemas eeav\nexusdoc\NexusDoc_DMS"
echo =========================================================
echo    NexusDoc DMS - Railway Deployment
echo =========================================================
echo.

set "GIT_EXEC=git"
if exist "C:\Users\EDWIN\.gemini\antigravity\brain\4fd63267-866d-4b6c-a2e5-a0694c3e122e\scratch\mingit\cmd\git.exe" (
    set "GIT_EXEC=C:\Users\EDWIN\.gemini\antigravity\brain\4fd63267-866d-4b6c-a2e5-a0694c3e122e\scratch\mingit\cmd\git.exe"
)

"%GIT_EXEC%" config --global --add safe.directory "C:/sistemas eeav/nexusdoc/NexusDoc_DMS"
"%GIT_EXEC%" add .
"%GIT_EXEC%" commit -m "Feat: Add PersonSelector, security suite, and modern UX/UI redesign"
"%GIT_EXEC%" push origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo [OK] Deployment pushed successfully to GitHub and Railway!
) else (
    echo [NOTICE] Process finished. Check your Railway dashboard.
)

echo.
pause
