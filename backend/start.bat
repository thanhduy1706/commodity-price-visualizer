@echo off
echo ============================================
echo  LME Data API - Python Backend
echo ============================================
echo.

REM Check if port 8000 is in use
echo Checking port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo Port 8000 is in use by PID %%a - Killing it...
    taskkill /PID %%a /F >nul 2>&1
    timeout /t 2 /nobreak >nul
)

echo Installing dependencies...
python -m pip install -r requirements.txt --quiet >nul 2>&1

echo.
echo Starting Python backend on http://localhost:8000...
echo.

python main.py
