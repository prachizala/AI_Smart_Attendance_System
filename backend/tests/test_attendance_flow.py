import pytest
import json
import uuid
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models

client = TestClient(app)

OFFICE_LAT = 23.002217
OFFICE_LON = 72.455763


from tests.helpers import get_admin_headers

def test_full_attendance_lifecycle():
    uid = uuid.uuid4().hex[:6].upper()
    emp_payload = {
        "employee_id": f"EMP_{uid}",
        "full_name": f"Candidate {uid}",
        "email": f"candidate_{uid.lower()}@college.edu",
        "password": "Password123",
        "role": "employee",
        "base_salary": 32000.0
    }
    reg_res = client.post("/api/auth/register", json=emp_payload, headers=get_admin_headers())
    assert reg_res.status_code == 201
    user_id = reg_res.json()["id"]

    # 2. Gate 1 Test: Rejection when outside office geofence
    outside_payload = {
        "user_id": user_id,
        "latitude": 23.500000,
        "longitude": 73.000000,
        "face_image_base64": "mock_data"
    }
    outside_res = client.post("/api/attendance/check-in", json=outside_payload)
    assert outside_res.status_code in [400, 403]
    assert "outside office" in outside_res.json()["detail"].lower()

    # 3. Gate 2 Test: Rejection when no registered face profile exists
    inside_payload = {
        "user_id": user_id,
        "latitude": OFFICE_LAT,
        "longitude": OFFICE_LON,
        "face_image_base64": "mock_data"
    }
    no_face_res = client.post("/api/attendance/check-in", json=inside_payload)
    assert no_face_res.status_code == 400
    assert "No registered biometric" in no_face_res.json()["detail"]

    # Enroll user's face representation directly into DB for test
    mock_vector = [0.15] * 128
    db = SessionLocal()
    user = db.query(models.User).filter(models.User.id == user_id).first()
    user.face_embedding = json.dumps(mock_vector)
    db.commit()
    db.close()

    # 4. Gate 2 Test: Biometric face mismatch rejection
    with patch("routes.attendance.extract_face_embedding", return_value=[0.85] * 128), \
         patch("services.face_service.extract_face_embedding", return_value=[0.85] * 128):
        mismatch_res = client.post("/api/attendance/check-in", json=inside_payload)
        assert mismatch_res.status_code == 401
        assert "Face verification failed" in mismatch_res.json()["detail"]

    # 5. Successful Check-In: Inside geofence AND matching face
    with patch("routes.attendance.extract_face_embedding", return_value=mock_vector), \
         patch("services.face_service.extract_face_embedding", return_value=mock_vector):
        success_res = client.post("/api/attendance/check-in", json=inside_payload)
        assert success_res.status_code == 200
        checkin_data = success_res.json()
        assert checkin_data["face_verified"] is True
        assert checkin_data["location_verified"] is True
        assert checkin_data["employee_id"] == f"EMP_{uid}"
        assert checkin_data["check_in"] is not None

    # 6. Gate 3 Test: Anti-duplicate check-in on the same day
    with patch("routes.attendance.extract_face_embedding", return_value=mock_vector), \
         patch("services.face_service.extract_face_embedding", return_value=mock_vector):
        dup_res = client.post("/api/attendance/check-in", json=inside_payload)
        assert dup_res.status_code == 409
        assert "already checked in" in dup_res.json()["detail"].lower()

    # 7. Check-Out Successful
    checkout_payload = {
        "user_id": user_id,
        "latitude": OFFICE_LAT,
        "longitude": OFFICE_LON
    }
    checkout_res = client.post("/api/attendance/check-out", json=checkout_payload)
    assert checkout_res.status_code == 200
    assert checkout_res.json()["check_out"] is not None

    # 8. Duplicate Check-Out Rejection
    dup_checkout_res = client.post("/api/attendance/check-out", json=checkout_payload)
    assert dup_checkout_res.status_code == 409
    assert "Already checked out" in dup_checkout_res.json()["detail"]


if __name__ == "__main__":
    pytest.main(["-v", "backend/tests/test_attendance_flow.py"])
