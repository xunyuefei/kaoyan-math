@echo off
cd /d "%~dp0"
title 考研数学 SOP 题解知识库 - 智能极速部署
chcp 65001 >nul 2>&1

echo.
echo ========================================================
echo   考研数学 SOP 题解知识库 · DeepSeek AI 一键入库与极速同步
echo ========================================================
echo.

REM 检查 inbox.md 内容
for %%A in (inbox.md) do (
    if %%~zA==0 (
        echo [提示] inbox.md 暂无新题目，将执行日常同步与构建。
    ) else (
        echo [提示] 检测到 inbox.md 有新题目，正在唤醒 DeepSeek 进行 6层 SOP 重构...
    )
)

echo.
echo [启动] 正在执行全自动处理流水线...
echo.

node scripts/deploy.js

if errorlevel 1 (
    echo.
    echo [错误] 同步部署过程出现问题，请查看上方日志。
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo [完成] 本地已秒级生效，云端已静默同步！窗口将在 3 秒后自动关闭...
echo ========================================================
timeout /t 3 >nul
exit /b 0
