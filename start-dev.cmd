@echo off
setlocal

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

echo Starting backend...
start "p2m-backend" cmd /k ""%ROOT_DIR%\start-backend-keepalive.cmd""

echo Starting ML model...
start "p2m-ml" cmd /k "cd /d ""%ROOT_DIR%\p2m-backend"" && npm.cmd run ml"

echo Starting frontend...
start "p2m-frontend" cmd /k "cd /d ""%ROOT_DIR%"" && npm.cmd start"

endlocal
