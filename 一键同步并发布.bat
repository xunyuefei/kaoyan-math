@echo off
cd /d "%~dp0"
title KaoYan Math - AI Auto Deploy
chcp 65001 >nul 2>&1

echo.
echo ========================================================
echo   KaoYan Math - DeepSeek AI One-Click Deploy
echo ========================================================
echo.

REM Check if inbox.md has content
for %%A in (inbox.md) do (
    if %%~zA==0 (
        echo [Info] inbox.md is empty, skipping AI ingest.
    ) else (
        echo [Info] inbox.md has content, AI will process it.
    )
)

echo.
echo [Starting] Running deploy pipeline...
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
echo [Done] Deploy completed! Auto closing in 5s...
echo ========================================================
timeout /t 5 >nul
exit /b 0
