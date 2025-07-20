@echo off

REM SmartBag - FastAPI Backend Startup Script (Windows)

echo 🚀 Starting SmartBag Backend...

REM Check if virtual environment exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/update dependencies
echo 📥 Installing dependencies...
pip install -r requirements.txt

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  .env file not found. Creating default .env file...
    (
        echo MONGO_URI=mongodb://localhost:27017/blinkit_clone
        echo JWT_SECRET_KEY=your-secret-key-change-this-in-production
        echo JWT_ALGORITHM=HS256
        echo ACCESS_TOKEN_EXPIRE_MINUTES=30
        echo OLA_KRUTRIM_API_KEY=your-ola-krutrim-api-key
        echo PORT=3001
        echo ENVIRONMENT=development
    ) > .env
    echo 📝 Please update the .env file with your actual configuration values.
)

REM Create uploads directory if it doesn't exist
if not exist "uploads" mkdir uploads

REM Start the server
REM echo 🌐 Starting FastAPI server on http://localhost:3001
REM echo 📚 API Documentation will be available at http://localhost:3001/docs
REM echo 🔍 ReDoc Documentation will be available at http://localhost:3001/redoc
REM echo.
REM echo Press Ctrl+C to stop the server
REM echo.

uvicorn main:app --host 0.0.0.0 --port 3001 --reload

pause 