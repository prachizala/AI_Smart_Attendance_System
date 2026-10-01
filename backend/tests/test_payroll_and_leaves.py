import pytest
import uuid
from datetime import date
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models

client = TestClient(app)


from tests.helpers import get_admin_headers

def test_leave_application_and_approval():
    uid = uuid.uuid4().hex[:6].upper()
    emp_res = client.post("/api/auth/register", json={
        "employee_id": f"PAY_{uid}",
        "full_name": f"Payroll Candidate {uid}",
        "email": f"pay_{uid.lower()}@college.edu",
        "password": "Password123",
        "role": "employee",
        "base_salary": 30000.0
    }, headers=get_admin_headers())
    assert emp_res.status_code == 201
    user_id = emp_res.json()["id"]

    # 1. Apply for leave
    leave_payload = {
        "user_id": user_id,
        "leave_type": "sick",
        "start_date": "2026-10-05",
        "end_date": "2026-10-05",
        "reason": "Viral fever recovery"
    }
    leave_res = client.post("/api/leaves/apply", json=leave_payload)
    assert leave_res.status_code == 200
    leave_data = leave_res.json()
    assert leave_data["status"] == "pending"
    assert leave_data["employee_id"] == f"PAY_{uid}"
    leave_id = leave_data["id"]

    # 2. Admin reviews and approves leave
    review_res = client.put(
        f"/api/leaves/{leave_id}/review?status_update=approved&remarks=Get%20well%20soon",
        headers=get_admin_headers()
    )
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "approved"
    assert review_res.json()["admin_remarks"] == "Get well soon"

    # 3. Simulate 1 present day attendance in DB for October 2026
    db = SessionLocal()
    att = models.Attendance(
        user_id=user_id,
        date=date(2026, 10, 1),
        face_verified=True,
        location_verified=True,
        status="present"
    )
    db.add(att)
    db.commit()
    db.close()

    # 4. Generate academic payroll for October 2026 (Month 10)
    # Expected: 1 present day + 1 approved leave = 2 payable days
    # Daily rate: 30000 / 30 = 1000.0
    # Net salary: 2 * 1000.0 = 2000.0
    payroll_payload = {
        "month": 10,
        "year": 2026,
        "user_id": user_id
    }
    pay_res = client.post("/api/payroll/generate", json=payroll_payload, headers=get_admin_headers())
    assert pay_res.status_code == 200
    pay_list = pay_res.json()
    assert len(pay_list) == 1
    slip = pay_list[0]
    assert slip["employee_id"] == f"PAY_{uid}"
    assert slip["present_days"] == 1
    assert slip["paid_leaves"] == 1
    assert slip["calculated_salary"] == 2000.0


if __name__ == "__main__":
    pytest.main(["-v", "backend/tests/test_payroll_and_leaves.py"])
