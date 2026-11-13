# AI Smart Attendance & Workforce Management System

[![CI Pipeline](https://github.com/prachizala/AI_Smart_Attendance_System/actions/workflows/ci.yml/badge.svg)](https://github.com/prachizala/AI_Smart_Attendance_System/actions/workflows/ci.yml)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB.svg?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688.svg?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![OpenCV](https://img.shields.io/badge/OpenCV-Biometrics-5C3EE8.svg?style=flat-square&logo=opencv&logoColor=white)](https://opencv.org/)
[![React Native](https://img.shields.io/badge/React_Native-Expo-000020.svg?style=flat-square&logo=expo&logoColor=white)](https://expo.dev/)
[![Tests](https://img.shields.io/badge/Tests-35%20Passing-brightgreen.svg?style=flat-square)](https://github.com/prachizala/AI_Smart_Attendance_System)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

> **Dual-factor biometric attendance and workforce analytics platform combining OpenCV facial verification and Haversine GPS geofencing to prevent proxy check-ins.**

An enterprise-grade, academic attendance and workforce management suite engineered to eliminate buddy-punching, fraudulent attendance logs, and manual timesheet tampering. Built as a BCA 5th Semester Minor Project at Shanti Business School, Ahmedabad.

---

## 🎯 The Problem It Solves

* **Buddy Punching & Proxy Attendance:** Traditional RFID cards, paper registers, and basic mobile apps suffer from proxy check-ins where employees log punches for absent colleagues.
* **Location Fraud:** Workers punch in while stuck in traffic or from remote locations using spoofed GPS coordinates.
* **Our Solution:** A strict, **dual-factor verification pipeline**:
  1. **Haversine Geofencing:** Mathematical verification ensuring the mobile device is physically located within the office's 100m perimeter.
  2. **Biometric Face Verification:** OpenCV and 128-dimensional facial feature matching verifying employee identity before any check-in is registered.

---

## 🚀 Key Features

* 📍 **Haversine GPS Geofencing:** Real-time distance calculation against office coordinates (23.002217, 72.455763) with a 100m boundary tolerance to account for indoor GPS drift.
* 👤 **On-Device Biometric Matching:** OpenCV Haar-Cascade and facial feature vector comparison (Euclidean distance threshold <= 0.50) with lighting normalization.
* 📊 **Admin Analytics Dashboard:** Live tracking of daily check-ins, punctuality scores, tardiness analytics, and department attendance trends.
* 📝 **Leave & Payroll Automation:** Integrated leave application flow with multi-tier approvals and dynamic monthly salary calculation.
* 📶 **Offline-Resilient Punch Queue:** Mobile client securely caches offline attendance punches with cryptographic timestamps and auto-syncs upon reconnecting.
* 🧪 **100% Automated Test Suite:** 35 comprehensive Pytest test cases covering authentication, boundary coordinates, facial edge cases, and role permissions.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend API** | Python 3.11, FastAPI, Pydantic v2, Pydantic-Settings |
| **Computer Vision** | OpenCV (opencv-python-headless), NumPy, PIL |
| **Database & ORM** | SQLite, SQLAlchemy 2.0, Alembic migrations |
| **Security & Auth** | JWT (JSON Web Tokens), Passlib (bcrypt), Argon2 |
| **Mobile Client** | React Native (Expo SDK), React Navigation, Vector Icons |
| **Admin Dashboard** | React 18, Vite, Tailwind CSS, Lucide Icons |
| **Testing & CI/CD** | Pytest (35 tests), TestClient, GitHub Actions |

---

## 🏗️ System Architecture

`
+------------------------------------------------------------------------+
|                          Client Applications                           |
|       +----------------------------+    +-----------------------+      |
|       |   React Native Mobile App  |    |  React Admin Portal   |      |
|       |   (Selfie + GPS Capture)   |    |  (Analytics & Leaves) |      |
|       +----------------------------+    +-----------------------+      |
+------------------------------------------------------------------------+
                                    | (HTTPS / REST)
                                    v
+------------------------------------------------------------------------+
|                           FastAPI Backend                              |
|       +--------------------------------------------------------+       |
|       |                    Security Router                     |       |
|       |        JWT Bearer Auth • Role-Based Access Control     |       |
|       +--------------------------------------------------------+       |
|                     |                                    |             |
|                     v                                    v             |
|       +--------------------------+        +--------------------------+ |
|       |    GeoService Engine     |        |    FaceService Engine    | |
|       |  Haversine Distance (m)  |        |  128-d Feature Matching  | |
|       +--------------------------+        +--------------------------+ |
+------------------------------------------------------------------------+
                                    |
                                    v
+------------------------------------------------------------------------+
|                             Storage Layer                              |
|            +-----------------------------------------------+           |
|            |      SQLite Database (smart_attendance.db)    |           |
|            |      Users • AttendanceLogs • LeaveRequests   |           |
|            +-----------------------------------------------+           |
+------------------------------------------------------------------------+
`

---

## 📂 Project Structure

`
Smart_Attendance/
├── requirements.txt            # Root dependencies pointer
├── pyproject.toml              # Ruff and Pytest tooling config
├── docker-compose.yml          # Multi-container local orchestration
├── backend/                    # Core FastAPI backend service
│   ├── app/
│   │   ├── config.py           # Unified settings and geofence configuration
│   │   ├── database.py         # SQLAlchemy engine and session management
│   │   ├── main.py             # FastAPI entrypoint and router bindings
│   │   ├── api/                # Route handlers (auth, attendance, payroll)
│   │   ├── models/             # Database ORM entities
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── services/           # Business logic (geo, face, payroll)
│   │   └── utils/              # Security and cryptography utilities
│   ├── requirements.txt        # Pinned Python package dependencies
│   ├── seed_demo_data.py       # Realistic 20-employee demonstration seed script
│   └── tests/                  # 35-test Pytest test suite
│       ├── conftest.py         # Isolated test database runner
│       ├── test_attendance_flow.py
│       ├── test_face_service.py
│       ├── test_geo_service.py
│       └── test_security.py
├── admin-dashboard/            # React + Vite web management portal
│   ├── package.json
│   └── src/                    # Dashboard components and views
├── mobile/                     # React Native Expo cross-platform app
│   ├── App.tsx
│   └── package.json
└── docs/                       # Architectural design notes and viva guides
`

---

## 💻 Installation & Run Guide (Tested)

### 1. Prerequisites
* **Python 3.11+** installed
* **Node.js 18+** & npm installed

### 2. Backend Setup
`ash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed demonstration database (20 employees + 1 admin)
python seed_demo_data.py

# Launch FastAPI server
python run_server.py
`
* Backend API documentation available at: http://localhost:8000/docs

### 3. Running Automated Tests (35/35 Passing)
`ash
# Execute Pytest suite
python -m pytest -v
`

### 4. Admin Dashboard Setup
`ash
cd admin-dashboard
npm install
npm run dev
`
* Dashboard live at: http://localhost:5173

### 5. Mobile App Setup
`ash
cd mobile
npm install
npx expo start
`
* Scan the displayed QR code using the **Expo Go** app on Android or iOS.

---

## 📸 Screenshots & Demo

| 📱 Mobile Check-In & Camera | 📍 Geofence Perimeter Map | 📊 Admin Analytics Dashboard |
| :---: | :---: | :---: |
| ![Mobile Check-In](docs/screenshots/02_mobile_checkin.png) | ![Geofence Map](docs/screenshots/03_geofence_map.png) | ![Admin Dashboard](docs/screenshots/01_admin_dashboard.png) |

*(Full HD walkthrough demonstration video available in docs/demo.mp4)*

---

## 🔮 Future Improvements

1. **3D Eye Aspect Ratio (EAR) Liveness Detection:** Implement continuous blink and micro-motion tracking to defend against 2D presentation attacks and video replay.
2. **PostgreSQL Migration:** Transition from SQLite to PostgreSQL with connection pooling for enterprise concurrency (>1,000 simultaneous punches).
3. **Hardware Biometric Integration:** Expand mobile SDK to support native biometric hardware (capacitive fingerprint readers).
4. **Predictive Tardiness Modeling:** Integrate machine learning classification to forecast attendance bottlenecks before peak shifts.

---

## 👩‍💻 Author & Maintainer

**Prachi Zala**  
*BCA Student | Python, Distributed Systems & Applied AI Developer*  
*Shanti Business School, Ahmedabad, Gujarat, India*  

* **LinkedIn:** [linkedin.com/in/prachi-zala-74a08b334](https://www.linkedin.com/in/prachi-zala-74a08b334)  
* **GitHub:** [github.com/prachizala](https://github.com/prachizala)  
* **Portfolio:** [prachizala.github.io/prachi-portfolio](https://prachizala.github.io/prachi-portfolio/)

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
