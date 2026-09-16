@echo off
cd /d "%~dp0"
title 打开考研数学题解站
chcp 65001 >nul 2>&1

echo 正在打开考研数学 SOP 决策题解站...
start "" "https://xunyuefei.github.io/kaoyan-math/"
start "" "index.html"
exit /b 0
