# Security Policy & System Architecture Guide

**Project**: AI Smart Attendance & Workforce Management System  
**Academic Context**: College Minor Project — BCA (Bachelor of Computer Applications)  
**Classification**: Educational / Academic Project Security Baseline  

---

## 1. Executive Summary

This document outlines the security architecture, threat model, applied controls, and hardening policies implemented across the **AI Smart Attendance System**. 

The system implements a defense-in-depth model across the FastAPI backend, React Admin Dashboard, and React Native (Expo) mobile client. 

> [!NOTE]  
> Security is an ongoing process of risk mitigation. No system is impenetrable or "100% secure". This document clearly differentiates **implemented controls** currently enforced in code from **future recommendations** intended for production deployment.

---

## 2. Authentication Model

### Implementation Details:
- **Dual-Domain Authentication**: The application maintains distinct credential verification flows for **Administrators** (`role="admin"`) and **Employees** (`role="employee"`).
- **Password Hashing**: Passwords are never stored in plaintext. Passwords are salted and hashed using **bcrypt** via Python's `passlib.context.CryptContext(schemes=["bcrypt"], deprecated="auto")`.
- **Credential Verification**:
  - Employee IDs (e.g., `EMP001`) and email addresses are normalized (uppercase for IDs, lowercase for emails).
  - Failed logins return generic `401 Unauthorized` messages (`"Invalid Employee ID / Email or password"`) to prevent username enumeration.
- **Account State Verification**: Deactivated accounts (`is_active=False`) are blocked from authentication and API access.

---

## 3. Authorization & Access Control

### Implementation Details:
- **Role-Based Access Control (RBAC)**:
  - **Administrator Only**: `/api/auth/users`, `/api/auth/register`, `/api/attendance/today`, `/api/attendance/stats`, `/api/leaves/all`, `/api/admin/leaves/pending`, `/api/leaves/{id}/review`, `/api/payroll/generate`, `/api/payroll/all`, `/payroll/summary/{employee_id}`.
  - Enforced via FastAPI's dependency injection (`get_current_admin`), which queries the database record to verify `role == 'admin'`, returning `403 Forbidden` if a non-admin requests administrative actions.
- **Tenant & Identity Isolation (Anti-Impersonation)**:
  - APIs that accept an optional `user_id` or `employee_id` (e.g., check-in, check-out, leave application, attendance history) cross-verify the parameter against the user extracted from the verified JWT.
  - If a non-admin attempts to perform actions on behalf of another user ID, the backend immediately halts execution and returns `403 Forbidden` (`"Forbidden: Cannot perform operations on behalf of another employee"`).
- **Frontend Route Protection**:
  - The React Admin Dashboard wraps all sensitive dashboard views (`/`, `/employees`, `/leaves`, `/payroll`) with `<ProtectedRoute>`. Unauthenticated requests redirect to `/login`.
  - The Axios client uses automatic response interceptors: any `401` or `403` response immediately purges stored tokens, wipes local state, and dispatches a session expiration event.

---

## 4. JWT (JSON Web Token) Security

### Implementation Details:
- **Token Format**: Standard RFC 7519 JSON Web Tokens signed with HMAC-SHA256 (`HS256`).
- **Signature & Expiration Validation**:
  - Every protected request parses the `Authorization: Bearer <token>` header.
  - Expired tokens or tampered signatures are rejected with `401 Unauthorized`.
  - Tokens encode only the minimal subject identifier (`sub: user_id`) and role. Sensitive data (passwords, salary figures, biometric encodings) is never embedded in token payloads.
- **Token Invalidation on Logout**:
  - **Admin**: Logout actively destroys `admin_token` and `admin_user` from `localStorage`, removing the default Authorization header.
  - **Mobile**: Logout invokes `deleteSecureToken()` from the device's secure hardware vault and clears all session state.

---

## 5. Dual-Factor Attendance Verification

Attendance check-in enforces a dual-factor biometric and physical presence gate before any attendance record can be created.

```
Request Check-In
      │
      ├──> [Gate 1: WHERE] ──> Haversine GPS Distance <= 100m (Office Geofence)
      │                            │ Pass
      ├──> [Gate 2: WHO]   ──> 128-D Euclidean Distance <= 0.50 (Face Verification)
      │                            │ Pass
      └──> [Gate 3: WHEN]  ──> Anti-Duplicate Check (1 check-in per day)
                                   │ Pass
                             Attendance Recorded
```

### Gate 1: GPS Geofencing Security
- **Physical Workplace Target**: SBS Shanti Business School, Shela, Ahmedabad, Gujarat (Lat: `23.002217`, Lon: `72.455763`).
- **Perimeter Radius**: Strict 100.0 meters.
- **Distance Formula**: Haversine great-circle formula calculated using WGS-84 mean radius ($R = 6,371,000\text{ meters}$).
- **Backend Authority**: While the mobile app provides local visual feedback, the backend independently calculates geodesic distance from raw device coordinates. If distance $> 100\text{m}$, the request is rejected with `403 Forbidden` or `400 Bad Request`.

### Gate 2: Biometric Facial Data Protection
- **No Raw Image Storage**: Live selfie photos uploaded during check-in or face registration are converted to 128-D floating-point vectors in memory and **immediately discarded**. Raw biometric images are never written to disk, SQLite, or public cloud storage.
- **Euclidean Distance Matching**: Comparison between the live face embedding and the enrolled profile uses Euclidean distance ($||\vec{x}_{\text{live}} - \vec{x}_{\text{enrolled}}||_2$).
- **Matching Threshold**: $\le 0.50$. Distances greater than 0.50 are rejected with `401 Unauthorized` (`"Face verification failed. Live face does not match registered profile"`).
- **Single-Face Enforcement**: The facial detection pipeline rejects images containing zero faces or multiple faces (`> 1`) to prevent spoofing or multi-person ambiguity.

---

## 6. Input Validation & Request Sanitization

### Implementation Details:
- **Pydantic Validation**: All input schemas (`CheckInRequest`, `CheckOutRequest`, `UserRegister`, `UserLogin`, `LeaveApplyPayload`, `PayrollGeneratePayload`) use Pydantic type-checking and constraint enforcement.
- **Geographic Coordinate Bounds**:
  - `latitude`: Constrained to $-90.0 \le \text{lat} \le 90.0$ degrees.
  - `longitude`: Constrained to $-180.0 \le \text{lon} \le 180.0$ degrees.
- **Payload Size Limits**:
  - Base64 facial image strings are strictly constrained (`max_length=7,000,000` characters, ~5MB binary image) to prevent Denial of Service (DoS) and memory exhaustion.
- **Decompression Bomb Protection**:
  - Image decoding enforces `Image.MAX_IMAGE_PIXELS = 10_000_000` and maximum dimension limits ($4096 \times 4096$) via Pillow.

---

## 7. Sandbox Isolation & Path Traversal Prevention

For target-specific operations and temporary file handling, the backend enforces modular isolation via `backend/security_sandbox.py`:

- **Path Traversal Defense**:
  - Paths are validated with `validate_safe_path(base_dir, requested_path)`.
  - Canonicalization uses `os.path.realpath(os.path.abspath(...))` to ensure targets cannot escape the allowlisted root directory.
  - Explicitly rejects `../`, `..\`, null bytes (`\0`), and absolute path escapes.
- **Per-Target Workspaces**:
  - When sandbox operations are needed, each target is assigned an isolated subfolder: `sandboxes/{target_id}/`.
  - Target A has no filesystem permissions to access Target B's directory.
  - Sandboxes are cleaned up upon task completion with `cleanup_target_sandbox(target_id)`.

---

## 8. AI / Prompt Injection Threat Model

### Current Architecture Assessment:
The current Smart Attendance system **does NOT** contain an LLM, generative AI assistant, chatbot, or prompt-processing module. The system's AI capabilities are exclusively computer vision / biometric feature vector extraction (`face_recognition` / ResNet-34 128-D embeddings).

### Security-Ready Architecture for Future AI / LLM Integrations:
If an AI assistant or natural language interface is added in the future, it must adhere to the following strict guardrails:
1. **Instruction Hierarchy**:
   - Trusted system/developer instructions must always take precedence over untrusted inputs (user chat, uploaded documents, database records).
   - Untrusted inputs must be treated strictly as **DATA**, never as executable instructions.
2. **Defensive Prompt Rules**:
   - System prompts must reject jailbreak patterns (`"ignore previous instructions"`, `"reveal system prompt"`, `"bypass auth"`, `"dump API keys"`).
   - System prompts and configuration secrets must never be reflected in model outputs.
3. **Least-Privilege Tool Use**:
   - Tool calling must be allowlisted with strict input validation.
   - The AI must not have direct shell execution, arbitrary database access, or file-writing capabilities.
   - Sensitive operations (e.g., approving leaves, calculating payouts) must require explicit authenticated user confirmation.

---

## 9. Mobile & Device Hardening

- **Secure Token Storage**: Authentication tokens are stored using `expo-secure-store`, leveraging **Android KeyStore** (hardware-backed AES encryption) and **iOS Keychain**. Plaintext `AsyncStorage` is not used for credentials.
- **No Hardcoded Passwords**: Frontend source code in both `admin-dashboard` and `mobile` contains no hardcoded user or administrator passwords. Login forms initialize with empty credential states.
- **Environment Configuration**: API endpoints are read from environment variables (`EXPO_PUBLIC_API_URL` for mobile, `VITE_API_BASE_URL` for web), avoiding hardcoded staging IPs.
- **Permission Minimization**: `mobile/app.json` requests only the minimal hardware permissions necessary: `CAMERA` (biometric capture), `ACCESS_FINE_LOCATION`, and `ACCESS_COARSE_LOCATION` (geofence verification).
- **Logging Sanitization**: Sensitive variables—such as Base64 image data, 128-D biometric vector coordinates, plain passwords, and JWT tokens—are strictly suppressed from console and application logs.

---

## 10. API & Network Hardening

- **Safe CORS Configuration**:
  - Insecure wildcard with credentials (`allow_origins=["*"]` + `allow_credentials=True`) is removed.
  - An explicit allowlist is configured for actual environments (`http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:5173`, `http://localhost:8000`, `http://192.168.1.2:3000`, `http://192.168.1.2:8000`, `http://192.168.1.2:8081`).
  - Regex filtering supports LAN mobile testing (`^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$`) while blocking unauthorized third-party origins.
- **Safe Exception Handling**:
  - A global exception handler catches unhandled exceptions and returns a generic error (`"An internal server error occurred"`).
  - Internal database tracebacks, SQL query text, file system directory structures, and environment paths are suppressed from client responses.

---

## 11. Known Limitations & Future Recommendations

| Security Dimension | Implemented in Current System | Recommended for Future Production Deployment |
| :--- | :--- | :--- |
| **Transport Encryption** | HTTP over local Wi-Fi / LAN | HTTPS / TLS 1.3 with automated Let's Encrypt certificates |
| **Database** | SQLite with local file access | PostgreSQL with encrypted connections, row-level security, and connection pooling |
| **Secrets Management** | `.env` files with OS environment variables | HashiCorp Vault, AWS Secrets Manager, or Google Cloud Secret Manager |
| **Liveness Detection** | Static single-frame biometric verification | Dynamic 3D depth sensing, blink detection, or multi-frame micro-movement analysis to defend against 2D printed photo spoofing |
| **Rate Limiting** | Pydantic payload size validation | Redis-backed token bucket rate limiting (e.g., `slowapi`) to mitigate brute-force attempts on `/api/auth/login` |
| **GPS Spoofing Defense** | Hardware GPS accuracy validation | Mock-location flag detection (`isMocked` via Expo Location) and Wi-Fi BSSID triangulation |
| **Auditing & Logging** | Structured server logging without sensitive data | Centralized SIEM / Log aggregation (e.g. ELK, Datadog) with tamper-evident audit trails |
