@echo off
setlocal

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "BACKEND_DIR=%ROOT_DIR%\p2m-backend"
set "PORT=5000"

cd /d "%BACKEND_DIR%"

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
  echo Backend build failed. Fix the error above, then rerun this script.
  pause
  exit /b 1
)

:run_backend
echo.
echo Starting backend with RTU emulator and realtime alarms...
node --max-old-space-size=4096 dist/server.js
set "EXIT_CODE=%ERRORLEVEL%"

if "%EXIT_CODE%"=="0" (
  echo Backend stopped normally.
  pause
  exit /b 0
)

echo.
echo Backend stopped with exit code %EXIT_CODE%. Restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto run_backend
