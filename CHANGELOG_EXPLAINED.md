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


## 3. Security Hardening of Backend (`security: harden auth, remove backdoors, add rate limiting and image upload validation`)

### What Changed:
1. **Removed Demo Authentication Backdoors**: In `backend/main.py`, deleted the fallback block that permitted arbitrary passwords (`password`, `admin`, `secret123`) to bypass bcrypt verification. All accounts must now verify strictly against their stored bcrypt hash.
2. **Added In-Memory Rate Limiting on Login**: Implemented `_check_login_rate_limit()` preventing brute-force password guessing. If more than 5 failed attempts occur within 60 seconds from an IP/identifier, HTTP 429 (Too Many Requests) is returned.
3. **Image Upload Size & Validation Constraints**: Reduced maximum allowed selfie upload size to 5MB (configurable via `MAX_IMAGE_UPLOAD_BYTES`), preventing memory exhaustion and denial-of-service (DoS) via oversized image uploads.
4. **Tolerance Parameter Alignment**: Updated `routes/attendance.py` check-in and check-out handlers to pass `tolerance=None`, dynamically inheriting `FACE_MATCH_THRESHOLD` from environment configuration.

### Why This Was Done (Interview Answer):
- Hardcoded fallback passwords in authentication routes act like backdoors and will immediately fail any technical screening or security audit.
- Rate limiting on authentication endpoints is standard defense-in-depth against automated brute-force attacks and credential stuffing.
- Enforcing payload size limits on media endpoints protects Python image processing libraries from decompression bombs and Out-Of-Memory (OOM) crashes.

### How It Works:
- Failed login timestamps are stored in memory mapped to `client_ip:identifier`. Old timestamps outside the 60-second sliding window are evicted; if the active count reaches 5, an HTTP 429 exception is raised before checking the database.
- Image decoding strictly checks Base64 headers, byte lengths, and PIL format integrity before passing arrays to OpenCV or face_recognition.


## 4. Tests, Code Quality & Continuous Integration (`test: add edge-case tests, ruff configuration, and CI workflow`)

### What Changed:
1. **Added Comprehensive Edge-Case Test Suite (`tests/test_edge_cases.py`)**:
   - `test_face_mismatch_rejection`: Confirms live face vector far from registered profile produces `is_matched=False`.
   - `test_outside_geofence_rejection`: Confirms coordinates outside the 100m geofence perimeter fail verification.
   - `test_shift_arrival_status_boundary`: Validates strict arrival time boundaries around `09:30` (early vs late).
   - `test_invalid_image_upload_rejected`: Validates corrupt base64 strings return HTTP 400 Bad Request.
   - `test_login_rate_limiting_trigger`: Validates that burst attempts trigger HTTP 429 Too Many Requests.
2. **Added GitHub Actions CI Pipeline (`.github/workflows/ci.yml`)**: Automatically runs on every push and pull request to test Python 3.11 compatibility, install dependencies, run `ruff` linting, and execute the full 35-test pytest suite.
3. **Configured Ruff & Black in `pyproject.toml`**: Established strict modern Python linting standards (PEP 8, import sorting, line length formatting).

### Why This Was Done (Interview Answer):
- Freshers often claim "I wrote tests", but interviewers look for **edge cases** (boundaries, rate limiting, bad inputs).
- A green GitHub Actions badge proves to recruiters that your project builds cleanly and all automated tests pass in an isolated Linux environment without manual intervention.

### How It Works:
- GitHub Actions spins up an Ubuntu runner, checks out the code, provisions Python 3.11, installs requirements, executes `ruff check`, and runs `pytest -v` with environment variables.
