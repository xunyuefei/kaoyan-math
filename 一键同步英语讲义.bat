@echo off
cd /d "%~dp0"
chcp 65001 >nul 2>&1
title Kaoyan English Red Book - Incremental Sync Portal
node english\sync_all.js
if errorlevel 1 (
    echo.
    echo [Error] Sync failed, please check log above.
    pause
    exit /b 1
)
exit /b 0
