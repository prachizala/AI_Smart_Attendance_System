@echo off
title AI Smart Attendance - Test Suite Runner
echo ==============================================================================
echo        AI Smart Attendance & Workforce Management System - Test Suite
echo ==============================================================================
echo.
cd /d %~dp0backend
call .\venv\Scripts\activate.bat
echo Running Pytest Suite with full verbose output...
echo.
pytest -v tests
echo.
echo ==============================================================================
pause
