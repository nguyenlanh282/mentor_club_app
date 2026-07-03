@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Cap nhat danh sach Page tu Facebook vao Lark Base ===
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-fetch-pages.ps1"
echo.
pause
