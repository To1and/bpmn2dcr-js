@echo off
REM bpmn2dcr-js Startup Script for Windows
REM This script starts the frontend development server

setlocal enabledelayedexpansion

REM Port
set FRONTEND_PORT=3001

echo.
echo ================================================================
echo.
echo               Starting bpmn2dcr-js
echo.
echo ================================================================
echo.

REM Check if port is already in use and kill processes
echo [*] Checking port...
echo.

for /f "tokens=5" %%a in ('netstat -aon ^| find ":%FRONTEND_PORT%" ^| find "LISTENING"') do (
    echo [!] Port %FRONTEND_PORT% is already in use. Killing process %%a...
    taskkill /F /PID %%a >nul 2>&1
    timeout /t 1 /nobreak >nul
)

echo [+] Port is available
echo.

REM Check if dependencies are installed
echo [*] Checking dependencies...
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [x] Node.js is not installed. Please install Node.js v16 or higher.
    pause
    exit /b 1
)

REM Check npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [x] npm is not installed. Please install npm.
    pause
    exit /b 1
)

echo [+] Prerequisites found
echo.

REM Install Node dependencies if needed
if not exist "node_modules\" (
    echo [*] Node modules not found. Installing...
    call npm install
    if %errorlevel% equ 0 (
        echo [+] Dependencies installed successfully
    ) else (
        echo [x] Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
) else (
    REM Check if critical packages are installed
    if not exist "node_modules\pyodide\" (
        echo [*] Some dependencies are missing. Installing...
        call npm install
        if %errorlevel% equ 0 (
            echo [+] Dependencies installed successfully
        ) else (
            echo [x] Failed to install dependencies
            pause
            exit /b 1
        )
        echo.
    ) else if not exist "node_modules\react\" (
        echo [*] Some dependencies are missing. Installing...
        call npm install
        if %errorlevel% equ 0 (
            echo [+] Dependencies installed successfully
        ) else (
            echo [x] Failed to install dependencies
            pause
            exit /b 1
        )
        echo.
    ) else if not exist "node_modules\vite\" (
        echo [*] Some dependencies are missing. Installing...
        call npm install
        if %errorlevel% equ 0 (
            echo [+] Dependencies installed successfully
        ) else (
            echo [x] Failed to install dependencies
            pause
            exit /b 1
        )
        echo.
    ) else (
        echo [+] Dependencies found
    )
)

echo.

REM Start frontend server
echo [*] Starting Vite frontend server...
echo.
echo ================================================================
echo    Application: http://localhost:%FRONTEND_PORT%
echo    Python code runs in your browser via Pyodide
echo ================================================================
echo.
echo [!] Press Ctrl+C to stop the server
echo.
echo ================================================================
echo.

REM Start frontend (this will run in foreground)
call npm run dev

REM Cleanup on exit
:cleanup
echo.
echo [!] Shutting down server...

REM Kill any remaining processes on the port
for /f "tokens=5" %%a in ('netstat -aon ^| find ":%FRONTEND_PORT%" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [+] Cleanup complete
echo.
pause
exit /b 0
