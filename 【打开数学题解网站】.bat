@echo off
cd /d "%~dp0"
title 考研数学 SOP 题解站 - 本地极速预览

echo ========================================================
echo   考研数学 SOP 题解站 · 正在连接本地极速预览 (端口 5210)
echo ========================================================
echo.

netstat -ano | findstr :5210 | findstr LISTENING >nul 2>&1
if errorlevel 1 goto start_server
goto open_browser

:start_server
echo [启动] 正在后台开启本地极速服务...
start /b "" node scripts/serve.js
ping 127.0.0.1 -n 2 >nul

:open_browser
echo [打开] 正在唤醒浏览器打开数学题解站: http://localhost:5210/
start "" "http://localhost:5210/"
exit /b 0
