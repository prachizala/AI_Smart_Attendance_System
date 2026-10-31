@echo off
title AI Smart Attendance - Master Launcher
setlocal enabledelayedexpansion

echo ==============================================================================
echo        AI Smart Attendance & Workforce Management System - Launcher
echo ==============================================================================
echo.

:: Detect current local IPv4
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set "RAW_IP=%%a"
    set "CLEAN_IP=!RAW_IP: =!"
    if "!CLEAN_IP:~0,4!"=="192." set "LOCAL_IP=!CLEAN_IP!"
)
if "%LOCAL_IP%"=="" set "LOCAL_IP=192.168.1.3"

echo Detected Local Wi-Fi IPv4: %LOCAL_IP%
echo.
echo Starting all 3 tiers in dedicated command windows:
echo   1. Backend API (FastAPI):        http://%LOCAL_IP%:8000 (Swagger: /docs)
echo   2. Admin Dashboard (React Vite): http://%LOCAL_IP%:3000 (or http://localhost:3000)
echo   3. Mobile App (Expo Metro):      exp://%LOCAL_IP%:8081
echo.
echo ==============================================================================

:: 1. Start Backend Server
echo [1/3] Launching FastAPI Backend on http://0.0.0.0:8000 ...
start "Backend - FastAPI (Port 8000)" cmd /k "cd /d %~dp0backend && .\venv\Scripts\uvicorn.exe main:app --reload --host 0.0.0.0 --port 8000"

:: Wait 2 seconds
ping 127.0.0.1 -n 3 > nul

:: 2. Start Admin Dashboard
echo [2/3] Launching Vite Admin Dashboard on http://localhost:3000 ...
start "Admin Dashboard - React Vite (Port 3000)" cmd /k "cd /d %~dp0admin-dashboard && npm run dev"

:: Wait 2 seconds
ping 127.0.0.1 -n 3 > nul

:: 3. Start Expo Mobile Client
echo [3/3] Launching Expo React Native Mobile Client ...
start "Mobile Client - Expo Dev Server" cmd /k "cd /d %~dp0mobile && npx expo start"

echo.
echo ==============================================================================
echo All 3 tiers are launching in their own terminal windows!
echo.
echo Access URLs:
echo   - Backend Swagger Docs:   http://%LOCAL_IP%:8000/docs
echo   - Admin Web Dashboard:    http://localhost:3000 (or http://%LOCAL_IP%:3000)
echo   - Mobile App (Expo Go):   Scan QR code from terminal or open exp://%LOCAL_IP%:8081
echo.
echo To stop any tier, close its corresponding terminal window.
echo ==============================================================================
