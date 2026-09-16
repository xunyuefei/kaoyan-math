@echo off
cd /d "%~dp0"
title 考研数学 SOP 题解知识库 - 一键同步与云端发布

echo ========================================================
echo   考研数学 SOP 题解知识库 · 一键同步与云端发布
echo ========================================================
echo.

node scripts/deploy.js
if errorlevel 1 goto error

echo.
echo ========================================================
echo [完成] 本地已更新，云端已同步至 GitHub Pages！
echo 正在为您打开本地题解站: http://localhost:5210/
echo ========================================================
ping 127.0.0.1 -n 3 >nul
exit /b 0

:error
echo.
echo [错误] 同步部署过程出现问题，请查看上方日志。
pause
exit /b 1
