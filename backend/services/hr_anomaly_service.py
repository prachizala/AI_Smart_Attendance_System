import calendar
import csv
import io
from datetime import date, datetime, timedelta
from typing import Any, Dict, Optional

import models
from services.geo_service import calculate_haversine_distance
from sqlalchemy.orm import Session

# =====================================================================
# Domain 1: Anomaly & Fraud Detection Engine (Impossible Velocity)
# =====================================================================

MAX_REASONABLE_GROUND_SPEED_KMH = 120.0  # Max realistic city commute speed in km/h


def detect_punch_anomalies(
    db: Session,
    user: models.User,
    current_lat: float,
    current_lng: float,
    current_time: Optional[datetime] = None
) -> Optional[models.AnomalyLog]:
    """
    Automated HR Anomaly Detection:
    1. Impossible Speed / Distance ('Superman Teleportation Spoof'):
       - Checks distance and elapsed time between current punch and the employee's last recorded punch.
       - e.g. 20 km apart in 5 mins -> 240 km/h = Physically impossible for terrestrial city travel.
       - Immediately flags an AnomalyLog with 'critical' severity.
    2. Rapid Duplicate Punches (< 60 seconds).
    3. Off-Hours Suspicious Check-In (between 11:00 PM and 05:00 AM).
    """
    if current_time is None:
        current_time = datetime.utcnow()

    # Query the employee's most recent attendance record within the last 24 hours
    since_time = current_time.date() - timedelta(days=1)
    recent_records = (
        db.query(models.Attendance)
        .filter(
            models.Attendance.user_id == user.id,
            models.Attendance.date >= since_time,
            models.Attendance.latitude.isnot(None),
            models.Attendance.longitude.isnot(None)
        )
        .order_by(models.Attendance.id.desc())
        .limit(3)
        .all()
    )

    detected_anomaly = None

    if recent_records:
        last_rec = recent_records[0]
        # Determine last punch time (check_out or check_in)
        last_time = last_rec.check_out or last_rec.check_in
        if last_time and last_rec.latitude and last_rec.longitude:
            dist_meters = calculate_haversine_distance(
                last_rec.latitude, last_rec.longitude,
                current_lat, current_lng
            )
            dist_km = dist_meters / 1000.0
            time_delta = current_time - last_time
            time_delta_mins = max(0.01, time_delta.total_seconds() / 60.0)

            speed_kmh = (dist_km / (time_delta_mins / 60.0))

            # Rule 1: Impossible Speed Teleportation (> 120 km/h over > 0.5 km)
            if dist_km > 0.5 and speed_kmh > MAX_REASONABLE_GROUND_SPEED_KMH:
                desc = (
                    f"Impossible Travel Velocity: Employee punched {dist_km:.2f} km away only "
                    f"{time_delta_mins:.1f} minutes after previous punch. "
                    f"Calculated velocity: {speed_kmh:.1f} km/h (Threshold: {MAX_REASONABLE_GROUND_SPEED_KMH} km/h). "
                    f"Suspected GPS spoofing or buddy proxy punching."
                )
                detected_anomaly = models.AnomalyLog(
                    user_id=user.id,
                    anomaly_type="IMPOSSIBLE_SPEED",
                    severity="critical",
                    description=desc,
                    distance_km=round(dist_km, 2),
                    time_delta_mins=round(time_delta_mins, 1),
                    calculated_speed_kmh=round(speed_kmh, 1),
                    latitude=current_lat,
                    longitude=current_lng,
                    created_at=current_time
                )

            # Rule 2: Rapid Consecutive Punches (< 1.5 mins)
            elif time_delta_mins < 1.5 and dist_km < 0.2:
                desc = f"Rapid consecutive punch within {int(time_delta_mins * 60)} seconds."
                detected_anomaly = models.AnomalyLog(
                    user_id=user.id,
                    anomaly_type="RAPID_PUNCH",
                    severity="low",
                    description=desc,
                    distance_km=round(dist_km, 2),
                    time_delta_mins=round(time_delta_mins, 1),
                    calculated_speed_kmh=round(speed_kmh, 1),
                    latitude=current_lat,
                    longitude=current_lng,
                    created_at=current_time
                )

    # Rule 3: Off-hours punch (between 11:00 PM and 5:00 AM)
    if not detected_anomaly and (current_time.hour >= 23 or current_time.hour < 5):
        desc = f"Unscheduled off-hours punch logged at {current_time.strftime('%H:%M:%S UTC')}."
        detected_anomaly = models.AnomalyLog(
            user_id=user.id,
            anomaly_type="OFF_HOURS",
            severity="medium",
            description=desc,
            latitude=current_lat,
            longitude=current_lng,
            created_at=current_time
        )

    if detected_anomaly:
        db.add(detected_anomaly)
        db.flush()

    return detected_anomaly


def log_spoof_anomaly(
    db: Session,
    user_id: int,
    attack_type: str,
    liveness_score: float,
    current_lat: Optional[float] = None,
    current_lng: Optional[float] = None
) -> models.AnomalyLog:
    """Logs an anti-spoofing rejection into the HR Anomaly table."""
    desc = (
        f"AI Anti-Spoofing Triggered: Proxy punch blocked ({attack_type}). "
        f"Liveness confidence score was {liveness_score:.1f}% (Required: >= 60.0%)."
    )
    anomaly = models.AnomalyLog(
        user_id=user_id,
        anomaly_type="SPOOF_ATTEMPT",
        severity="high",
        description=desc,
        latitude=current_lat,
        longitude=current_lng,
        created_at=datetime.utcnow()
    )
    db.add(anomaly)
    db.flush()
    return anomaly


# =====================================================================
# Domain 2: Automated Overtime & Hours Calculation Engine
# =====================================================================

STANDARD_SHIFT_HOURS = 8.0  # Standard daily work shift in hours (480 minutes)


def compute_daily_overtime(
    check_in: Optional[datetime],
    check_out: Optional[datetime],
    standard_shift_hours: float = STANDARD_SHIFT_HOURS
) -> Dict[str, Any]:
    """Calculates total hours worked and overtime minutes for an attendance record."""
    if not check_in or not check_out:
        return {"working_hours": 0.0, "overtime_minutes": 0, "overtime_hours": 0.0}

    duration = check_out - check_in
    total_minutes = max(0, int(duration.total_seconds() // 60))
    working_hours = round(total_minutes / 60.0, 2)

    standard_minutes = int(standard_shift_hours * 60)
    overtime_minutes = max(0, total_minutes - standard_minutes)
    overtime_hours = round(overtime_minutes / 60.0, 2)

    return {
        "working_hours": working_hours,
        "overtime_minutes": overtime_minutes,
        "overtime_hours": overtime_hours
    }


def get_monthly_overtime_summary(
    db: Session,
    month: Optional[int] = None,
    year: Optional[int] = None
) -> Dict[str, Any]:
    """
    Computes company-wide or departmental overtime aggregation for HR:
    - Total Overtime Hours Logged
    - Total Estimated Overtime Liability (1.5x Hourly Rate)
    - Top Overtime Workers
    - Flagged Anomaly Count
    """
    today = date.today()
    target_month = month or today.month
    target_year = year or today.year

    start_date = date(target_year, target_month, 1)
    _, num_days = calendar.monthrange(target_year, target_month)
    end_date = date(target_year, target_month, num_days)

    # Query all attendances in month
    attendances = (
        db.query(models.Attendance)
        .filter(
            models.Attendance.date >= start_date,
            models.Attendance.date <= end_date
        )
        .all()
    )

    total_overtime_minutes = 0
    total_working_hours = 0.0
    user_overtime_map: Dict[int, int] = {}

    for att in attendances:
        ot = att.overtime_minutes or 0
        wh = att.working_hours or 0.0
        total_overtime_minutes += ot
        total_working_hours += wh
        user_overtime_map[att.user_id] = user_overtime_map.get(att.user_id, 0) + ot

    total_overtime_hours = round(total_overtime_minutes / 60.0, 2)

    # Calculate monetary liability (base salary / 30 / 8 * 1.5 * overtime_hours)
    users = db.query(models.User).filter(models.User.id.in_(list(user_overtime_map.keys()))).all() if user_overtime_map else []
    user_dict = {u.id: u for u in users}

    total_overtime_payout = 0.0
    top_workers = []

    for uid, ot_mins in sorted(user_overtime_map.items(), key=lambda x: x[1], reverse=True)[:5]:
        u = user_dict.get(uid)
        if u:
            hourly_wage = float(u.base_salary or 30000.0) / (30.0 * 8.0)
            ot_hrs = round(ot_mins / 60.0, 2)
            payout = round(ot_hrs * hourly_wage * 1.5, 2)
            total_overtime_payout += payout
            top_workers.append({
                "employee_id": u.employee_id,
                "full_name": u.full_name,
                "department": u.department,
                "overtime_hours": ot_hrs,
                "overtime_payout": payout
            })

    # Count anomalies in target month
    anomalies_count = (
        db.query(models.AnomalyLog)
        .filter(
            models.AnomalyLog.created_at >= datetime(target_year, target_month, 1),
            models.AnomalyLog.created_at <= datetime(target_year, target_month, num_days, 23, 59, 59)
        )
        .count()
    )

    return {
        "month": target_month,
        "year": target_year,
        "total_working_hours": round(total_working_hours, 2),
        "total_overtime_hours": total_overtime_hours,
        "estimated_overtime_payout": round(total_overtime_payout, 2),
        "flagged_anomalies_count": anomalies_count,
        "top_overtime_workers": top_workers
    }


# =====================================================================
# Domain 3: Instant Payslip Generator (CSV & Professional HTML/PDF)
# =====================================================================

def generate_monthly_payslips_csv(
    db: Session,
    month: Optional[int] = None,
    year: Optional[int] = None
) -> str:
    """Generates standard CSV containing employee attendance, overtime, and calculated salaries."""
    today = date.today()
    target_month = month or today.month
    target_year = year or today.year

    start_date = date(target_year, target_month, 1)
    _, num_days = calendar.monthrange(target_year, target_month)
    end_date = date(target_year, target_month, num_days)

    employees = db.query(models.User).filter(models.User.is_active.is_(True)).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # CSV Header
    writer.writerow([
        "Employee ID",
        "Employee Name",
        "Department",
        "Base Salary (INR)",
        "Month",
        "Year",
        "Days Present",
        "Paid Leaves",
        "Regular Hours",
        "Overtime Hours",
        "Overtime Bonus (1.5x INR)",
        "Unpaid Deductions (INR)",
        "Net Payable Salary (INR)",
        "Status"
    ])

    for emp in employees:
        # Fetch month attendances
        atts = (
            db.query(models.Attendance)
            .filter(
                models.Attendance.user_id == emp.id,
                models.Attendance.date >= start_date,
                models.Attendance.date <= end_date,
                models.Attendance.status.in_(["present", "late", "half_day"])
            )
            .all()
        )

        days_present = sum(0.5 if a.status == "half_day" else 1.0 for a in atts)
        total_ot_mins = sum(a.overtime_minutes or 0 for a in atts)
        total_wh = sum(a.working_hours or 0.0 for a in atts)
        ot_hours = round(total_ot_mins / 60.0, 2)

        # Approved leaves
        leaves = (
            db.query(models.LeaveRequest)
            .filter(
                models.LeaveRequest.user_id == emp.id,
                models.LeaveRequest.status == "approved",
                models.LeaveRequest.start_date <= end_date,
                models.LeaveRequest.end_date >= start_date
            )
            .all()
        )
        paid_leave_days = 0
        for leave in leaves:
            ov_start = max(leave.start_date, start_date)
            ov_end = min(leave.end_date, end_date)
            if ov_end >= ov_start:
                paid_leave_days += (ov_end - ov_start).days + 1

        base = float(emp.base_salary or 30000.0)
        payable_days = min(float(num_days), days_present + float(paid_leave_days))
        per_day = base / float(num_days)
        base_earned = round(per_day * payable_days, 2)
        deductions = round(max(0.0, base - base_earned), 2)

        # Overtime rate: (Base / 30 / 8) * 1.5
        hourly_rate = base / (30.0 * 8.0)
        ot_bonus = round(ot_hours * hourly_rate * 1.5, 2)

        net_salary = round(base_earned + ot_bonus, 2)

        writer.writerow([
            emp.employee_id,
            emp.full_name,
            emp.department or "General",
            f"{base:.2f}",
            target_month,
            target_year,
            days_present,
            paid_leave_days,
            round(total_wh, 2),
            ot_hours,
            f"{ot_bonus:.2f}",
            f"{deductions:.2f}",
            f"{net_salary:.2f}",
            "Calculated"
        ])

    return output.getvalue()


def generate_payslip_html(
    db: Session,
    employee_identifier: str | int,
    month: Optional[int] = None,
    year: Optional[int] = None
) -> str:
    """
    Renders an official, beautifully formatted corporate payslip in HTML/CSS
    ready for in-browser printing or PDF download.
    """
    today = date.today()
    target_month = month or today.month
    target_year = year or today.year

    # Find employee
    if isinstance(employee_identifier, int) or (isinstance(employee_identifier, str) and employee_identifier.isdigit()):
        user = db.query(models.User).filter((models.User.id == int(employee_identifier)) | (models.User.employee_id == str(employee_identifier).upper())).first()
    else:
        user = db.query(models.User).filter(models.User.employee_id == str(employee_identifier).strip().upper()).first()

    if not user:
        raise ValueError(f"Employee '{employee_identifier}' not found.")

    start_date = date(target_year, target_month, 1)
    _, num_days = calendar.monthrange(target_year, target_month)
    end_date = date(target_year, target_month, num_days)

    # Attendances
    atts = (
        db.query(models.Attendance)
        .filter(
            models.Attendance.user_id == user.id,
            models.Attendance.date >= start_date,
            models.Attendance.date <= end_date,
            models.Attendance.status.in_(["present", "late", "half_day"])
        )
        .all()
    )

    days_present = sum(0.5 if a.status == "half_day" else 1.0 for a in atts)
    total_ot_mins = sum(a.overtime_minutes or 0 for a in atts)
    # Total working hours summary\n    sum(a.working_hours or 0.0 for a in atts)
    ot_hours = round(total_ot_mins / 60.0, 2)

    # Approved leaves
    leaves = (
        db.query(models.LeaveRequest)
        .filter(
            models.LeaveRequest.user_id == user.id,
            models.LeaveRequest.status == "approved",
            models.LeaveRequest.start_date <= end_date,
            models.LeaveRequest.end_date >= start_date
        )
        .all()
    )
    paid_leave_days = sum((min(leave.end_date, end_date) - max(leave.start_date, start_date)).days + 1 for leave in leaves)

    base = float(user.base_salary or 30000.0)
    hra = round(base * 0.20, 2)  # 20% HRA
    special_allowance = round(base * 0.10, 2)  # 10% Special Allowance

    per_day = base / float(num_days)
    payable_days = min(float(num_days), days_present + float(paid_leave_days))
    earned_basic = round(per_day * payable_days, 2)
    unpaid_deduction = round(max(0.0, base - earned_basic), 2)

    # Overtime calculation (1.5x)
    hourly_rate = base / (30.0 * 8.0)
    ot_bonus = round(ot_hours * hourly_rate * 1.5, 2)

    prof_tax = 200.00 if base > 12000 else 0.0
    total_earnings = round(earned_basic + hra + special_allowance + ot_bonus, 2)
    total_deductions = round(unpaid_deduction + prof_tax, 2)
    net_payable = round(total_earnings - total_deductions, 2)

    month_name = calendar.month_name[target_month]

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payslip - {user.full_name} ({month_name} {target_year})</title>
  <style>
    @media print {{
      body {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
      .no-print {{ display: none !important; }}
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 30px;
    }}
    .payslip-card {{
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
      padding: 40px;
    }}
    .header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #4f46e5;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }}
    .company-name {{
      font-size: 22px;
      font-weight: 800;
      color: #1e1b4b;
      letter-spacing: -0.5px;
    }}
    .company-sub {{
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
    }}
    .payslip-badge {{
      background: #e0e7ff;
      color: #3730a3;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .meta-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
      font-size: 13px;
    }}
    .meta-item {{ display: flex; justify-content: space-between; }}
    .meta-label {{ color: #64748b; font-weight: 500; }}
    .meta-value {{ color: #0f172a; font-weight: 700; }}
    .tables-wrap {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }}
    th {{
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 10px 14px;
      border-radius: 6px;
    }}
    td {{
      padding: 10px 14px;
      border-bottom: 1px solid #f1f5f9;
    }}
    td.num {{ text-align: right; font-weight: 600; font-family: monospace; }}
    .net-box {{
      background: linear-gradient(135deg, #4f46e5, #4338ca);
      color: #ffffff;
      padding: 20px;
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 24px;
    }}
    .net-title {{ font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; }}
    .net-amount {{ font-size: 28px; font-weight: 800; font-family: monospace; }}
    .footer-stamp {{
      margin-top: 36px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 11px;
      color: #94a3b8;
    }}
    .stamp-badge {{
      display: inline-block;
      border: 2px dashed #10b981;
      color: #059669;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
    }}
    .print-btn {{
      background: #4f46e5;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
      margin-bottom: 20px;
    }}
    .print-btn:hover {{ background: #4338ca; }}
  </style>
</head>
<body>
  <div class="no-print" style="max-width: 800px; margin: 0 auto; display: flex; justify-content: flex-end;">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <div class="payslip-card">
    <div class="header">
      <div>
        <div class="company-name">SBS SHANTI BUSINESS SCHOOL</div>
        <div class="company-sub">Shela, Ahmedabad, Gujarat 380058 • AI Workforce Division</div>
      </div>
      <div class="payslip-badge">PAYSLIP: {month_name.upper()} {target_year}</div>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><span class="meta-label">Employee Name:</span><span class="meta-value">{user.full_name}</span></div>
      <div class="meta-item"><span class="meta-label">Employee ID:</span><span class="meta-value">{user.employee_id}</span></div>
      <div class="meta-item"><span class="meta-label">Department:</span><span class="meta-value">{user.department or 'Computer Applications'}</span></div>
      <div class="meta-item"><span class="meta-label">Designation:</span><span class="meta-value">{user.designation or 'Employee'}</span></div>
      <div class="meta-item"><span class="meta-label">Working Days in Month:</span><span class="meta-value">{num_days} Days</span></div>
      <div class="meta-item"><span class="meta-label">Days Present:</span><span class="meta-value">{days_present} Days</span></div>
      <div class="meta-item"><span class="meta-label">Paid Leaves Approved:</span><span class="meta-value">{paid_leave_days} Days</span></div>
      <div class="meta-item"><span class="meta-label">Total Overtime Hours:</span><span class="meta-value" style="color:#4f46e5;">{ot_hours} hrs</span></div>
    </div>

    <div class="tables-wrap">
      <!-- Earnings Table -->
      <div>
        <table>
          <thead>
            <tr><th>Earnings (Benefits)</th><th style="text-align:right;">Amount (INR)</th></tr>
          </thead>
          <tbody>
            <tr><td>Earned Basic Pay</td><td class="num">₹ {earned_basic:,.2f}</td></tr>
            <tr><td>House Rent Allowance (HRA)</td><td class="num">₹ {hra:,.2f}</td></tr>
            <tr><td>Special Allowance</td><td class="num">₹ {special_allowance:,.2f}</td></tr>
            <tr style="background:#f0fdf4;"><td><strong>AI Overtime Bonus (1.5x)</strong></td><td class="num" style="color:#059669; font-weight:700;">+ ₹ {ot_bonus:,.2f}</td></tr>
            <tr style="font-weight:700; border-top:2px solid #e2e8f0;"><td>Total Gross Earnings</td><td class="num">₹ {total_earnings:,.2f}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Deductions Table -->
      <div>
        <table>
          <thead>
            <tr><th>Deductions</th><th style="text-align:right;">Amount (INR)</th></tr>
          </thead>
          <tbody>
            <tr><td>Unpaid Absence / LOP</td><td class="num">₹ {unpaid_deduction:,.2f}</td></tr>
            <tr><td>Professional Tax (PT)</td><td class="num">₹ {prof_tax:,.2f}</td></tr>
            <tr><td>Provident Fund (PF)</td><td class="num">₹ 0.00</td></tr>
            <tr style="font-weight:700; border-top:2px solid #e2e8f0;"><td>Total Deductions</td><td class="num" style="color:#dc2626;">- ₹ {total_deductions:,.2f}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="net-box">
      <div>
        <div class="net-title">Net Take-Home Payable Amount</div>
        <div style="font-size:12px; opacity:0.8; margin-top:2px;">Disbursed via Direct Bank Transfer</div>
      </div>
      <div class="net-amount">₹ {net_payable:,.2f}</div>
    </div>

    <div class="footer-stamp">
      <div>
        <div>Generated by: AI Smart Attendance HR Intelligence Engine</div>
        <div>Timestamp: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</div>
      </div>
      <div class="stamp-badge">
        ✓ DIGITAL AUTHENTICATED
      </div>
    </div>
  </div>
</body>
</html>"""
