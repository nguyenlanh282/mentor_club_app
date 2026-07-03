@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Dang bai tu dong tu bang 14.3 len Facebook Page ===
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-post-feed.ps1"
echo.
pause
