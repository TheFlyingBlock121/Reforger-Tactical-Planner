@echo off
setlocal
cd /d "%~dp0"
title Reforger Tactical Planner v0.7 - Verify Source

echo [1/3] Checking JavaScript syntax...
node --check electron\main.cjs || goto :fail
node --check electron\preload.cjs || goto :fail
node --check relay\server.mjs || goto :fail
node --check scripts\validate-drop-maps.mjs || goto :fail
node --check scripts\map-pack-utils.mjs || goto :fail

echo [2/3] Checking map folders...
node scripts\validate-drop-maps.mjs || goto :fail

echo [3/3] Type-checking frontend...
if not exist node_modules (
  echo node_modules not found. Run npm install first.
  goto :fail
)
call npm run build:web || goto :fail

echo.
echo SOURCE CHECK PASSED.
pause
exit /b 0

:fail
echo.
echo SOURCE CHECK FAILED. Read the first error above.
pause
exit /b 1
