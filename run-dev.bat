@echo off
echo ========================================================
echo           Starting SmartHire AI Application
echo ========================================================
echo.
echo [1/2] Launching Backend on http://localhost:8000 ...
start "SmartHire AI - Backend (FastAPI)" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo [2/2] Launching Frontend on http://localhost:5173 ...
start "SmartHire AI - Frontend (Vite)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both services have been started in separate terminal windows.
echo - Backend API Docs: http://127.0.0.1:8000/docs
echo - Frontend Web App: http://localhost:5173
echo.
pause
