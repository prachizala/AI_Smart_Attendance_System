@echo off
title AI Smart Attendance - Master Launcher
echo ==============================================================================
echo        AI Smart Attendance & Workforce Management System - Launcher
echo ==============================================================================
echo.
echo Your Local Wi-Fi IPv4: 192.168.1.2
echo.
echo Starting 3 tiers in dedicated command windows:
echo   1. Backend API (FastAPI):        http://192.168.1.2:8000 (bind: 0.0.0.0:8000)
echo   2. Admin Dashboard (React Vite): http://192.168.1.2:3000
echo   3. Mobile App (Expo Metro):      exp://192.168.1.2:8081
echo.
echo ==============================================================================

:: 1. Start Backend Server
echo [1/3] Launching FastAPI Backend on http://0.0.0.0:8000 ...
start "Backend - FastAPI (Port 8000)" cmd /k "cd /d %~dp0backend && .\venv\Scripts\activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: Wait 2 seconds
timeout /t 2 /nobreak > nul

:: 2. Start Admin Dashboard
echo [2/3] Launching Vite Admin Dashboard on http://192.168.1.2:3000 ...
start "Admin Dashboard - React Vite (Port 3000)" cmd /k "cd /d %~dp0admin-dashboard && npm run dev"

:: Wait 2 seconds
timeout /t 2 /nobreak > nul

:: 3. Start Expo Mobile Client
echo [3/3] Launching Expo React Native Mobile Client ...
start "Mobile Client - Expo Dev Server" cmd /k "cd /d %~dp0mobile && npx expo start"

echo.
echo ==============================================================================
echo All 3 tiers have been launched!
echo.
echo Browser & Mobile Access Links:
echo   - Backend Swagger Docs:   http://192.168.1.2:8000/docs
echo   - Admin Web Dashboard:    http://192.168.1.2:3000 (or http://localhost:3000)
echo   - Mobile App (Expo Go):   Scan QR code from terminal or open exp://192.168.1.2:8081
echo.
echo To stop the servers, simply close their respective terminal windows.
echo ==============================================================================
pause
