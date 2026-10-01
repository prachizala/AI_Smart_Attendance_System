# AI Smart Attendance & Workforce Management System

An enterprise-grade, dual-factor biometric and geolocation attendance management platform engineered for academic research, College Minor Project BCA (Bachelor of Computer Applications), and workforce operations.

---

## 1. Architectural Blueprint & Domain Separation

The system enforces strict separation of concerns across three decoupled domains:

```
Smart_Attendance/
├── backend/                  # Domain 1: Core REST API, AI Vision & Business Logic (FastAPI + Python)
│   ├── app/
│   │   ├── api/              # Route endpoints (Auth, Attendance, Leaves, Payroll, Easter Egg)
│   │   ├── models/           # Relational ORM models (SQLAlchemy)
│   │   ├── schemas/          # Pydantic contract validation
│   │   ├── services/         # Algorithmic services (OpenCV face matching, Haversine geofence)
│   │   └── utils/            # JWT token creation, bcrypt password hashing
│   ├── tests/                # Automated pytest suite
│   ├── requirements.txt      # Python dependencies
│   ├── .env                  # Environment & Geofence coordinates
│   └── venv/                 # Isolated Python 3.11 virtual environment
│
├── mobile/                   # Domain 2: Employee Field Client (React Native + Expo)
│   ├── src/
│   │   ├── api/              # Axios HTTP client with Bearer token interceptor
│   │   ├── context/          # Global Auth & Session state
│   │   ├── screens/          # Login, Live Camera Check-In, Logs, Leave Application
│   │   └── components/       # Camera viewfinder, GPS radius indicator
│   └── package.json          # Mobile client dependencies
│
└── admin-dashboard/          # Domain 3: Management & Analytics Portal (React.js + Vite)
    ├── src/
    │   ├── pages/            # Live Attendance Dashboard, Employee Registry, Leave Approvals, Payroll
    │   ├── components/       # Data tables, Status badges, Geofence configuration map
    │   └── services/         # Admin API service bindings
    └── package.json          # Web dashboard dependencies
```

---

## 2. Core Verification Engine (Data Flow)

The attendance verification protocol mandates a strict **Dual-Factor Gate**:

```
                       [ Employee Mobile App ]
                                 │
           1. Capture Live Camera Selfie + Device GPS Coordinates (Lat, Lng)
                                 │
                                 ▼
       POST /api/attendance/check-in (Authorization: Bearer <JWT>)
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
         [ 1. Geofence Check ]      [ 2. Biometric Check ]
         Haversine Distance Calc    OpenCV Face Detection
                    │                         │
         d <= Allowed Radius (100m)   Feature Distance <= Threshold (0.65)
                    │                         │
                    └────────────┬────────────┘
                                 ▼
                     [ 3. Anti-Duplicate Check ]
                     No prior check-in for today
                                 │
                    ┌────────────┴────────────┐
                    │  All Checks Passed      │
                    ▼                         ▼
        [ Save Attendance in DB ]    [ Live Webhook / Polling ]
        Status: PRESENT or LATE      Admin Dashboard updates counters
```

### Verification Flow Details
1. **WHERE Check (GPS Geofence)**:
   - Uses the **Haversine formula** to measure geodesic distance between device coordinates $(\phi_1, \lambda_1)$ and office coordinates $(\phi_2, \lambda_2)$.
   - Rejects immediately if distance $> 100\text{ meters}$.
2. **WHO Check (Biometric Face Verification)**:
   - OpenCV detects the facial region, aligns it, and computes a feature representation vector.
   - Measures Euclidean / Cosine similarity against the employee's registered reference vector ($1\text{-to-}1$ verification).
   - Rejects if confidence is below threshold.
3. **Anti-Duplicate Rule**:
   - Rejects duplicate check-ins on the same calendar day with HTTP 409 Conflict.
   - Records punch time, assigns status (`PRESENT` if $\le$ 09:30 AM, `LATE` if $>$ 09:30 AM).

---

## 3. Technology Stack Matrix

| Domain | Technology | Justification |
| :--- | :--- | :--- |
| **Backend Framework** | **FastAPI (Python 3.11)** | High-performance asynchronous execution, automatic OpenAPI/Swagger documentation, native Pydantic validation. |
| **Database & ORM** | **SQLite + SQLAlchemy 2.0** | Zero-configuration local database for student demo; seamless future migration to PostgreSQL via connection string change. |
| **Biometric AI** | **OpenCV (`opencv-python`)** | Fast, local, offline facial detection and feature vector comparison without heavy external cloud API dependencies. |
| **Mobile Application** | **React Native (Expo)** | Cross-platform Android support, native camera (`expo-camera`) and geolocation (`expo-location`) access. |
| **Admin Web Portal** | **React.js (Vite)** | Instant HMR, lightweight bundle size, responsive real-time management dashboard. |

---

## 4. Windows Quick Start & Running the Project

### ⚡ 1-Click Master Launch (Recommended)
Simply double-click `start_all.bat` in the project root, or execute:
```cmd
start_all.bat
```
This automatically launches the FastAPI Backend (`http://192.168.1.2:8000`), Admin Dashboard (`http://192.168.1.2:3000`), and Mobile Client (Expo Dev Server) in three separate windows.

---

### Manual Step-by-Step Initialization

#### 1. Backend (FastAPI + OpenCV + Geofencing)
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
- Swagger API Docs: `http://192.168.1.2:8000/docs` (or `http://localhost:8000/docs`)

#### 2. Admin Web Dashboard (React Vite)
```powershell
cd admin-dashboard
npm run dev
```
- Web Portal: `http://192.168.1.2:3000` (or `http://localhost:3000`)
- Default Admin Credentials: `ADMIN01` / `admin123`

#### 3. Mobile App (Expo React Native)
```powershell
cd mobile
npx expo start
```
- Scan QR code via Expo Go app on physical Android phone, or run in Android Emulator (`a`).
- Default Employee Credentials: `EMP001` / `secret123`
- Includes built-in **Viva Demo GPS Simulator** to simulate Inside (`23.002220, 72.455770`) vs. Outside (`23.020000, 72.490000`).

---

### 🧪 Automated Testing Suite
Run the 19 automated test cases covering full face verification, Haversine perimeter calculations, attendance lifecycle, and payroll math:
```powershell
.\run_tests.bat
# or
cd backend; .\venv\Scripts\pytest -v tests
```

---

## 5. Viva Presentation & Testing Guide
For college viva presentation preparation, examiners' Q&A, and live demo scripting, refer to:
- 📖 [`VIVA_AND_TESTING_GUIDE.md`](./VIVA_AND_TESTING_GUIDE.md) — Includes:
  1. Exact coordinate mocks & edge case testing steps (Face mismatch, GPS breach, Duplicate punch).
  2. 3-Minute examiner pitch script.
  3. Top 20 Viva Voce questions with high-impact 2-sentence answers.

---

## 6. Security & Academic Integrity Disclosures

1. **Biometric Privacy**: Face representations are stored as mathematical 128-dimensional vectors rather than storing raw biometric credentials unencrypted.
2. **2D vs 3D Liveness Note**: The MVP leverages 2D computer vision. In project viva presentations, students candidly identify that advanced production deployments utilize 3D infrared depth mapping or active blink challenge-response to prevent high-resolution photograph presentation attacks.
3. **GPS Tolerance**: A 100m geofence buffer is intentionally configured to accommodate urban GPS multipath drift and indoor signal attenuation.
