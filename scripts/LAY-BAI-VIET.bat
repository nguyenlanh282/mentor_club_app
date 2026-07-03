@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Lay danh sach bai viet tu Facebook vao Lark Base (14.2) ===
echo [Enter] = chi them bai moi.  Go: update  = refresh chi so bai cu.
set /p MODE=Che do (bo trong / update):
if /i "%MODE%"=="update" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-fetch-posts.ps1" --update
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-fetch-posts.ps1"
)
echo.
pause
