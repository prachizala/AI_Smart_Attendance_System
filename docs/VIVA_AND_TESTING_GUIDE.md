# AI Smart Attendance & Workforce Management System
# QA Testing Playbook, 3-Minute Demo Script & Top 20 Viva Voce Q&A

---

## DOMAIN 1: Testing Edge Cases & Exact Coordinate Mapping

### 📍 Geofence Configuration
- **Office Target Coordinates:** `Latitude = 23.002217`, `Longitude = 72.455763` (SBS Shanti Business School, Shela, Ahmedabad, Gujarat 380058)
- **Allowed Perimeter Radius:** `100.0 meters`
- **Default Test Employee:** `EMP001` (Password: `secret123`, Base Salary: `₹36,000/month`)

---

### 🧪 Test Case 1: "GPS Outside Geofence" (Location Spoofing Rejection)
- **Objective:** Verify that an employee physically outside the 100m office radius is immediately blocked from marking attendance.
- **Exact Coordinates to Use:**
  - **Latitude:** `23.020000`
  - **Longitude:** `72.490000`
  - *(This location is approximately 3,800 meters / 3.8 km away from the SBS campus)*.
- **How to Test via Mobile App:**
  1. Open the Mobile App on your device.
  2. In the **🎯 Viva Demo GPS Simulator** card at the top, tap the **"🚫 Outside (403)"** button.
  3. Notice the radar card updates to: `● OUTSIDE OFFICE PERIMETER (Distance to HQ: ~3500m)`.
  4. Tap **"Punch Check-In"** and capture a selfie.
- **How to Test via Swagger UI / cURL:**
  ```bash
  curl -X POST "http://localhost:8000/attendance/check-in" \
       -H "Content-Type: application/json" \
       -d '{"latitude": 23.0880, "longitude": 72.6900, "face_image_base64": "<BASE64_IMAGE>", "user_id": 1}'
  ```
- **Expected Result:**
  - **HTTP Status Code:** `403 Forbidden`
  - **Alert Detail:** `"Check-in rejected: Device is outside office perimeter. Distance: 3500m, Allowed: 100.0m"`
  - **UI Feedback:** Amber/Red modal explaining the geofence perimeter violation.

---

### 🧪 Test Case 2: "Face Mismatch" (Proxy / Buddy Punching Rejection)
- **Objective:** Verify that an employee standing inside the office cannot punch attendance on behalf of another employee.
- **Exact Coordinates to Use:**
  - **Latitude:** `23.002220`
  - **Longitude:** `72.455770`
  - *(This location is ~0.8 meters from campus center, inside the geofence)*.
- **How to Test via Mobile App:**
  1. In the **Viva Demo GPS Simulator**, tap **"✅ Inside (Pass)"**.
  2. Tap **"Punch Check-In"**.
  3. Instead of the enrolled employee, point the camera at a classmate, a different face, or a smartphone displaying a different photo.
  4. Tap **"Verify & Check-In"**.
- **How to Test via Swagger UI / cURL:**
  ```bash
  curl -X POST "http://localhost:8000/attendance/check-in" \
       -H "Content-Type: application/json" \
       -d '{"latitude": 23.002220, "longitude": 72.455770, "face_image_base64": "<DIFFERENT_PERSON_BASE64>", "user_id": 1}'
  ```
- **Expected Result:**
  - **HTTP Status Code:** `401 Unauthorized`
  - **Alert Detail:** `"Face verification failed. Live face does not match registered profile. (Confidence: 38%)"`
  - **UI Feedback:** Red modal displaying biometric face mismatch.

---

### 🧪 Test Case 3: "Verified Check-In" (Positive Dual-Factor Pass)
- **Objective:** Verify that when both location ($\le 100\text{m}$) and identity ($d \le 0.50$) are valid, attendance is marked.
- **Exact Coordinates to Use:**
  - **Latitude:** `23.002220`, **Longitude:** `72.455770`
- **How to Test via Mobile App:**
  1. In the **Viva Demo GPS Simulator**, tap **"✅ Inside (Pass)"**.
  2. Tap **"Punch Check-In"**.
  3. Center the enrolled employee's face inside the oval reticle.
  4. Tap **"Verify & Check-In"**.
- **Expected Result:**
  - **HTTP Status Code:** `200 OK`
  - **Alert Detail:** `"Attendance successfully recorded as PRESENT at [Current Time]"`
  - **UI Feedback:** Green checkmark modal displaying timestamp and distance (~1.5m).
  - **Web Dashboard:** The Admin table instantly reflects the entry with green checkmarks under **Face Biometric** and **GPS Geofence**.

---

### 🧪 Test Case 4: "Duplicate Check-In" (Anti-Double Punching Rule)
- **Objective:** Prevent an employee from logging multiple check-ins on the same calendar day.
- **How to Test via Mobile App:**
  1. Immediately after Test Case 3 succeeds, tap **"Punch Check-In"** again.
  2. Capture photo inside the geofence.
- **Expected Result:**
  - **HTTP Status Code:** `409 Conflict`
  - **Alert Detail:** `"Duplicate check-in rejected: Already checked in for today at HH:MM:SS"`
  - **UI Feedback:** Blue warning modal indicating attendance is already logged.

---

### 🧪 Test Case 5: "No Face Detected / Camera Occlusion"
- **Objective:** Ensure user feedback when camera is blocked or covered.
- **How to Test via Mobile App:**
  1. Cover the phone camera with a finger so the screen is completely black.
  2. Tap **"Verify & Check-In"**.
- **Expected Result:**
  - **HTTP Status Code:** `400 Bad Request`
  - **Alert Detail:** `"No face detected in the captured image. Please align your face clearly in the camera frame."`

---

## DOMAIN 2: The 3-Minute Presentation & Narration Script

### 🎙️ Minute 1: The Problem & Dual-Factor Architecture (0:00 – 1:00)

*(Speak with confidence, standing straight, facing the examiners)*

> "Respected external examiners and faculty members, good morning.
> 
> In traditional corporate and campus environments, attendance systems suffer from two major flaws:
> 1. **RFID Smart Cards** allow easy buddy punching—one student or employee swipes cards for five friends.
> 2. **Stationary Biometric Kiosks** create long morning queuing bottlenecks, risk physical contact, and lack remote location verification.
> 
> To solve both **Identity Fraud** and **Location Fraud**, we engineered the **AI Smart Attendance & Workforce Management System**.
> 
> Our architecture requires a strict **Dual-Factor Gate** on the employee's personal smartphone:
> - **WHO (Identity):** An AI computer vision service that extracts a 128-dimensional facial embedding and computes real-time Euclidean distance against an enrolled reference ($d \le 0.50$).
> - **WHERE (Location):** High-precision GPS triangulation calculating geodesic distance via the **Haversine formula** to guarantee the device is physically within a **100-meter perimeter** of our campus ($23.002217^{\circ}\text{ N}, 72.455763^{\circ}\text{ E}$).
> 
> The system is backed by an asynchronous **FastAPI Python backend**, an **Expo React Native mobile app**, and a **React Vite Web Admin Portal**."

---

### 📱 Minute 2: Live Negative & Positive Demos (1:00 – 2:00)

*(Pick up your phone or point to the screen)*

> "Allow us to demonstrate how the system handles security edge cases live:
> 
> **First, let’s test Location Fraud.** An employee tries to punch check-in from their home or hostel 1.8 kilometers away.
> *(Click 'Outside (403)' simulator button $\rightarrow$ Click 'Punch Check-In')*
> As you can see on screen, the request is instantly aborted with **HTTP 403 Forbidden**. The system detected the user is 1,850 meters outside the 50-meter perimeter.
> 
> **Second, let’s test Identity Fraud.** The employee is inside the office, but has a colleague punch on their behalf.
> *(Click 'Inside (Pass)' $\rightarrow$ Point camera away from enrolled face $\rightarrow$ Click Verify)*
> The system aborts with **HTTP 401 Unauthorized**. The live 128-D facial vector failed the Euclidean threshold test.
> 
> **Now, the genuine check-in.** The authorized employee is physically inside the 50m radius and scans their own face.
> *(Align face inside oval reticle $\rightarrow$ Click Verify)*
> Success! **HTTP 200 OK**. Attendance is logged as PRESENT with the exact timestamp.
> 
> If the employee tries to punch again: **HTTP 409 Conflict** blocks the duplicate punch immediately.
> And looking at our **Web Admin Dashboard on the laptop**, the real-time attendance table instantly reflects this punch with two green verified checkmarks for both Face and Geofence."

---

### 💼 Minute 3: Leave Management & Academic Payroll Automation (2:00 – 3:00)

*(Switch to laptop displaying Admin Dashboard)*

> "Beyond attendance, our system automates the entire HR workforce lifecycle:
> 
> 1. **Leave Dispatch:** When an employee applies for academic or medical leave, the admin reviews it right here on the dashboard and approves it with a single click via our REST API.
> 2. **Automated Academic Payroll:** Our mathematical calculation engine in `services/payroll_service.py` dynamically computes the monthly salary:
>    $$\text{Payout} = \left(\frac{\text{Base Salary}}{30}\right) \times (\text{Present Days} + \text{Approved Paid Leaves})$$
>    Deductions are calculated automatically without manual human error.
> 
> This embodies our project: modern, mathematically rigorous, rock-solid security, built cleanly with Python, React Native, and React Vite.
> 
> Thank you, and we welcome your questions!"

---

## DOMAIN 3: Top 20 Technical Viva Questions & High-Impact 2-Sentence Answers

### Q1: Why did you use the Haversine formula instead of Euclidean distance $(x_2-x_1)^2 + (y_2-y_1)^2$?
> **Answer:** 
> The Earth is an oblate spheroid, not a flat 2D plane, so longitude lines converge toward the poles rather than remaining parallel. The Haversine formula calculates spherical great-circle distance using trigonometry and Earth's radius ($R = 6,371\text{ km}$), providing accurate meter-level surface distance.

---

### Q2: How does the AI Face Verification work internally?
> **Answer:**
> A deep convolutional neural network extracts facial landmark points and projects them into a continuous 128-dimensional vector space ($\mathbb{R}^{128}$). We then compute the Euclidean ($\ell_2$) distance between the live photo vector and the database vector, approving identity when distance is $\le 0.50$.

---

### Q3: How are user passwords securely stored in the database?
> **Answer:**
> Passwords are never stored in plain text; they are hashed using the **bcrypt** adaptive cryptographic hash algorithm with an automated salt. This protects against rainbow table attacks and dictionary attacks even if the database file is compromised.

---

### Q4: What is the difference between 1-to-1 Verification and 1-to-N Recognition?
> **Answer:**
> 1-to-N Recognition searches an unknown face across an entire database of $N$ individuals, which scales at $O(N)$ computational complexity. 1-to-1 Verification compares the claimed employee's live face against only their own pre-stored vector, executing in constant $O(1)$ time for fast mobile performance.

---

### Q5: Why is your allowed geofence perimeter radius set to 50 meters?
> **Answer:**
> Consumer mobile GPS receivers exhibit an unavoidable drift of 5 to 15 meters, which increases indoors due to multi-path signal reflections. A 50-meter radius prevents false rejections inside the building while strictly blocking off-site punching from home or outside the campus.

---

### Q6: What prevents an employee from using a fake GPS location mock app?
> **Answer:**
> Even if an employee spoofs their GPS coordinates to appear inside the office, they cannot bypass the simultaneous Biometric WHO gate without physically presenting their own face to the live camera. Both independent gates must pass simultaneously for a check-in to succeed.

---

### Q7: Why did you pick FastAPI instead of Flask or Django?
> **Answer:**
> FastAPI is built on asynchronous ASGI standards (Starlette and Uvicorn), enabling high-concurrency request throughput on par with Go or Node.js. It also provides automated OpenAPI Swagger documentation and native Pydantic data validation with zero boilerplate.

---

### Q8: What is a 128-dimensional embedding vector?
> **Answer:**
> It is an array of 128 floating-point numbers representing distinctive geometric facial measurements, such as eye spacing and jawline contour. In this embedding space, photos of the same person have a small Euclidean distance, while different people have a large Euclidean distance.

---

### Q9: How does the system prevent duplicate punches on the same day?
> **Answer:**
> Before committing attendance, the server queries the database for an existing check-in matching both the employee ID and today's date. If a record is found, the server halts execution and returns an `HTTP 409 Conflict` status code.

---

### Q10: How does your JWT authentication work? Is it stateful or stateless?
> **Answer:**
> Our authentication is completely stateless; the server does not store active sessions in RAM or disk. Instead, the client transmits an HMAC-SHA256 signed JSON Web Token containing claims and an expiration time in the `Authorization: Bearer` header, which the server cryptographically verifies.

---

### Q11: Explain your Academic Payroll formula.
> **Answer:**
> Per-day salary is calculated as $\frac{\text{Base Salary}}{\text{Working Days (30)}}$, and payable days equal Present Days plus Approved Paid Leaves. Gross payout is $\text{Per-Day Salary} \times \text{Payable Days}$, with deductions computed as $\text{Base Salary} - \text{Gross Payout}$.

---

### Q12: Why did you choose SQLite for development, and how will it scale to production?
> **Answer:**
> SQLite is zero-configuration and serverless, making it lightweight for local student development and automated testing. Because we use the SQLAlchemy ORM abstraction layer, migrating to enterprise PostgreSQL requires changing only the database connection URI in `.env`.

---

### Q13: How does the mobile app trigger the Camera and GPS "Simultaneously"?
> **Answer:**
> When the punch button is pressed, the app initiates `Location.getCurrentPositionAsync()` in the background while concurrently opening the camera viewfinder overlay. By the time the user aligns their face and taps capture, the GPS fix is already locked, eliminating user wait time.

---

### Q14: What is the purpose of image Base64 compression at 0.6 quality?
> **Answer:**
> Raw smartphone camera photos exceed 8 MB, which causes unacceptable upload latency and potential HTTP timeouts on mobile networks. Compressing to JPEG quality 0.6 reduces payload size by ~97% to ~180 KB while preserving 100% of facial landmark resolution.

---

### Q15: How does the Admin Dashboard update attendance logs in real time?
> **Answer:**
> `AdminDashboard.jsx` implements an automated polling interval that invokes Axios every 12 seconds to query `/api/admin/attendance/today`. It dynamically maps green checkmarks for `face_verified` and `geo_verified` records and updates attendance counters.

---

### Q16: What are the exact HTTP status codes used in your check-in API?
> **Answer:**
> The check-in API returns `200 OK` on verified attendance, `401 Unauthorized` on biometric face mismatch, `403 Forbidden` on geofence perimeter breach, and `409 Conflict` on duplicate punch attempts.

---

### Q17: What is the current limitation regarding photo spoofing (liveness detection)?
> **Answer:**
> Our current MVP uses 2D geometric facial verification, which could theoretically be vulnerable to high-resolution printed photos. Our planned Phase 2 production upgrade incorporates active liveness detection via blink detection using Eye Aspect Ratio (EAR) and 3D depth sensing.

---

### Q18: How does the system handle network disconnects or API latency during mobile attendance marking?
> **Answer:**
> The mobile client incorporates robust timeout handlers and user-friendly error banners. If network connectivity fails, the app provides immediate actionable visual feedback to the employee without crashing or entering an inconsistent state.

---

### Q19: What challenges did you face when setting up computer vision on Windows?
> **Answer:**
> Installing standard `dlib` on Windows fails without Visual C++ 14+ CMake build tools installed. We resolved this by configuring pre-compiled binary wheels (`dlib-bin`) and OpenCV, ensuring 100% stable execution without compiler errors.

---

### Q20: What are your future plans for this system?
> **Answer:**
> We plan to introduce 3D passive liveness detection to defeat photo/video spoofing and deploy Bluetooth Low Energy (BLE) beacons for indoor micro-geofencing in multi-story facilities where satellite GPS signals degrade.
