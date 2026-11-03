# Architectural Design Decisions & Interview Defense Guide

**Project:** AI Smart Attendance & Workforce Management System  
**Author:** Prachi Zala  
**Target:** Technical Fresher Interview Screening (Python / Backend / AI / Data)

---

## 1. Biometric Facial Recognition: Distance Metrics & Threshold Selection

### How It Works in Code:
In `backend/services/face_service.py`, facial identity is compared using the **Euclidean Distance (L2 Norm)** between two 128-dimensional biometric embeddings (`live_encoding` and `db_encoding`):

$$\text{Distance} = \|\mathbf{v}_{\text{live}} - \mathbf{v}_{\text{db}}\|_2 = \sqrt{\sum_{i=1}^{128} (v_{\text{live}, i} - v_{\text{db}, i})^2}$$

### Why the Default Threshold is 0.50 (Configurable up to 0.65):
- In deep-learning face recognition (dlib / ResNet-34 based face encoder), two images of the **same person** typically yield an L2 distance between **0.25 and 0.45**. Two images of **different people** typically yield a distance **greater than 0.60**.
- **False Accept Rate (FAR) vs. False Reject Rate (FRR) Trade-Off:**
  - Setting a strict threshold like `0.40` minimizes FAR (almost zero chance an imposter is verified), but elevates FRR (legitimate employees get rejected if lighting changes or if wearing glasses).
  - Setting a loose threshold like `0.65` minimizes FRR (very forgiving of camera angles and dim office lighting), but slightly increases FAR.
  - We choose **0.50 as the default baseline** (balanced Equal Error Rate), and made it dynamically configurable via `FACE_MATCH_THRESHOLD` so administrators can fine-tune tolerance per campus environment.

---

## 2. Liveness Detection & Anti-Spoofing Architecture

### How It Works in Code:
- In the mobile client (`mobile/App.js`), a UI-driven **timed blink challenge** prompts the user with `"Please blink your eyes..."` on camera activation. A 1.6-second timer transitions the challenge state to `livenessPassed = true`.
- In the backend (`backend/services/face_service.py`), uploaded images undergo structural checks: Base64 format validation, resolution normalization (resampling to max 1280px), and face bounding box count validation (rejecting images with 0 faces or multiple faces).

### What Attacks It Defends Against:
- ✅ **Casual Static Photos / Accidental Captures:** Blocks users from submitting photos where someone's face is turned away, occluded, or where multiple people are in frame.
- ✅ **Corrupted or Manipulated Streams:** Validates raw image bytes and decompression limits to defend against image payload exploits.

### What Attacks It CANNOT Defend Against (Honest Limitation):
- ❌ **Video Replay Attacks:** A recorded video of the employee blinking played on a second tablet screen can satisfy the 1.6s timed prompt.
- ❌ **3D Silicone / Latex Masks:** Standard 2D RGB cameras cannot measure infrared depth or facial heat.

### Production Roadmap:
To achieve true ISO/IEC 30107-3 Presentation Attack Detection (PAD), the next iteration will implement **Eye Aspect Ratio (EAR)** tracking across a 5-frame video sequence with randomized interactive challenges (e.g. *"turn head left, then smile"*).

---

## 3. Geofencing Architecture & GPS Spoofing Defenses

### Why the Haversine Formula?
In `backend/services/geo_service.py`, distance is calculated using the spherical law of Haversines:

$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$d = 2 R \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a})$$

- For small local distances (e.g. 100 meters), Haversine error is under **0.1%**, which is substantially more accurate than the hardware precision of civilian smartphone GPS chips ($\pm 4$ to $10$ meters).
- Pure mathematical computation in Python without external API calls ensures sub-millisecond execution with zero external billing.

### Why a 100-Meter Radius?
Urban GPS signals suffer from multi-path reflections and atmospheric attenuation inside multi-story academic buildings. A 100m radius covers the physical campus footprint while absorbing normal indoor GPS drift.

### How GPS Spoofing Works and Our Mitigations:
- **Vulnerability:** Android allows "Mock Location Providers" in Developer Options, allowing fake-GPS apps to feed fake coordinates to the OS.
- **Implemented Mitigations:**
  1. Coordinate range clamping (latitude $-90$ to $+90$, longitude $-180$ to $+180$) in Pydantic schemas.
  2. Server-side velocity checks: impossible travel distances between successive punches are flagged.
- **Production Roadmap:** Querying `location.mocked` via Expo Location APIs and cross-referencing office Wi-Fi BSSID / IP subnets.

---

## 4. Database Strategy: SQLite vs. PostgreSQL Migration

### Why SQLite for Academic Demonstration?
- **Zero Configuration:** Entire database resides in a single, portable file (`smart_attendance.db`).
- **Deterministic Evaluation:** Evaluators and college examiners can clone the repo and run tests immediately without provisioning local Docker containers, Postgres daemons, or user permissions.
- **Full ACID Compliance:** SQLite supports transactions, foreign keys, and WAL (Write-Ahead Logging) mode.

### Production Migration to PostgreSQL:
The codebase is decoupled using **SQLAlchemy 2.0 ORM**, meaning business logic never issues raw database-specific SQL strings. Migrating to PostgreSQL requires:
1. Update `DATABASE_URL` in `.env`:  
   `DATABASE_URL=postgresql://postgres:password@localhost:5432/smart_attendance`
2. Install the database driver: `pip install psycopg2-binary` (already included in `requirements.txt`).
3. Add Alembic migrations: `alembic init alembic` and `alembic revision --autogenerate -m "Initial schema"`.
4. Replace SQLite file-locking with PostgreSQL connection pooling (`pool_size=20`, `max_overflow=10`).

---

## 5. Authentication & JWT Architecture

### Token Lifecycle:
```mermaid
sequenceDiagram
    participant User as Mobile / Web Client
    participant Auth as FastAPI /api/auth/login
    participant DB as SQLite DB

    User->>Auth: POST credentials {identifier, password}
    Auth->>Auth: Check in-memory rate limiter (max 5/min)
    Auth->>DB: Query user by Employee ID or Email
    Auth->>Auth: passlib.pwd_context.verify(password, hashed_password)
    Auth->>Auth: Generate JWT with sub=user.id, role, exp=(now + 24h)
    Auth-->>User: HTTP 200 {access_token, token_type: "bearer"}
    User->>User: Store token in Expo SecureStore / sessionStorage
    User->>Auth: GET /api/attendance/history (Header: Authorization: Bearer <token>)
    Auth->>Auth: Verify HMAC-SHA256 signature & exp timestamp
    Auth-->>User: HTTP 200 {records}
```

- Passwords use **bcrypt** hashing with auto-generated salt rounds.
- Tokens include an expiration timestamp (`exp`). Expired tokens are rejected with HTTP 401 Unauthorized.
- Tokens are stored in mobile device hardware keystores (`expo-secure-store`) rather than insecure local text storage.

---

## 6. Offline Punch Sync & Timestamp Integrity

### The Problem:
Mobile devices in basement parking lots or remote campuses often lose network connectivity.

### How It Works:
- When offline, punches are queued locally on the mobile device.
- Upon network restoration, queued punches are dispatched to the backend sync endpoint.

### Timestamp Tampering Mitigation:
- Employees could theoretically alter device clock settings.
- The backend reconciles both client-submitted time and **server UTC reception time**. If the skew between client timestamp and server reception timestamp exceeds a configurable grace period (e.g. 15 minutes), the punch is automatically flagged with `"audit_status": "FLAGGED_TIME_SKEW"` for admin review.

---

## 7. Watermark: Proof of Presence on Punch Photos

- When verified, the backend (`services/face_service.py`) burns an audit banner onto the image using PIL / OpenCV:
  ```
  PROOF OF PRESENCE | ID: EMP001 | 2026-11-03 14:30:15 UTC | GPS: 23.0022, 72.4557 | CONF: 94.2%
  ```
- **Technical Clarification:** This is a **visual audit watermark** designed for human inspection and HR records, not a cryptographic steganographic watermark.

---

## 8. Real Development Challenges & Bug Resolutions

> **TODO(owner):** Prachi, add 1-2 real debugging stories here before your technical interviews. Examples:
> - *Bug 1:* Dealing with OpenCV BGR vs. PIL RGB color channel inversion causing face detection failures.
> - *Bug 2:* Handling asynchronous Expo camera permissions on modern Android 13/14 runtime permission models.
