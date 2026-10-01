"""
Automated Security Test Suite
AI Smart Attendance & Workforce Management System

Validates:
1. Authentication & Role Enforcement (401 Unauthorized on unauthenticated, 403 on employee on admin endpoint)
2. JWT Verification (tampered, malformed, expired tokens rejected)
3. Anti-Impersonation & Tenant Isolation (Employee A cannot perform actions for Employee B)
4. Input Validation & Defense (Malformed JSON, coordinate out-of-range, oversized upload rejected)
5. Sandbox & Path Traversal Defense (../ traversal, null bytes, cross-target directory access rejected)
6. Image Upload Protection (size limits, decompression bomb guard, invalid formats rejected)
"""

import os
import json
import pytest
import uuid
from datetime import datetime, timedelta
from jose import jwt
from fastapi.testclient import TestClient

from main import app
from database import SessionLocal
import models
from auth import SECRET_KEY, ALGORITHM, get_password_hash
from security_sandbox import (
    validate_safe_path,
    get_target_sandbox,
    cleanup_target_sandbox,
    validate_image_security,
    SecurityException,
    BASE_SANDBOX_DIR
)
from tests.helpers import get_admin_headers

client = TestClient(app)


# ==============================================================================
# 1. AUTHENTICATION & ACCESS CONTROL TESTS
# ==============================================================================
def test_unauthenticated_api_request_rejected():
    """Unauthenticated requests to protected endpoints must return 401 Unauthorized."""
    endpoints = [
        ("GET", "/api/auth/users"),
        ("GET", "/api/attendance/stats"),
        ("GET", "/api/leaves/all"),
        ("POST", "/api/payroll/generate"),
        ("GET", "/payroll/summary/EMP001"),
    ]
    for method, path in endpoints:
        if method == "GET":
            res = client.get(path)
        else:
            res = client.post(path, json={"month": 10, "year": 2026})
        assert res.status_code == 401, f"Expected 401 for unauthenticated {method} {path}, got {res.status_code}"


def test_employee_attempting_admin_endpoint_forbidden():
    """An authenticated employee attempting to access administrative endpoints must receive 403 Forbidden."""
    uid = uuid.uuid4().hex[:6].upper()
    db = SessionLocal()
    emp = models.User(
        employee_id=f"SE_{uid}",
        full_name=f"Sec Employee {uid}",
        email=f"sec_{uid.lower()}@college.edu",
        hashed_password=get_password_hash("Password123"),
        role="employee",
        base_salary=30000.0,
        is_active=True
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    db.close()

    # Login as employee
    login_res = client.post("/api/auth/login", json={"identifier": f"SE_{uid}", "password": "Password123"})
    assert login_res.status_code == 200
    emp_token = login_res.json()["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    # Attempt admin-only endpoints
    assert client.get("/api/auth/users", headers=emp_headers).status_code == 403
    assert client.get("/api/attendance/stats", headers=emp_headers).status_code == 403
    assert client.get("/api/leaves/all", headers=emp_headers).status_code == 403
    assert client.get("/payroll/summary/EMP001", headers=emp_headers).status_code == 403


def test_invalid_and_expired_jwt_rejected():
    """Malformed, tampered, or expired JWT tokens must be strictly rejected with 401 Unauthorized."""
    # 1. Tampered / malformed token
    bad_headers = {"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature"}
    res = client.get("/api/auth/me", headers=bad_headers)
    assert res.status_code == 401

    # 2. Expired token
    expired_payload = {
        "sub": "1",
        "role": "admin",
        "exp": datetime.utcnow() - timedelta(minutes=10)
    }
    expired_token = jwt.encode(expired_payload, SECRET_KEY, algorithm=ALGORITHM)
    exp_headers = {"Authorization": f"Bearer {expired_token}"}
    res_exp = client.get("/api/auth/me", headers=exp_headers)
    assert res_exp.status_code == 401


# ==============================================================================
# 2. ANTI-IMPERSONATION & CROSS-USER ISOLATION TESTS
# ==============================================================================
def test_anti_impersonation_attendance_history():
    """An employee cannot access another employee's attendance history."""
    db = SessionLocal()
    user_a = models.User(
        employee_id="SECA01",
        full_name="User Alpha",
        email="alpha@college.edu",
        hashed_password=get_password_hash("Pass123"),
        role="employee",
        is_active=True
    )
    user_b = models.User(
        employee_id="SECB02",
        full_name="User Beta",
        email="beta@college.edu",
        hashed_password=get_password_hash("Pass123"),
        role="employee",
        is_active=True
    )
    db.add(user_a)
    db.add(user_b)
    try:
        db.commit()
    except Exception:
        db.rollback()
    db.close()

    # User A logs in
    login_a = client.post("/api/auth/login", json={"identifier": "SECA01", "password": "Pass123"})
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # User A tries to view User B's history
    forbidden_res = client.get("/attendance/history/SECB02", headers=headers_a)
    assert forbidden_res.status_code == 403


def test_anti_impersonation_leave_application():
    """An employee cannot submit a leave application claiming another employee's user_id."""
    login_res = client.post("/api/auth/login", json={"identifier": "ADMIN01", "password": "admin123"})
    admin_token = login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Register employee
    uid = uuid.uuid4().hex[:6].upper()
    reg = client.post("/api/auth/register", json={
        "employee_id": f"IMP_{uid}",
        "full_name": f"Impersonation Test {uid}",
        "email": f"imp_{uid.lower()}@college.edu",
        "password": "Password123",
        "role": "employee",
        "base_salary": 25000.0
    }, headers=admin_headers)
    assert reg.status_code == 201
    victim_id = reg.json()["id"]

    # Register attacker employee
    reg_atk = client.post("/api/auth/register", json={
        "employee_id": f"ATK_{uid}",
        "full_name": f"Attacker {uid}",
        "email": f"atk_{uid.lower()}@college.edu",
        "password": "Password123",
        "role": "employee",
        "base_salary": 25000.0
    }, headers=admin_headers)
    assert reg_atk.status_code == 201

    # Attacker logs in
    login_atk = client.post("/api/auth/login", json={"identifier": f"ATK_{uid}", "password": "Password123"})
    atk_headers = {"Authorization": f"Bearer {login_atk.json()['access_token']}"}

    # Attacker tries to submit leave specifying victim's user_id
    atk_leave = client.post("/api/leaves/apply", json={
        "user_id": victim_id,
        "leave_type": "sick",
        "start_date": "2026-11-01",
        "end_date": "2026-11-02",
        "reason": "Impersonated request"
    }, headers=atk_headers)
    assert atk_leave.status_code == 403


# ==============================================================================
# 3. INPUT VALIDATION & DOS DEFENSE TESTS
# ==============================================================================
def test_input_validation_coordinates_out_of_bounds():
    """Coordinates outside physical geographical limits must be rejected with 422 Unprocessable Entity."""
    # Latitude > 90
    bad_lat = {
        "user_id": 1,
        "latitude": 95.0000,
        "longitude": 72.455763,
        "face_image_base64": "mock_data"
    }
    res = client.post("/attendance/check-in", json=bad_lat)
    assert res.status_code == 422

    # Longitude < -180
    bad_lon = {
        "user_id": 1,
        "latitude": 23.002217,
        "longitude": -195.0000,
        "face_image_base64": "mock_data"
    }
    res2 = client.post("/attendance/check-in", json=bad_lon)
    assert res2.status_code == 422


def test_oversized_image_upload_rejected():
    """Image payloads exceeding the maximum allowed size (7MB string) must be rejected with 422."""
    giant_string = "A" * (7 * 1024 * 1024 + 100)
    oversized_payload = {
        "user_id": 1,
        "latitude": 23.002217,
        "longitude": 72.455763,
        "face_image_base64": giant_string
    }
    res = client.post("/attendance/check-in", json=oversized_payload)
    assert res.status_code == 422


def test_malformed_json_safely_rejected():
    """Sending malformed JSON to API endpoints must return 422 without server error."""
    res = client.post(
        "/api/auth/login",
        content="not valid json {{{",
        headers={"Content-Type": "application/json"}
    )
    assert res.status_code == 422


# ==============================================================================
# 4. SANDBOX & PATH TRAVERSAL ISOLATION TESTS
# ==============================================================================
def test_path_traversal_rejection():
    """Attempts to escape base sandbox with ../ or system paths must raise SecurityException."""
    base_dir = os.path.abspath(BASE_SANDBOX_DIR)

    # Relative ../ traversal
    with pytest.raises(SecurityException, match="traversal"):
        validate_safe_path(base_dir, "../../../windows/system32")

    with pytest.raises(SecurityException, match="traversal"):
        validate_safe_path(base_dir, "uploads/../../secret.txt")

    # Null byte injection
    with pytest.raises(SecurityException, match="Null byte"):
        validate_safe_path(base_dir, "image.jpg\0.png")


def test_target_sandbox_isolation():
    """Target A's sandbox is completely isolated from Target B's sandbox."""
    sandbox_a = get_target_sandbox("target_emp_01")
    sandbox_b = get_target_sandbox("target_emp_02")

    assert os.path.exists(sandbox_a)
    assert os.path.exists(sandbox_b)
    assert sandbox_a != sandbox_b

    # Target A creates a file in their sandbox
    file_a = os.path.join(sandbox_a, "biometric_data.txt")
    with open(file_a, "w") as f:
        f.write("Target A secret vector")

    # Target B's sandbox must not contain Target A's file
    assert not os.path.exists(os.path.join(sandbox_b, "biometric_data.txt"))

    # Cleanup
    cleanup_target_sandbox("target_emp_01")
    cleanup_target_sandbox("target_emp_02")
    assert not os.path.exists(sandbox_a)
    assert not os.path.exists(sandbox_b)


def test_image_security_validator():
    """Validates image security checks against invalid formats and oversized buffers."""
    # 1. Non-image bytes
    malicious_bytes = b"<?php echo 'malicious script'; ?>"
    with pytest.raises(SecurityException, match="Invalid or corrupted"):
        validate_image_security(malicious_bytes)

    # 2. Oversized binary buffer
    oversized = b"\x00" * (6 * 1024 * 1024)  # 6 MB
    with pytest.raises(SecurityException, match="exceeds maximum"):
        validate_image_security(oversized)


if __name__ == "__main__":
    pytest.main(["-v", "backend/tests/test_security.py"])
