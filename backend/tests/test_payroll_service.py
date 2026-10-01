import pytest
import uuid
from datetime import date
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models
from services.payroll_service import calculate_monthly_pay, calculate_employee_payroll
from tests.helpers import get_admin_headers

client = TestClient(app)


def test_calculate_monthly_pay_math():
    # 1. Standard calculation: 30,000 base, 30 working days, 20 present days
    # per_day = 1000.0, net = 20,000.0
    pay = calculate_monthly_pay(base=30000.0, total_days=30, present=20)
    assert pay == 20000.0

    # 2. Perfect attendance: 30 days present -> full salary
    pay_full = calculate_monthly_pay(base=45000.0, total_days=30, present=30)
    assert pay_full == 45000.0

    # 3. Fractional days (e.g., half day = 0.5)
    pay_half = calculate_monthly_pay(base=30000.0, total_days=30, present=20.5)
    assert pay_half == 20500.0

    # 4. Zero division handling
    with pytest.raises(ValueError, match="must be greater than 0"):
        calculate_monthly_pay(base=30000.0, total_days=0, present=10)

    # 5. Negative base salary handling
    with pytest.raises(ValueError, match="cannot be negative"):
        calculate_monthly_pay(base=-5000.0, total_days=30, present=10)


def test_payroll_summary_api_endpoint():
    uid = uuid.uuid4().hex[:6].upper()
    emp_code = f"PAYROLL_{uid}"
    
    # 1. Register employee with base salary 36,000 (1,200 per day for 30 days)
    reg_res = client.post("/api/auth/register", json={
        "employee_id": emp_code,
        "full_name": f"Payroll Test User {uid}",
        "email": f"pay_{uid.lower()}@college.edu",
        "password": "Password123",
        "role": "employee",
        "base_salary": 36000.0
    }, headers=get_admin_headers())
    assert reg_res.status_code == 201
    user_id = reg_res.json()["id"]

    db = SessionLocal()
    try:
        # 2. Add 2 attendance records for September 2026
        att1 = models.Attendance(
            user_id=user_id,
            date=date(2026, 9, 1),
            face_verified=True,
            location_verified=True,
            status="present"
        )
        att2 = models.Attendance(
            user_id=user_id,
            date=date(2026, 9, 2),
            face_verified=True,
            location_verified=True,
            status="present"
        )
        db.add_all([att1, att2])

        # 3. Add 1 approved leave request for September 2026
        leave = models.LeaveRequest(
            user_id=user_id,
            leave_type="academic",
            start_date=date(2026, 9, 5),
            end_date=date(2026, 9, 5),
            reason="BCA Project Paper Presentation",
            status="approved"
        )
        db.add(leave)
        db.commit()
    finally:
        db.close()

    # 4. Query GET /payroll/summary/{employee_id}
    # Expected: 2 present days + 1 approved leave = 3 payable days
    # Rate: 36,000 / 30 = 1,200 / day
    # Payout: 3 * 1,200 = 3,600.0
    # Deductions: 36,000 - 3,600 = 32,400.0
    res = client.get(f"/payroll/summary/{emp_code}?month=9&year=2026&working_days=30", headers=get_admin_headers())
    assert res.status_code == 200
    data = res.json()

    assert data["employee_id"] == emp_code
    assert data["base_salary"] == 36000.0
    assert data["working_days"] == 30
    assert data["days_present"] == 2
    assert data["paid_leaves"] == 1
    assert data["payable_days"] == 3
    assert data["absent_days"] == 27
    assert data["per_day_salary"] == 1200.0
    assert data["final_payout"] == 3600.0
    assert data["deductions"] == 32400.0
    assert "formula" in data


def test_payroll_summary_not_found():
    res = client.get("/payroll/summary/NONEXISTENT_999", headers=get_admin_headers())
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()
