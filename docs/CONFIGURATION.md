# Configuration Guide — AI Smart Attendance System

This document explains all environment variables and business rules supported by the system.

---

## 1. Environment Variables Overview

All settings can be configured in `backend/.env`. A template is provided in `backend/.env.example`.

| Variable | Default Value | Description | Impact on Business Logic |
| :--- | :--- | :--- | :--- |
| `SECRET_KEY` | *(Must be configured)* | Cryptographic HMAC secret key used for signing JSON Web Tokens (JWT). | If leaked, unauthorized actors could forge valid authentication tokens. Must be a cryptographically random string (e.g., `openssl rand -hex 32`). |
| `ALGORITHM` | `HS256` | Symmetric signature algorithm for JWT. | Specifies standard HMAC-SHA256 token encoding. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` (24 hours) | Token lifespan before requiring re-login. | Balances user convenience on mobile with security token lifetimes. |
| `DATABASE_URL` | `sqlite:///./smart_attendance.db` | SQLAlchemy connection string. | Defaults to local SQLite for development and minor project presentations; can be swapped to PostgreSQL (`postgresql://user:pass@host/db`) for production without changing application code. |
| `OFFICE_LAT` / `OFFICE_LATITUDE` | `23.002217` | Latitude coordinate of workplace center point. | Used by the Haversine formula to verify if the employee is physically present on premises. |
| `OFFICE_LNG` / `OFFICE_LONGITUDE` | `72.455763` | Longitude coordinate of workplace center point. | Paired with latitude for radial distance computation. |
| `GEOFENCE_RADIUS_M` / `ALLOWED_RADIUS_METERS` | `100.0` (meters) | Radial distance threshold in meters. | Allows 100 meters radius around coordinates to accommodate indoor GPS drift and multi-floor campus layouts. Punches beyond this distance are rejected with HTTP 403. |
| `SHIFT_START` / `OFFICE_START_TIME` | `09:30` | Expected arrival time (HH:MM format). | Punches verified after this time are marked as `"late"`; punches at or before are marked as `"present"`. |
| `OFFICE_END_TIME` | `18:00` | Standard shift departure time. | Used in payroll and work hour duration tracking. |
| `FACE_MATCH_THRESHOLD` | `0.50` | Euclidean distance tolerance for face encodings. | Distance between 128-dimensional face embeddings. Lower values (e.g. `0.40`) reduce False Accept Rate (FAR) but increase False Reject Rate (FRR); higher values (e.g. `0.65`) allow more lighting tolerance. |
| `CORS_ORIGINS` / `ALLOWED_ORIGINS` | *(localhost list)* | Comma-separated list of allowed HTTP origins. | Protects the API against unauthorized Cross-Origin requests. |
| `DEMO_ADMIN_PASSWORD` | `AdminDemoPass@2026` | Seed password for default admin account. | Used exclusively by database seeding scripts (`backend/scripts/seed_demo_data.py`). Never used in production. |
| `DEMO_EMP_PASSWORD` | `EmpDemoPass@2026` | Seed password for default employee accounts. | Used exclusively by database seeding scripts. |

---

## 2. Admin Dashboard Configuration (`admin-dashboard/.env`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://localhost:8000` | The backend API base URL consumed by Axios in the web dashboard. |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Fallback alias for backend API routing. |

---

## 3. Mobile App Configuration (`mobile/.env`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `EXPO_PUBLIC_API_URL` | `http://localhost:8000` | The backend API endpoint for Expo / React Native. For physical device testing, set to your computer's local Wi-Fi IP (e.g., `http://192.168.1.X:8000`). |
