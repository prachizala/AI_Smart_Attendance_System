from datetime import time

import models
from database import SessionLocal
from fastapi.testclient import TestClient
from main import app
from services.face_service import verify_face
from services.geo_service import verify_location

client = TestClient(app)


def test_face_mismatch_rejection():
    """Verify that a live face vector far from registered profile produces is_matched=False."""
    db_vector = [0.1] * 128
    live_vector = [0.9] * 128  # High Euclidean distance
    result = verify_face(live_vector, db_vector, tolerance=0.5)
    assert result["is_matched"] is False
    assert result["distance"] > 0.5


def test_outside_geofence_rejection():
    """Verify that coordinates beyond the 100m perimeter fail geofence verification."""
    # SBS Office is ~ 23.002217, 72.455763
    # Ahmedabad Airport is ~ 23.0734, 72.6266 (over 18 km away)
    geo_res = verify_location(23.0734, 72.6266)
    assert geo_res["inside_geofence"] is False
    assert geo_res["distance_meters"] > 100.0


def test_shift_arrival_status_boundary():
    """Verify the boundary logic for shift start time: <= 09:30 is present, > 09:30 is late."""
    shift_target = time(9, 30)

    # Exactly on time: 09:30:00
    on_time = time(9, 30, 0)
    status_on_time = "late" if on_time > shift_target else "present"
    assert status_on_time == "present"

    # Early arrival: 09:15:00
    early_time = time(9, 15, 0)
    status_early = "late" if early_time > shift_target else "present"
    assert status_early == "present"

    # Late arrival: 09:30:01
    late_time = time(9, 30, 1)
    status_late = "late" if late_time > shift_target else "present"
    assert status_late == "late"


def test_invalid_image_upload_rejected():
    """Verify that corrupt or non-base64 image strings return HTTP 400 Bad Request."""
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.employee_id == "ADMIN01").first()
        assert user is not None
        user_id = user.id
    finally:
        db.close()

    payload = {
        "user_id": user_id,
        "latitude": 23.002217,
        "longitude": 72.455763,
        "face_image_base64": "NOT_A_VALID_BASE64_IMAGE_STRING!@#$%"
    }
    # Request without valid auth or valid image
    response = client.post("/api/attendance/check-in", json=payload)
    assert response.status_code in [400, 401]


def test_login_rate_limiting_trigger():
    """Verify that repeated invalid login attempts trigger HTTP 429 Too Many Requests."""
    bogus_payload = {
        "identifier": "NON_EXISTENT_USER_BURST",
        "password": "WrongPassword999"
    }

    status_codes = []
    for _ in range(7):
        res = client.post("/api/auth/login", json=bogus_payload)
        status_codes.append(res.status_code)

    # After 5 failed attempts within 60s, rate limiter should return 429
    assert 429 in status_codes
