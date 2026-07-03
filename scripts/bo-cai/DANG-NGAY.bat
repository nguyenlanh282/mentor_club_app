@echo off
chcp 65001 >nul
title Dang Reel ngay (on-demand)
set "PATH=%PATH%;%ProgramFiles%\nodejs;%APPDATA%\npm"
echo.
echo   Dang dang cac Reel dang o trang thai "Cho dang" ...
echo.
node --no-deprecation "%~dp0post-reels.js"
echo.
echo   Xong. Kiem tra cot "TT Reel" / "Link Reel" tren Base.
pause
