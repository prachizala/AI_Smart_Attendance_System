# Extended Modules & Features — AI Smart Attendance System

This document provides technical documentation for additional enterprise and academic features implemented in the system.

---

## 1. HR Policy Assistant & Attendance Chatbot (`services/chatbot_service.py`)

- **Purpose:** An in-app interactive query assistant answering employee questions regarding leave balances, attendance status, and college policies.
- **Implementation:**
  - Intent matching using normalized keyword classification (`/api/chatbot/query`).
  - Queries user records for:
    - Current month punctuality score ($100 \times \frac{\text{on\_time}}{\text{total}}$).
    - Remaining casual leaves and sick leaves.
    - Today's organization-wide attendance roll call (for HOD/Admin).

---

## 2. Punctuality Leaderboard & Gamification (`backend/main.py`)

- **Endpoint:** `GET /api/leaderboard`
- **Logic:** Calculates a ranking of employees based on on-time arrival consistency, total hours worked, and low late frequency.
- **UI:** Rendered in the React Admin Dashboard with gold, silver, and bronze badges.

---

## 3. Academic Payroll & Payslip Generation (`routes/payroll.py`)

- **Endpoints:**
  - `GET /api/payroll/calculate`: Computes monthly gross and net salary.
  - `GET /api/payroll/payslip/{user_id}`: Generates an itemized breakdown including base salary, late deductions, and approved paid leaves.
  - `GET /api/reports/payroll/csv`: Exports CSV attendance and payroll reports.

---

## 4. Dynamic Anti-Screenshot QR Kiosk (`admin-dashboard/src/components/QRKioskModal.jsx`)

- **Purpose:** Allows employees without mobile phones to check in via a mounted tablet or kiosk at the campus entrance.
- **Logic:**
  - Generates a rotating HMAC-SHA256 dynamic token that refreshes every 15 seconds.
  - Prevents employees from photographing a static QR code and sharing it via messaging apps.
  - When scanned by the mobile client, the backend verifies token freshness within the active 15-second window.

---

## 5. Visual Proof of Presence Watermarking (`services/face_service.py`)

- **Implementation:** Uses PIL / OpenCV to draw a semi-transparent audit banner at the bottom of the verified check-in selfie:
  - Timestamp (UTC)
  - Employee ID
  - Geofence Coordinates
  - Facial Verification Confidence Percentage
- **Storage:** Persisted locally in `attendance_proofs/` for curatorial and audit compliance.
