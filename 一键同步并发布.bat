@echo off
cd /d "%~dp0"
title KaoYan Math Auto Deploy

echo.
echo ========================================================
echo   [KaoYan Math] Auto Sync and Deploy
echo ========================================================
echo.

node scripts/deploy.js

if errorlevel 1 (
    echo.
    echo [Error] Deploy failed. Please check the error above.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo [Success] Deploy completed! Auto closing in 5s...
timeout /t 5 >nul
exit /b 0
