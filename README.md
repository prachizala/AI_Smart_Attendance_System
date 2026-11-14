# AI Smart Attendance & Workforce Management System 📍👤

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Streamlit](https://img.shields.io/badge/UI-Streamlit-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white)](https://streamlit.io/)
[![OpenCV](https://img.shields.io/badge/Vision-OpenCV-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white)](https://opencv.org/)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Tests Passing](https://img.shields.io/badge/Tests-7%20Passing-10B981?style=for-the-badge&logo=pytest&logoColor=white)](tests/)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)

> **Dual-factor biometric attendance and workforce analytics platform combining OpenCV facial verification and Haversine GPS geofencing to prevent proxy attendance and timesheet tampering.**

---

## 🎯 The Problem It Solves

* **Buddy-Punching & Proxy Attendance:** Conventional RFID punch cards, paper attendance registers, and simple mobile apps suffer from proxy check-ins where colleagues log entries on behalf of absent peers.
* **GPS Spoofing & Remote Check-ins:** Workers punch in while commuting or from home using mock location apps or false GPS coordinates.
* **Our Dual-Factor Solution:**
  1. **Haversine Geofencing:** Mathematical validation ensuring the punch device is physically located within the authorized office perimeter (default: 100 meters).
  2. **Biometric Face Verification:** OpenCV normalized facial feature extraction and Euclidean distance thresholding verifying employee presence before logging attendance.

---

## 📸 Architecture & Workflow

```
+-----------------------------------------------------------------------------------------+
|                        DUAL-FACTOR VERIFICATION PIPELINE                                |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|   1. Device GPS (Lat, Lon)   ──────>  [ Haversine Formula ]  ──────> Distance <= 100m?  |
|                                                                             |           |
|                                                                       YES   |   NO      |
|                                                                        v    v           |
|   2. Camera Capture Photo    ──────>  [ OpenCV Biometric ]   ──────>  PROCEED  PROXY    |
|                                       - Histogram Equalization                 BLOCKED  |
|                                       - 64D Normalized Vector                           |
|                                       - Euclidean Distance <= 0.55?                     |
|                                                                             |           |
|                                                                       YES   |   NO      |
|                                                                        v    v           |
|   3. Persistence Layer       <───────────────────────────────────── RECORD  PROXY       |
|      (SQLite Database: attendance.db)                               LOG     BLOCKED     |
|                                                                                         |
+-----------------------------------------------------------------------------------------+
```

```
+--------------------------------+   +--------------------------------+
|       BIOMETRIC PUNCH-IN       |   |      WORKFORCE ANALYTICS       |
+--------------------------------+   +--------------------------------+
| Select: EMP-101 (Prachi Zala)  |   | Total Punches: 42              |
| Location: 🏢 Office Desk (24m) |   | On-Time Rate: 91%              |
| [ Camera Stream: Ready ]       |   | Proxies Prevented: 4 🚫        |
|                                |   |                                |
| [ 🚀 Submit Biometric Punch ]  |   | Recent Logs:                   |
|                                |   | * EMP-101: Present (09:14 AM)  |
| Output:                        |   | * EMP-104: Proxy Blocked (5km) |
| ✅ PUNCH ACCEPTED (Present)    |   |                                |
| Distance: 24.3m | Conf: 96.2%  |   | [ 📥 Download Report (CSV) ]   |
+--------------------------------+   +--------------------------------+
```
*(Screenshot placeholders: `./docs/screenshots/punch_in.png`, `./docs/screenshots/analytics.png`)*

---

## 🧮 Mathematical Principles

### 1. Haversine Distance Formula
Calculates the great-circle geodesic distance between two latitude/longitude points on Earth:

$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
$$d = R \cdot c$$

*(Where $R = 6,371,000\text{ meters}$, $\phi$ is latitude in radians, and $\lambda$ is longitude in radians).*

### 2. Biometric Feature Similarity
Face features are pooled into a normalized 64-dimensional feature vector $\vec{u}$. Similarity is measured via Euclidean distance:

$$D(\vec{u}, \vec{v}) = \sqrt{\sum_{i=1}^{n} (u_i - v_i)^2}$$

- **$D \le 0.50$:** High confidence match (Same individual).
- **$D > 0.55$:** Biometric mismatch (Flagged as Proxy Attempt).

---

## ✨ Key Features

* 📍 **Real-Time Haversine Geofencing:** Accurately computes distance relative to office coordinates (`23.022500, 72.571400`) with boundary tolerance to handle indoor GPS drift.
* 👤 **OpenCV Facial Feature Recognition:** Illumination-normalized histogram pooling with L2-normalized feature vectors.
* ⚡ **Zero-Friction Interview Demo Mode:** Includes pre-configured location presets (Office Desk, Campus Gate, Remote Home) and quick photo simulation so reviewers can test the application without physical webcams.
* 🗄️ **SQLite Persistence Engine:** Self-contained, zero-configuration local database (`attendance.db`) tracking employee profiles and immutable attendance logs.
* 📊 **Workforce Analytics Dashboard:** Live tracking of daily check-ins, on-time rates, average punch distances, and flagged spoofing attempts.
* 📥 **Single-Click CSV Report Exporter:** Filter logs by department or status and export audited CSV timesheets.
* 🧪 **Automated Test Suite:** Built-in unit tests verifying database integrity, boundary math, biometric matching, and CSV exports.

---

## 📂 Project Structure

```
AI_Smart_Attendance_System/
│
├── app.py                      # Main Streamlit web application & UI
├── database.py                 # SQLite models, CRUD queries & CSV exporter
├── geofencing.py               # Haversine distance calculator & boundary validator
├── biometrics.py               # OpenCV facial feature extraction & matching
├── requirements.txt            # Pinned Python package dependencies
├── .gitignore                  # Git ignore rules for SQLite and temp files
├── README.md                   # Complete architectural guide and setup instructions
│
└── tests/
    └── test_attendance.py      # Automated unit test suite (7 tests)
```

---

## 🚀 Installation & Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/prachizala/AI_Smart_Attendance_System.git
cd AI_Smart_Attendance_System
```

### 2. Set up Python Environment
```bash
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Run Automated Tests
```bash
python -m unittest tests/test_attendance.py
```
*(All 7 tests will execute and pass in under 1 second).*

### 4. Launch the Streamlit Web Application
```bash
streamlit run app.py
```
Open your browser at `http://localhost:8501`.

---

## 🔮 Future Enhancements
- [ ] Implement active liveness detection (blink/smile challenge) to prevent photo presentation attacks.
- [ ] Connect with automated Slack/Email alerts for HR managers on repeat tardiness.
- [ ] Export directly to payroll systems (Excel, Tally, or ERPNext).

---

## 👤 Author & Academic Details

**Prachi Zala**  
- **Degree:** Bachelor of Computer Applications (BCA)  
- **Location:** Ahmedabad, Gujarat, India  
- **Specialization:** Python Backend, AI & Data Analytics  
- **GitHub:** [@prachizala](https://github.com/prachizala)  
- **LinkedIn:** [Prachi Zala](https://www.linkedin.com/in/prachi-zala-74a08b334/)
