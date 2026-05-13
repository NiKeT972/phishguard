@echo off
:: PhishGuard — Startup Script (Windows)
:: Team: DATA MAVERICKS | KLEOS 4.0

title PhishGuard — India's Scam Shield

echo.
echo  *** PhishGuard — India's AI-powered scam shield ***
echo  *** Team: DATA MAVERICKS ^| KLEOS 4.0            ***
echo.

set ROOT_DIR=%~dp0
set BACKEND_DIR=%ROOT_DIR%backend
set FRONTEND_DIR=%ROOT_DIR%frontend

:: Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Install Python 3.9+ from python.org
    pause
    exit /b 1
)

:: Check Node
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js/npm not found. Install from nodejs.org
    pause
    exit /b 1
)

:: Install Python dependencies
echo [1/4] Installing Python dependencies...
cd /d "%BACKEND_DIR%"
pip install -r requirements.txt -q
echo       Done.

:: Install Node dependencies
echo [2/4] Installing npm dependencies...
cd /d "%FRONTEND_DIR%"
if not exist "node_modules" (
    npm install --silent
)
echo       Done.

:: Start backend
echo [3/4] Starting backend on port 8000...
cd /d "%BACKEND_DIR%"
start "PhishGuard Backend" cmd /k "python -m uvicorn main:app --reload --port 8000"

:: Wait for backend
timeout /t 5 /nobreak >nul

:: Start frontend
echo [4/4] Starting frontend on port 3000...
cd /d "%FRONTEND_DIR%"
start "PhishGuard Frontend" cmd /k "set BROWSER=none && npm start"

:: Wait and open browser
timeout /t 8 /nobreak >nul

echo.
echo ================================================
echo   PhishGuard is ready!
echo   App:  http://localhost:3000
echo   API:  http://localhost:8000
echo   Docs: http://localhost:8000/docs
echo ================================================
echo.

start http://localhost:3000

echo Close the terminal windows to stop the services.
pause
