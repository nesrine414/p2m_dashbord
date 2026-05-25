@echo off
setlocal

set "PORT=5000"

echo Checking backend port %PORT%...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  if not "%%P"=="0" (
    echo Stopping existing backend process on port %PORT% ^(PID %%P^)...
    taskkill /PID %%P /F >nul 2>nul
  )
)

echo Building backend...
call npm.cmd run build
if errorlevel 1 (
  echo Backend build failed.
  exit /b 1
)

echo Starting backend with RTU emulator and realtime alarms...
node --max-old-space-size=4096 dist/server.js
