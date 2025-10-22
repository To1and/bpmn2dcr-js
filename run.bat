@echo off
REM bpmn2dcr-js Startup Script for Windows
REM This script starts both the Python backend and Vite frontend servers

setlocal enabledelayedexpansion

REM Ports
set BACKEND_PORT=8000
set FRONTEND_PORT=3001

REM PID file to track backend process
set BACKEND_PID_FILE=%TEMP%\bpmn2dcr_backend.pid
set BACKEND_LOG=%TEMP%\backend.log

echo.
echo ================================================================
echo.
echo               Starting bpmn2dcr-js
echo.
echo ================================================================
echo.

REM Check if ports are already in use and kill processes
echo [*] Checking ports...
echo.

for /f "tokens=5" %%a in ('netstat -aon ^| find ":%BACKEND_PORT%" ^| find "LISTENING"') do (
    echo [!] Port %BACKEND_PORT% is already in use. Killing process %%a...
    taskkill /F /PID %%a >nul 2>&1
    timeout /t 1 /nobreak >nul
)

for /f "tokens=5" %%a in ('netstat -aon ^| find ":%FRONTEND_PORT%" ^| find "LISTENING"') do (
    echo [!] Port %FRONTEND_PORT% is already in use. Killing process %%a...
    taskkill /F /PID %%a >nul 2>&1
    timeout /t 1 /nobreak >nul
)

echo [+] Ports are available
echo.

REM Check if dependencies are installed
echo [*] Checking dependencies...
echo.

if not exist "node_modules\" (
    echo [x] Node modules not found. Please run: npm install
    pause
    exit /b 1
)

if not exist "bpmn2dcr-pycore\" (
    echo [x] Backend directory not found
    pause
    exit /b 1
)

echo [+] Dependencies found
echo.

REM Start backend server
echo [*] Starting Python backend server...
cd bpmn2dcr-pycore

REM Start backend in background and save PID
start /b python -m uvicorn server:app --reload --port %BACKEND_PORT% > "%BACKEND_LOG%" 2>&1

REM Get the PID of the Python process
for /f "tokens=2" %%a in ('tasklist ^| find "python"') do (
    set BACKEND_PID=%%a
    goto :found_pid
)
:found_pid
echo !BACKEND_PID! > "%BACKEND_PID_FILE%"

cd ..

REM Wait for backend to start
echo    Waiting for backend to start...
set /a count=0
:wait_backend
timeout /t 1 /nobreak >nul
set /a count+=1

curl -s http://localhost:%BACKEND_PORT%/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [+] Backend server started
    echo    Backend: http://localhost:%BACKEND_PORT%
    goto :backend_started
)

if %count% geq 10 (
    echo [x] Backend failed to start. Check %BACKEND_LOG% for details
    type "%BACKEND_LOG%"
    goto :cleanup
)
goto :wait_backend

:backend_started
echo.

REM Start frontend server
echo [*] Starting Vite frontend server...
echo.
echo ================================================================
echo    Frontend: http://localhost:%FRONTEND_PORT%
echo    Backend:  http://localhost:%BACKEND_PORT%
echo ================================================================
echo.
echo [!] Press Ctrl+C to stop both servers
echo.
echo ================================================================
echo.

REM Start frontend (this will run in foreground)
call npm run dev

REM Cleanup on exit
:cleanup
echo.
echo [!] Shutting down servers...

if exist "%BACKEND_PID_FILE%" (
    set /p BACKEND_PID=<"%BACKEND_PID_FILE%"
    echo    Stopping backend (PID: !BACKEND_PID!)...
    taskkill /F /PID !BACKEND_PID! >nul 2>&1
    del "%BACKEND_PID_FILE%" >nul 2>&1
)

REM Kill any remaining processes on the ports
for /f "tokens=5" %%a in ('netstat -aon ^| find ":%BACKEND_PORT%" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| find ":%FRONTEND_PORT%" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [+] Cleanup complete
echo.
pause
exit /b 0
