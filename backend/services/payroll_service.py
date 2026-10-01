import calendar
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
import models


def calculate_monthly_pay(base: float, total_days: int, present: float) -> float:
    """
    Pure mathematical formula: (Base Salary / Working Days) * Present Days
    Includes ZeroDivisionError guard and round to 2 decimals.
    """
    if total_days <= 0:
        raise ValueError("Total working days in month must be greater than 0.")
    if base < 0:
        raise ValueError("Base salary cannot be negative.")
    if present < 0:
        raise ValueError("Present days cannot be negative.")

    per_day = base / float(total_days)
    return round(per_day * float(present), 2)


def get_month_date_range(year: int, month: int):
    """Returns (start_of_month, end_of_month) as date objects."""
    start_date = date(year, month, 1)
    _, num_days = calendar.monthrange(year, month)
    end_date = date(year, month, num_days)
    return start_date, end_date


def calculate_employee_payroll(
    db: Session,
    employee_identifier: str | int,
    month: Optional[int] = None,
    year: Optional[int] = None,
    working_days: int = 30
) -> Dict[str, Any]:
    """
    Dynamically computes salary breakdown for an employee:
    1. Finds employee from DB by employee_id or integer ID.
    2. Queries attendance table for the specific month/year.
    3. Queries approved leave requests overlapping the month.
    4. Applies formula: (Base Salary / Working Days) * (Present Days + Paid Leaves)
    5. Returns JSON-ready dict with base salary, days present, deductions, final payout.
    """
    if working_days <= 0:
        raise ValueError("Working days must be greater than 0.")

    today = date.today()
    target_month = month if month is not None else today.month
    target_year = year if year is not None else today.year

    if not (1 <= target_month <= 12):
        raise ValueError(f"Invalid month {target_month}. Must be between 1 and 12.")

    # 1. Resolve employee
    query = db.query(models.User)
    if isinstance(employee_identifier, int) or (isinstance(employee_identifier, str) and employee_identifier.isdigit()):
        user = query.filter((models.User.id == int(employee_identifier)) | (models.User.employee_id == str(employee_identifier).upper())).first()
    else:
        user = query.filter(models.User.employee_id == str(employee_identifier).strip().upper()).first()

    if not user:
        raise ValueError(f"Employee '{employee_identifier}' not found in the system.")

    start_of_month, end_of_month = get_month_date_range(target_year, target_month)

    # 2. Query attendance for present days
    present_records = db.query(models.Attendance).filter(
        models.Attendance.user_id == user.id,
        models.Attendance.date >= start_of_month,
        models.Attendance.date <= end_of_month,
        models.Attendance.status.in_(["present", "late", "half_day"])
    ).all()

    days_present = 0.0
    for att in present_records:
        if att.status == "half_day":
            days_present += 0.5
        else:
            days_present += 1.0

    # 3. Query approved leaves overlapping the target month
    approved_leaves = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.user_id == user.id,
        models.LeaveRequest.status == "approved",
        models.LeaveRequest.start_date <= end_of_month,
        models.LeaveRequest.end_date >= start_of_month
    ).all()

    paid_leave_days = 0
    for leave in approved_leaves:
        # Calculate overlap days within this month
        ov_start = max(leave.start_date, start_of_month)
        ov_end = min(leave.end_date, end_of_month)
        if ov_end >= ov_start:
            paid_leave_days += (ov_end - ov_start).days + 1

    # 4. Salary calculation logic
    base_salary = float(user.base_salary or 0.0)
    per_day_salary = round(base_salary / float(working_days), 2)
    payable_days = min(float(working_days), days_present + float(paid_leave_days))

    # Formula: (Base Salary / Working Days in Month) * (Present Days + Paid Leaves)
    final_payout = calculate_monthly_pay(base_salary, working_days, payable_days)

    deductions = round(max(0.0, base_salary - final_payout), 2)
    absent_days = max(0.0, float(working_days) - payable_days)

    return {
        "employee_id": user.employee_id,
        "employee_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "month": target_month,
        "year": target_year,
        "base_salary": round(base_salary, 2),
        "working_days": working_days,
        "days_present": int(days_present) if days_present.is_integer() else days_present,
        "paid_leaves": paid_leave_days,
        "payable_days": int(payable_days) if payable_days.is_integer() else payable_days,
        "absent_days": int(absent_days) if absent_days.is_integer() else absent_days,
        "per_day_salary": per_day_salary,
        "deductions": deductions,
        "final_payout": final_payout,
        "status": "calculated",
        "formula": f"({base_salary:.2f} / {working_days}) * ({days_present} present + {paid_leave_days} paid leaves) = {final_payout:.2f}",
        "calculated_at": datetime.utcnow().isoformat()
    }
