@echo off
chcp 65001 >nul
title 考研数学 SOP 题解站 —— 一键自动同步与发布
color 0b

echo.
echo ========================================================
echo       📐 考研数学 SOP 题解站 —— 一键全自动同步与发布
echo ========================================================
echo.

node scripts/deploy.js

if %errorlevel% neq 0 (
    echo.
    echo ❌ 发布过程中发生错误，请查看上方提示。
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo --------------------------------------------------------
echo 倒计时 5 秒后窗口将自动关闭...
timeout /t 5 >nul
exit /b 0
