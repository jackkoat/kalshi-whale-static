@echo off
echo 🐋 Starting KalshiWhale Backend...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8+ to continue.
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo ⚙️ Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo 📚 Installing dependencies...
pip install -r requirements.txt

REM Set environment variables if .env exists
if exist ".env" (
    echo ⚙️ Loading environment configuration...
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if not "%%a"=="#" (
            set %%a=%%b
        )
    )
)

REM Start the server
echo 🚀 Starting server...
echo 🌍 API will be available at: http://localhost:%PORT%:8000
echo 📡 WebSocket endpoint: ws://localhost:%PORT%:8000/ws
echo ⚡ API endpoints: http://localhost:%PORT%:8000/api
echo.
echo Press Ctrl+C to stop the server
pause

python main.py