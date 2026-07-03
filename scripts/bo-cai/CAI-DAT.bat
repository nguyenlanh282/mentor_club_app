@echo off
chcp 65001 >nul
title Cai dat - Dang Reel Facebook
echo.
echo   Dang khoi dong trinh cai dat...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
