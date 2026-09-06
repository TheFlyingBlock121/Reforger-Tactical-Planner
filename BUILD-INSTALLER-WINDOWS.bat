@echo off
setlocal
cd /d "%~dp0"
title Reforger Tactical Planner v0.7 - Installer Builder
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\build-installer.ps1"
echo.
pause
