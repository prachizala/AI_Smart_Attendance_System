# Changelog Explained — AI Smart Attendance System

This document explains every major change made to this repository in simple, plain English. If an interviewer asks: *"Why did you make this change and how does it work?"*, the answers are right here.

---

## 1. Security & Repository Clean-up (`security: remove hardcoded secrets, untrack venv and env files`)

### What Changed:
1. **Untracked `backend/venv` and `.env` files**: Stopped Git from tracking virtual environments, local `.env` files, and compiled Python bytecode (`__pycache__`, `.pyc`).
2. **Updated `.gitignore`**: Added strict ignore rules for `.env`, `*.env`, `venv/`, `__pycache__/`, `.expo/`, and build artifacts.
3. **Created `.env.example` templates**:
   - `backend/.env.example`: Provides clear placeholders for `SECRET_KEY`, `DATABASE_URL`, `OFFICE_LAT`, `OFFICE_LNG`, `GEOFENCE_RADIUS_M`, `SHIFT_START`, `FACE_MATCH_THRESHOLD`, and `CORS_ORIGINS`.
   - `admin-dashboard/.env.example`: Provides `VITE_API_URL` and `VITE_API_BASE_URL`.
   - `mobile/.env.example`: Provides `EXPO_PUBLIC_API_URL`.
4. **Removed Hardcoded Private Network IPs**: Replaced fixed IPs (`192.168.1.2`, `172.16.4.26`, `10.115.36.66`) with dynamic environment variable `CORS_ORIGINS` / `ALLOWED_ORIGINS` with safe `localhost` fallbacks.
5. **Configurable Demo Seed Passwords**: In `backend/main.py` and `backend/scripts/seed_demo_data.py`, replaced hardcoded plaintext passwords (`admin123`, `secret123`) with environment variables `DEMO_ADMIN_PASSWORD` and `DEMO_EMP_PASSWORD`.

### Why This Was Done (Interview Answer):
- In professional software engineering, **never commit secrets, live environment files, or virtual environments to version control**.
- Hardcoded IP addresses break when running on different machines or Wi-Fi networks.
- Providing `.env.example` files allows any developer or evaluator to clone the repository, copy `.env.example` to `.env`, and run the project immediately without guessing required variables.

### How It Works:
- Python's `os.getenv("VARIABLE_NAME", "default_value")` checks if an environment variable is set. If not, it falls back to a safe default for local development.
- Git's `git rm --cached` removes files from tracking while keeping the actual files untouched on your local disk.


## 2. Configurable Business Rules (`feat: make geofence, shift, and face threshold configurable`)

### What Changed:
1. **Configurable Geofence**: `OFFICE_LAT`, `OFFICE_LNG`, and `GEOFENCE_RADIUS_M` can now be set directly via `.env` in `services/geo_service.py`.
2. **Configurable Shift Arrival Time**: Shift threshold is now read from `SHIFT_START` or `OFFICE_START_TIME` (default `09:30`) in `routes/attendance.py`.
3. **Configurable Face Match Tolerance**: Face comparison tolerance in `services/face_service.py` is read from `FACE_MATCH_THRESHOLD` (default `0.50`).
4. **Created Configuration Documentation**: Detailed documentation in `docs/CONFIGURATION.md` explaining the meaning and impact of every variable.

### Why This Was Done (Interview Answer):
- Hardcoded coordinates or timing thresholds make code brittle and unmaintainable across multiple offices, test locations, or shifts.
- Making business rules environment-driven follows the **Twelve-Factor App** methodology and allows operations or HR rules to change without recompiling or redeploying code.

### How It Works:
- Each service uses `os.getenv("VAR_NAME", default)` to read configurations, falling back to safe local testing defaults if the environment variable is not defined.
