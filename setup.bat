@echo off
echo =============================================
echo   TrueLens - Setup Script
echo =============================================
echo.

echo [1/5] Creating Python virtual environment...
cd backend
python -m venv venv
call venv\Scripts\activate.bat

echo [2/5] Installing Python dependencies...
pip install -r requirements.txt

echo [3/5] Running database migrations...
python manage.py makemigrations
python manage.py migrate

echo [4/5] Installing frontend dependencies...
cd ..\frontend
call npm install

echo [5/5] Done!
echo.
echo =============================================
echo   HOW TO RUN:
echo =============================================
echo.
echo  Terminal 1 - Backend:
echo    cd backend
echo    venv\Scripts\activate
echo    python manage.py runserver
echo.
echo  Terminal 2 - Frontend:
echo    cd frontend
echo    npm run dev
echo.
echo  Then open: http://localhost:5173
echo.
echo  Make sure Ollama is running with:
echo    ollama serve
echo    ollama pull mistral
echo    ollama pull llava
echo =============================================
pause
