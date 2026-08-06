@echo off
cd /d "C:\sistemas eeav\nexusdoc\NexusDoc_DMS"
echo =========================================================
echo    NexusDoc DMS - Railway Deploy via GitHub Desktop Engine
echo =========================================================
echo.

set GIT_EXEC=C:\Users\EDWIN\AppData\Local\GitHubDesktop\app-3.6.3\resources\app\git\cmd\git.exe

"%GIT_EXEC%" config --global --add safe.directory "C:/sistemas eeav/nexusdoc/NexusDoc_DMS"
"%GIT_EXEC%" add .
"%GIT_EXEC%" commit -m "Feat: Add PersonSelector auto-fill, security suite, and modern UX/UI redesign"
"%GIT_EXEC%" push origin main

echo.
echo =========================================================
echo    Deploy Completed. Check Railway Dashboard.
echo =========================================================
echo.
pause
