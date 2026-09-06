@echo off
cd /d "%~dp0"
echo v0.7 now builds a proper Windows installer instead of a loose application folder.
call BUILD-INSTALLER-WINDOWS.bat
