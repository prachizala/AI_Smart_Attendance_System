import pytest
import json
import uuid
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models

client = TestClient(app)

from tests.helpers import get_admin_headers

OFFICE_LAT = 23.002217
OFFICE_LON = 72.455763


def test_routes_check_in_and_check_out():
    uid = uuid.uuid4().hex[:6].upper()
    emp_res = client.post("/api/auth/register", json={
        "employee_id": f"RT_{uid}",
        "full_name": f"Route Tester {uid}",
        "email": f"rt_{uid.lower()}@college.edu",
        "password": "Password123",
        "role": "employee",
        "base_salary": 35000.0
    }, headers=get_admin_headers())
    assert emp_res.status_code == 201
    user_id = emp_res.json()["id"]

    # Enroll mock face vector in DB
    mock_vector = [0.2] * 128
    db = SessionLocal()
    user = db.query(models.User).filter(models.User.id == user_id).first()
    user.face_embedding = json.dumps(mock_vector)
    db.commit()
    db.close()

    # 1. Gate 1 Test: Outside geofence -> MUST ABORT 403 FORBIDDEN
    outside_payload = {
        "user_id": user_id,
        "latitude": 23.2000,  # ~15 km away from Naroda
        "longitude": 73.0000,
        "face_image_base64": "mock_selfie"
    }
    outside_res = client.post("/attendance/check-in", json=outside_payload)
    assert outside_res.status_code == 403
    assert "outside office perimeter" in outside_res.json()["detail"]

    # 2. Gate 2 Test: Inside geofence, but face mismatch -> MUST ABORT 401 UNAUTHORIZED
    inside_payload = {
        "user_id": user_id,
        "latitude": OFFICE_LAT,
        "longitude": OFFICE_LON,
        "face_image_base64": "mock_selfie"
    }
    with patch("routes.attendance.extract_face_embedding", return_value=[0.9] * 128):
        mismatch_res = client.post("/attendance/check-in", json=inside_payload)
        assert mismatch_res.status_code == 401
        assert "Face verification failed" in mismatch_res.json()["detail"]

    # 3. Successful Check-In: Inside geofence AND matching face -> 200 OK
    with patch("routes.attendance.extract_face_embedding", return_value=mock_vector):
        success_res = client.post("/attendance/check-in", json=inside_payload)
        assert success_res.status_code == 200
        data = success_res.json()
        assert data["face_verified"] is True
        assert data["location_verified"] is True
        assert data["check_in"] is not None

    # 4. Gate 3 Test: Duplicate Check-In on same date -> 409 CONFLICT
    with patch("routes.attendance.extract_face_embedding", return_value=mock_vector):
        dup_res = client.post("/attendance/check-in", json=inside_payload)
        assert dup_res.status_code == 409
        assert "Duplicate check-in rejected" in dup_res.json()["detail"]

    # 5. Check-Out: Outside geofence -> 403 FORBIDDEN
    checkout_outside = {
        "user_id": user_id,
        "latitude": 19.2000,
        "longitude": 73.0000
    }
    chk_out_outside_res = client.post("/attendance/check-out", json=checkout_outside)
    assert chk_out_outside_res.status_code == 403

    # 6. Check-Out: Inside geofence -> 200 OK with check_out timestamp
    checkout_inside = {
        "user_id": user_id,
        "latitude": OFFICE_LAT,
        "longitude": OFFICE_LON
    }
    chk_out_res = client.post("/attendance/check-out", json=checkout_inside)
    assert chk_out_res.status_code == 200
    assert chk_out_res.json()["check_out"] is not None

    # 7. Attendance History: GET /attendance/history/{employee_id}
    hist_res = client.get(f"/attendance/history/RT_{uid}")
    assert hist_res.status_code == 200
    hist_list = hist_res.json()
    assert len(hist_list) >= 1
    assert hist_list[0]["employee_id"] == f"RT_{uid}"
    assert hist_list[0]["check_in"] is not None
    assert hist_list[0]["check_out"] is not None
    assert "late_minutes" in hist_list[0]
    assert "early_exit" in hist_list[0]
    assert "overtime_minutes" in hist_list[0]
    assert "distance_meters" in hist_list[0]
    assert "status" in hist_list[0]


if __name__ == "__main__":
    pytest.main(["-v", "backend/tests/test_routes_attendance.py"])
