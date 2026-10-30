# 🚀 AI Smart Attendance System - Teammate Setup Guide

Welcome to the project! This guide contains step-by-step instructions to set up and run the entire project on your local machine.

---

## 📋 System Requirements & Prerequisites

Before starting, make sure you have the following installed on your computer:

1. **Python (3.10 or 3.11 64-bit recommended)**
   - Download: [python.org](https://www.python.org/downloads/)
   - ⚠️ **Important during installation**: Check the box **"Add Python to PATH"**.
2. **Node.js (v18.x or v20.x LTS)** & **npm**
   - Download: [nodejs.org](https://nodejs.org/)
   - Verify in terminal: `node -v` and `npm -v`.
3. **Expo Go Mobile App** (For running the mobile app on a physical phone)
   - Install **Expo Go** from Google Play Store (Android) or Apple App Store (iOS).
   - Alternatively, you can use an Android Studio Emulator.
4. **Local Wi-Fi Network**:
   - Your PC and your mobile phone **must be connected to the exact same Wi-Fi network**.

---

## 🌐 Step 1: Configure Your Local IP Address

Because the mobile app on your phone connects to the backend running on your PC, both devices communicate over your local Wi-Fi IP address.

1. Open Command Prompt or PowerShell and find your local IPv4 address:
   ```cmd
   ipconfig
   ```
   Look for **IPv4 Address** under your active Wi-Fi connection (for example: `192.168.1.15`).

2. Update the `.env` files with your IPv4 address:
   - **`admin-dashboard/.env`**:
     ```env
     VITE_API_URL=http://<YOUR_LOCAL_IP>:8000
     VITE_API_BASE_URL=http://<YOUR_LOCAL_IP>:8000
     ```
     *(Example: `http://192.168.1.15:8000` or `http://localhost:8000` if only testing in PC browser)*
   
   - **`mobile/.env`**:
     ```env
     EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:8000
     ```
     *(Example: `http://192.168.1.15:8000` - must be your Wi-Fi IP so the physical phone can reach your computer)*

---

## 🐍 Step 2: Backend Setup (FastAPI + OpenCV)

1. Open a terminal and navigate to the `backend` folder:
   ```cmd
   cd backend
   ```

2. Create a Python virtual environment:
   ```cmd
   python -m venv venv
   ```

3. Activate the virtual environment:
   - **On Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
     *(If you get a script execution policy error, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` then retry)*
   - **On Windows (CMD)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   - **On macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```

4. Install Python dependencies:
   ```cmd
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. (Optional) Initialize / Seed Demo Database:
   The pre-populated database `backend/smart_attendance.db` is already included. If you ever want to reset it with fresh demo users and face data, run:
   ```cmd
   python seed_demo_data.py
   ```

6. Start the Backend Server:
   ```cmd
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   - API Status: `http://localhost:8000/`
   - Interactive Swagger API Docs: `http://localhost:8000/docs`

---

## 💻 Step 3: Admin Web Dashboard Setup (React + Vite)

1. Open a **new** terminal window and navigate to `admin-dashboard`:
   ```cmd
   cd admin-dashboard
   ```

2. Install dependencies:
   ```cmd
   npm install
   ```

3. Start the Vite development server:
   ```cmd
   npm run dev
   ```

4. Open your browser:
   - Navigate to: `http://localhost:3000` (or `http://<YOUR_LOCAL_IP>:3000`)
   - **Default Admin Credentials**:
     - **Username**: `ADMIN01`
     - **Password**: `admin123`

---

## 📱 Step 4: Mobile App Setup (React Native + Expo)

1. Open a **third** terminal window and navigate to `mobile`:
   ```cmd
   cd mobile
   ```

2. Install dependencies:
   ```cmd
   npm install
   ```

3. Start the Expo server:
   ```cmd
   npx expo start
   ```

4. Open the App:
   - **Physical Android Phone**: Open **Expo Go** and scan the QR code displayed in the terminal.
   - **Physical iPhone**: Open Camera app, scan QR code, and tap open in Expo Go.
   - **Android Emulator**: Press `a` in the terminal with an active Android emulator running.
   - **Web Browser Preview**: Press `w` in the terminal.

5. **Default Employee Credentials**:
   - **Username**: `EMP001`
   - **Password**: `secret123`
   - *(Other accounts: `EMP002` to `EMP005`, password: `secret123`)*

6. **GPS / Location Viva Demo**:
   - In the mobile login/camera screen, you can use the built-in **Viva GPS Simulator** to toggle between **Inside Campus (SBS Shela: 23.0022, 72.4557)** and **Outside Campus** to test geofence enforcement without physically traveling!

---

## ⚡ 1-Click Master Launch (Windows)

Once you have completed `pip install` and `npm install` for all folders above:
You can start all three tiers simultaneously at any time by double-clicking:
```cmd
start_all.bat
```
*(Or run `.\start_all.bat` from terminal. Note: you can edit line 7 in `start_all.bat` with your local IP for the display banner).*

---

## 🧪 Running Automated Tests

To verify backend endpoints, geofencing logic, face verification, and payroll calculations:
```cmd
.\run_tests.bat
```
Or directly within the backend directory:
```powershell
cd backend
.\venv\Scripts\activate
pytest -v tests
```

---

## ❓ Troubleshooting & Common Pitfalls

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **Mobile app shows "Network Error"** | Phone cannot reach PC's port 8000 | 1. Ensure phone & PC are on the same Wi-Fi.<br>2. Double-check `mobile/.env` has your current Wi-Fi IP (from `ipconfig`).<br>3. Check Windows Firewall: allow port 8000 or temporarily permit Python through private network. |
| **PowerShell script execution disabled** | Windows security policy blocks `Activate.ps1` | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in PowerShell before activating. |
| **`npm install` dependency conflict** | Differing npm engine/peer versions | Run `npm install --legacy-peer-deps`. |
| **Camera not working in mobile app** | Permissions denied | Grant Camera and Location permissions when prompted by Expo Go on your device. |
| **Duplicate check-in error (HTTP 409)** | System enforces one check-in per day rule | This is an intended feature! You can test with another user (`EMP002`, `EMP003`) or clear today's records in the Admin Dashboard. |

---

Happy Coding! For any questions regarding system architecture or viva questions, refer to `VIVA_AND_TESTING_GUIDE.md` and `README.md`.
