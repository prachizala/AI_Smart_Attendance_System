# AI Smart Attendance & Workforce Management System

An enterprise-grade, dual-factor biometric and geolocation attendance management platform engineered for academic research, College Minor Project BCA (Bachelor of Computer Applications), and workforce operations.

> [!TIP]
> **New to this project or setting it up for the first time?**
> Please refer to the step-by-step setup guide: **[`README_SETUP.md`](file:///c:/Users/prachi/OneDrive/Desktop/Smart_Attendance/README_SETUP.md)** for quick installation of Python dependencies, npm packages, IP configuration, and running the project.

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
| **Biometric AI** | **OpenCV + face_recognition (128-D Embeddings)** | Fast, local, offline facial detection with auto-downscaling (1280px Lanczos) and EXIF orientation correction. |
| **Mobile Application** | **React Native (Expo)** | Cross-platform Android client with dark/light themes, trilingual support (EN, HI, GU), full-screen camera viewfinder (`expo-camera`), and geofencing (`expo-location`). |
| **Admin Web Portal** | **React.js (Vite) + TailwindCSS** | Instant HMR, responsive sidebar/topbar layout, Recharts weekly analytics, dark/light mode toggle, and trilingual support. |

---

## 4. Key Features & Recent Modernizations

### 🌓 Dark & Light Mode Support
- **Admin Dashboard**: Tailwind CSS `darkMode: 'class'` powered by `ThemeContext` with animated Sun/Moon toggle in navbar and login page. Remembers user preference in `localStorage`.
- **Mobile Client**: Dual centralized palette (`lightColors` & `darkColors`) in `mobile/src/theme/colors.js`. Automatically synchronizes status bar, navigation theme, and card surfaces via `ThemeContext` and `expo-secure-store`.

### 🌐 Trilingual Support (English, Hindi, Gujarati)
- Built-in multi-language toggle across both Web Dashboard and Mobile App.
- **English** (default international standard), **Hindi** (हिन्दी), and **Gujarati** (ગુજરાતી) supported across all screens, buttons, alerts, and badges.
- Technical/backend jargon removed from user-facing screens for clean, intuitive attendance marking.

### 📸 Full-Screen Immersive Camera & Biometric ScanFace
- **Full-Screen Viewfinder**: Centered oval reticle guide with smooth flip camera support (`front` / `back`).
- **Gallery & Photo Upload Fallback**: Integrated `expo-image-picker` allowing employees and emulator testers to upload a selfie photo directly from the device gallery or files if the camera preview is unavailable.
- **Hardware Resource Optimization**: Viewfinders mount strictly when active and unmount on dismissal to prevent Android CameraX hardware locking.
- **Auto-Downscaling & EXIF Normalization**: Backend automatically resizes oversized mobile camera photos (>1280px) down using Lanczos resampling and auto-corrects orientation before computing 128-D vectors.
- **Updated Brand Identity**: Replaced generic shield icons with a dedicated facial biometric `ScanFace` brand mark across mobile headers and web sidebar.

### 👆 Device Fingerprint & Biometric Authentication
- **1-Touch Biometric Sign-In**: Native hardware fingerprint and Touch ID authentication via `expo-local-authentication` with encrypted credential fallback.
- **Dedicated Fingerprint Attendance Punch**: Employees can punch in rapidly with one touch using their phone's native fingerprint scanner (`/api/attendance/biometric-punch`).
- **Strict Geofence Enforcement**: Fingerprint punches are gated by the 100m office perimeter GPS rule to prevent remote buddy punching.
- **Admin Telemetry & Badges**: Attendance logs distinguish between `👆 Fingerprint` and `📸 128-D Match` verification methods across tables and reports.

### 🛡️ Real-Time Liveness Detection (Anti-Spoofing)
- Dynamic blink challenge in camera viewfinder to defend against photograph and screen playback presentation attacks.
- Glowing emerald confirmation reticle (`Live Presence Verified ✓`) upon detecting real human interaction.

### 🖼️ Attendance Photo Watermark Stamp (Proof of Presence)
- Automatic cryptographic watermark burned onto verified punch photos:
  `PROOF OF PRESENCE | ID: EMP001 | SBS Campus | YYYY-MM-DD HH:MM:SS | GPS: 23.0022, 72.4557 | VERIFIED ✓`
- Stored on the server as tamper-evident audit evidence.

### 📶 Offline Punch Queue & Auto-Sync
- If an employee checks in with poor network or inside a basement, the attendance record is safely encrypted and queued locally on the device (`expo-secure-store`).
- An amber **Unsynced Punches** chip appears on the dashboard with 1-click **Sync Now**, which synchronizes the punch along with its original offline timestamp once connected.

### 🔔 Real-Time In-App Notifications & Alerts
- **Admin Dashboard**: Real-time notifications bell in top bar showing live check-ins, biometric enrollments, and pending leave counts with unread badges.
- **Mobile Client**: Header notifications bell with quick system status cards, face verification alerts, and offline punch health.

### 🗺️ Live Geofence Radar Telemetry Map
- Interactive visual map in the Admin Dashboard with animated radar pulse sweep and 100m geofence perimeter circle.
- Plots verified employee punch locations with distance in meters from the office center (SBS Campus, Ahmedabad) and interactive detail popups.

### ⏱️ Live Workday Shift Progress & Overtime Tracker
- Visual progress bar on the mobile dashboard tracking active shift completion against the 8-hour workday standard.
- Real-time hours and minutes counter with dynamic progress percentage and automatic overtime detection (`+Xh Ym`).

### 🤖 Multilingual AI Attendance & Workforce Assistant Chatbot
- **Interactive Conversational AI**: Dedicated AI assistant accessible across both mobile and admin web dashboards.
- **Natural Language Query Engine**:
  - *"What is my attendance status today?"* ➡️ Instant check-in/out time and verification badge.
  - *"How many leaves do I have left?"* ➡️ Real-time calculation of remaining casual and sick leaves.
  - *"What is my punctuality trust score?"* ➡️ Dynamic 300–900 credit-style score based on on-time arrival streak.
  - *"What are the office shift rules?"* ➡️ Shift hours (09:30 AM – 05:30 PM), 100m geofence rules, and grace periods.
  - Admin queries: *"Today's attendance count"*, *"Who is late today?"*.
- **Trilingual Fluency**: Speaks and understands **English**, **Hindi** (हिन्दी), and **Gujarati** (ગુજરાતી) with 1-tap quick suggestion chips.
- **Zero-Friction UI**: Floating launcher bubble with animated Bot and Sparkles badge on both mobile client and admin web portal.

### 🔒 Modern UI & Security Components
- **Password Visibility Toggle**: Custom `PasswordInput` with eye icon across web and mobile.
- **User-Friendly Error Handling**: Instant popup dialogs and banners for invalid credentials or geofence breaches instead of infinite loading spinners.
- **Interactive Analytics**: Integrated `Recharts` weekly attendance trend charts and real-time status counters.

---

## 5. Windows Quick Start & Running the Project

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

## 6. Viva Presentation & Testing Guide
For college viva presentation preparation, examiners' Q&A, and live demo scripting, refer to:
- 📖 [`VIVA_AND_TESTING_GUIDE.md`](./VIVA_AND_TESTING_GUIDE.md) — Includes:
  1. Exact coordinate mocks & edge case testing steps (Face mismatch, GPS breach, Duplicate punch).
  2. 3-Minute examiner pitch script.
  3. Top 20 Viva Voce questions with high-impact 2-sentence answers.

---

## 7. Security & Academic Integrity Disclosures

1. **Biometric Privacy**: Face representations are stored as mathematical 128-dimensional vectors rather than storing raw biometric credentials unencrypted.
2. **2D vs 3D Liveness Note**: The MVP leverages 2D computer vision. In project viva presentations, students candidly identify that advanced production deployments utilize 3D infrared depth mapping or active blink challenge-response to prevent high-resolution photograph presentation attacks.
3. **GPS Tolerance**: A 100m geofence buffer is intentionally configured to accommodate urban GPS multipath drift and indoor signal attenuation.
