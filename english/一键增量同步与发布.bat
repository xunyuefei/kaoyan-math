@echo off
chcp 65001 >nul
title 考研英语红宝书讲义 · 一键增量同步与发布

echo =======================================================
echo     📕 考研英语红宝书 · 一键增量同步与发布工具
echo =======================================================
echo.

echo [1/3] 正在增量扫描新生成的单词、词组与特训讲义...
cd /d "%~dp0"
node sync_english.js
if %errorlevel% neq 0 (
    echo [错误] 扫描同步失败，请检查 Node.js 环境！
    pause
    exit /b 1
)

echo.
echo [2/3] 正在同步提交到 GitHub Pages...
cd /d "%~dp0\.."
git add english/
git commit -m "Auto-update English handouts: incremental sync"
git push origin main
if %errorlevel% equ 0 (
    echo [成功] 已成功推送到 GitHub 线上仓库！
    echo 线上地址: https://xunyuefei.github.io/kaoyan-math/english/
) else (
    echo [提示] 线上推送遇到网络波动，已完成本地同步，您可随时在本地阅读！
)

echo.
echo [3/3] 正在启动或刷新本地预览服务...
start "" "http://localhost:5220/"

echo.
echo =======================================================
echo    🎉 全部完成！已打开浏览器查看最新讲义。
echo =======================================================
timeout /t 3 >nul
exit
