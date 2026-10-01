"""
Database Seeding Script for College Viva & Demonstration
Populates exactly 20 employees (1 Real: EMP001 Zala Prachi, 19 Demo: EMP002-EMP020),
plus 1 Admin (ADMIN01 HOD Dr. S. K. Kulkarni), with realistic departments, designations,
attendance logs, leave applications, and payroll records.
"""

import sys
import os
import sqlite3
from datetime import datetime, date, timedelta
from passlib.context import CryptContext

# Set UTF-8 encoding for Windows standard output safety
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base, DEFAULT_DB_PATH
import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_pw(password: str) -> str:
    return pwd_context.hash(password)

def ensure_schema_migrations():
    """Ensure newly introduced profile columns exist in SQLite users table."""
    conn = sqlite3.connect(DEFAULT_DB_PATH)
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(users)")
    existing_cols = [row[1] for row in cur.fetchall()]
    
    new_cols = [
        ("phone", "VARCHAR(20)"),
        ("department", "VARCHAR(100) DEFAULT 'Computer Applications'"),
        ("designation", "VARCHAR(100) DEFAULT 'Employee'"),
    ]
    for col_name, col_type in new_cols:
        if col_name not in existing_cols:
            print(f"[INFO] Adding missing column '{col_name}' to users table...")
            cur.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
    conn.commit()
    conn.close()

def seed_database():
    print("[INFO] Initializing Database Tables...")
    Base.metadata.create_all(bind=engine)
    ensure_schema_migrations()
    
    db = SessionLocal()

    try:
        print("[INFO] Seeding Workforce Registry (1 Real + 19 Demo Employees + 1 Admin)...")
        
        # Exact Specification for 20 Employees + 1 Admin
        users_data = [
            # 1. ADMIN USER
            {
                "employee_id": "ADMIN01",
                "full_name": "Dr. S. K. Kulkarni (HOD)",
                "email": "hod@college.edu",
                "phone": "9825100001",
                "department": "Administration",
                "designation": "HOD & Professor",
                "hashed_password": hash_pw("admin123"),
                "role": "admin",
                "base_salary": 85000.0,
                "face_embedding": None,
            },
            # 2. REAL EMPLOYEE: EMP001 — Zala Prachi
            {
                "employee_id": "EMP001",
                "full_name": "Zala Prachi",
                "email": "prachizala2003@gmail.com",
                "phone": "7698951982",
                "department": "Computer Applications",
                "designation": "Employee",
                "hashed_password": hash_pw("Prachi@123"),
                "role": "employee",
                "base_salary": 45000.0,
                "face_embedding": None, # Kept None pending real camera registration
            },
            # 3. DEMO EMPLOYEES: EMP002 - EMP020
            {
                "employee_id": "EMP002",
                "full_name": "Aarav Patel",
                "email": "aarav.patel@college.edu",
                "phone": "9825100002",
                "department": "Computer Applications",
                "designation": "Software Developer",
                "hashed_password": hash_pw("secret123"),
                "role": "employee",
                "base_salary": 38000.0,
                "face_embedding": None,
            },
            {
                "employee_id": "EMP003",
                "full_name": "Priya Sharma",
                "email": "priya.sharma@college.edu",
                "phone": "9825100003",
                "department": "Computer Engineering",
                "designation": "Software Developer",
                "hashed_password": hash_pw("secret123"),
                "role": "employee",
                "base_salary": 38000.0,
                "face_embedding": None,
            },
            {
                "employee_id": "EMP004",
                "full_name": "Rohan Mehta",
                "email": "rohan.mehta@college.edu",
                "phone": "9825100004",
                "department": "Information Technology",
                "designation": "System Administrator",
                "hashed_password": hash_pw("secret123"),
                "role": "employee",
                "base_salary": 35000.0,
                "face_embedding": None,
            },
            {
                "employee_id": "EMP005",
                "full_name": "Ananya Iyer",
                "email": "ananya.iyer@college.edu",
                "phone": "9825100005",
                "department": "Human Resources",
                "designation": "HR Executive",
                "hashed_password": hash_pw("secret123"),
                "role": "employee",
                "base_salary": 32000.0,
                "face_embedding": None,
            },
            {
                "employee_id": "EMP006",
                "full_name": "Vikram Singh",
                "email": "vikram.singh@college.edu",
                "phone": "9825100006",
                "department": "Computer Engineering",
                "designation": "Employee",
                "hashed_password": hash_pw("secret123"),
                "role": "employee",
                "base_salary": 34000.0,
                "face_embedding": None,
            },
            {
                "employee_id": "EMP007",
                "full_name": "Sneha Kulkarni",
                "email": "sneha.kulkarni@college.edu",
                "phone": "9825100007",
                "department": "Finance",
                "designation": "Accountant",
                "hashed_password": hash_pw("secret123"),
                "role": "employee",
                "base_salary": 36000.0,
                "face_embedding": None,
            },
            {
                "employee_id": "EMP008",
                "full_name": "Aditya Joshi",
                "email": "aditya.joshi@college.edu",
                "phone": "9825100008",
                "department": "Electronics",
                "designation": "IT Support",
                "hashed_password": hash_pw("secret123"),
                "role": "employee",
                "base_salary": 30000.0,
                "face_embedding": None,
            },
            {
                "employee_id": "EMP009",
                "full_name": "Neha Gupta",
                "email": "neha.gupta@college.edu",
                "phone": "9825100009",
                "department": "Administration",
                "designation": "Assistant",
                "hashed_password": hash_pw("secret123"),
                "role": "employee",
                "base_salary": 28000.0,
                "face_embedding": None,
            },
            {
                "employee_id": "EMP010",
                "full_name": "Karan Desai",
                "email": "karan.desai@college.edu",
                "phone": "9825100010",
                "department": "Computer Applications",
                "designation": "Intern",
                "hashed_password": hash_pw("secret123"),
                "role": "employee",
                "base_salary": 20000.0,
                "face_embedding": None,
            },
            {
                "employee_id": "EMP011",
                "full_name": "Pooja Shah",
                "email": "pooja.shah@college.edu",
                "phone": "9825100011",
                "department": "Information Technology",
                "designation": "Software Developer",
                "hashed_password": hash_pw("secret123"),
                "role": "employee",
                "base_salary": 39000.0,
                "face_embedding": None,
            },
            {
                "employee_id": "EMP012",
                "full_name": "Rahul Verma",
                "email": "rahul.verma@college.edu",
                "phone": "9825100012",
                "department": "Computer Engineering",
                "designation": "Employee",
                "hashed_password": hash_pw("secret123"),
                "role": "employee",
                "base_salary": 34000.0,
                "face_embedding": None,
            },
            {
                "employee_id": "EMP013",
                "full_name": "Divya Nair",
                "email": "divya.nair@college.edu",
                "phone": "9825100013",
                "department": "Electronics",
                "designation": "IT Support",
                "hashed_password": hash_pw("secret123"),
                "role": "employee",
                "base_salary": 31000.0,
                "face_embedding": None,
            },
            {
                "employee_id": "EMP014",
                "full_name": "Manan Trivedi",
                "email": "manan.trivedi@college.edu",
                "phone": "9825100014",
                "department": "Finance",
                "designation": "Accountant",
                "hashed_password": hash_pw("secret123"),
                "role": "employee",
                "base_salary": 37000.0,
                "face_embedding": None,
            },
            {
                "employee_id": "EMP015",
                "full_name": "Ritu Bhatt",
                "email": "ritu.bhatt@college.edu",
                "phone": "9825100015",
                "department": "Human Resources",
                "designation": "HR Executive",
                "hashed_password": hash_pw("secret123"),
                "role": "employee",
                "base_salary": 33000.0,
                "face_embedding": None,
            },
            {
                "employee_id": "EMP016",
                "full_name": "Siddharth Rao",
                "email": "siddharth.rao@college.edu",
                "phone": "9825100016",
                "department": "Administration",
                "designation": "Assistant",
                "hashed_password": hash_pw("secret123"),
                "role": "employee",
                "base_salary": 29000.0,
                "face_embedding": None,
            },
            {
                "employee_id": "EMP017",
                "full_name": "Kavita Nair",
                "email": "kavita.nair@college.edu",
                "phone": "9825100017",
                "department": "Computer Applications",
                "designation": "Software Developer",
                "hashed_password": hash_pw("secret123"),
                "role": "employee",
                "base_salary": 38000.0,
                "face_embedding": None,
            },
            {
                "employee_id": "EMP018",
                "full_name": "Harsh Dave",
                "email": "harsh.dave@college.edu",
                "phone": "9825100018",
                "department": "Information Technology",
                "designation": "System Administrator",
                "hashed_password": hash_pw("secret123"),
                "role": "employee",
                "base_salary": 36000.0,
                "face_embedding": None,
            },
            {
                "employee_id": "EMP019",
                "full_name": "Ishita Sen",
                "email": "ishita.sen@college.edu",
                "phone": "9825100019",
                "department": "Computer Engineering",
                "designation": "Intern",
                "hashed_password": hash_pw("secret123"),
                "role": "employee",
                "base_salary": 22000.0,
                "face_embedding": None,
            },
            {
                "employee_id": "EMP020",
                "full_name": "Yash Vardhan",
                "email": "yash.vardhan@college.edu",
                "phone": "9825100020",
                "department": "Electronics",
                "designation": "Employee",
                "hashed_password": hash_pw("secret123"),
                "role": "employee",
                "base_salary": 32000.0,
                "face_embedding": None,
            },
        ]

        valid_ids = {u["employee_id"] for u in users_data}
        
        # 1. Clean up old test / synthetic artifacts not part of official 20+1 roster
        old_test_users = db.query(models.User).filter(~models.User.employee_id.in_(valid_ids)).all()
        if old_test_users:
            print(f"[INFO] Removing {len(old_test_users)} obsolete/stray test user records...")
            for ot in old_test_users:
                db.delete(ot)
            db.commit()

        # 2. Seed / Update 20 Employees and Admin safely (Idempotent)
        users_map = {}
        for u in users_data:
            existing = db.query(models.User).filter(
                (models.User.employee_id == u["employee_id"]) | (models.User.email == u["email"])
            ).first()

            if not existing:
                new_u = models.User(**u)
                db.add(new_u)
                db.flush()
                users_map[u["employee_id"]] = new_u
            else:
                existing.employee_id = u["employee_id"]
                existing.full_name = u["full_name"]
                existing.email = u["email"]
                existing.phone = u["phone"]
                existing.department = u["department"]
                existing.designation = u["designation"]
                existing.hashed_password = u["hashed_password"]
                existing.role = u["role"]
                existing.base_salary = u["base_salary"]
                
                existing.face_embedding = u["face_embedding"]
                
                users_map[u["employee_id"]] = existing

        db.commit()
        print(f"[SUCCESS] Exactly 20 Employees + 1 Admin synchronized in Database.")

        # 3. Seed Realistic Today's Attendance Logs for Demo Employees (EMP002–EMP014)
        print("[INFO] Seeding Today's Attendance Logs for Demo Employees...")
        today = date.today()

        # Clear existing today attendance for demo employees to re-seed cleanly
        demo_user_ids = [users_map[f"EMP{i:03d}"].id for i in range(2, 21)]
        db.query(models.Attendance).filter(
            models.Attendance.date == today,
            models.Attendance.user_id.in_(demo_user_ids)
        ).delete(synchronize_session=False)

        # Seed attendance distribution:
        # EMP002 - EMP010: Present on time (09:05 - 09:25)
        # EMP011 - EMP014: Late arrivals (09:35 - 09:55)
        # EMP015 - EMP020: Absent / Not checked in yet
        sample_times = [
            (2, 9, 8, 12, "present", 14.5),
            (3, 9, 12, 45, "present", 22.1),
            (4, 9, 15, 30, "present", 35.8),
            (5, 9, 18, 10, "present", 18.2),
            (6, 9, 21, 5, "present", 41.0),
            (7, 9, 24, 55, "present", 27.4),
            (8, 9, 27, 20, "present", 52.3),
            (9, 9, 29, 40, "present", 19.6),
            (10, 9, 10, 15, "present", 12.0),
            (11, 9, 36, 10, "late", 31.5),
            (12, 9, 41, 25, "late", 44.2),
            (13, 9, 47, 50, "late", 63.8),
            (14, 9, 52, 14, "late", 38.0),
        ]

        for emp_idx, hour, minute, second, att_status, dist in sample_times:
            emp_key = f"EMP{emp_idx:03d}"
            target_user = users_map[emp_key]
            att_rec = models.Attendance(
                user_id=target_user.id,
                date=today,
                check_in=datetime(today.year, today.month, today.day, hour, minute, second),
                check_out=datetime(today.year, today.month, today.day, 17, 30, 0) if emp_idx in [2, 3] else None,
                face_verified=True,
                location_verified=True,
                latitude=23.002217 + (emp_idx * 0.00001),
                longitude=72.455763 + (emp_idx * 0.00001),
                distance_meters=dist,
                status=att_status
            )
            db.add(att_rec)

        db.commit()

        # 4. Seed Leave Requests for Demo Employees
        print("[INFO] Seeding Leave Requests...")
        db.query(models.LeaveRequest).filter(
            models.LeaveRequest.user_id.in_(demo_user_ids)
        ).delete(synchronize_session=False)

        sample_leaves = [
            (users_map["EMP005"], "casual", today + timedelta(days=2), today + timedelta(days=3), "Personal family commitment", "pending", None),
            (users_map["EMP007"], "sick", today - timedelta(days=3), today - timedelta(days=2), "Viral fever recovery", "approved", "Approved by HOD. Take rest."),
            (users_map["EMP010"], "academic", today + timedelta(days=5), today + timedelta(days=7), "Semester BCA practical examination", "pending", None),
            (users_map["EMP014"], "casual", today - timedelta(days=10), today - timedelta(days=9), "Out of station travel", "rejected", "Rejected due to quarter-end financial audit."),
        ]

        for user_obj, l_type, s_date, e_date, reason, l_status, remarks in sample_leaves:
            l_req = models.LeaveRequest(
                user_id=user_obj.id,
                leave_type=l_type,
                start_date=s_date,
                end_date=e_date,
                reason=reason,
                status=l_status,
                admin_remarks=remarks,
                created_at=datetime.utcnow() - timedelta(days=1)
            )
            db.add(l_req)

        db.commit()

        # 5. Seed Payroll Records for Previous Month for All 20 Employees
        print("[INFO] Seeding Payroll Records for All 20 Employees...")
        prev_month = 12 if today.month == 1 else today.month - 1
        prev_year = today.year - 1 if today.month == 1 else today.year

        for i in range(1, 21):
            emp_key = f"EMP{i:03d}"
            target_emp = users_map[emp_key]
            existing_pay = db.query(models.Payroll).filter(
                models.Payroll.user_id == target_emp.id,
                models.Payroll.month == prev_month,
                models.Payroll.year == prev_year
            ).first()

            if not existing_pay:
                per_day = target_emp.base_salary / 30.0
                present_days = 26 if i != 1 else 28
                paid_leaves = 2 if i != 1 else 1
                pay_rec = models.Payroll(
                    user_id=target_emp.id,
                    month=prev_month,
                    year=prev_year,
                    base_salary=target_emp.base_salary,
                    present_days=present_days,
                    paid_leaves=paid_leaves,
                    calculated_salary=round(per_day * (present_days + paid_leaves), 2),
                    status="paid"
                )
                db.add(pay_rec)

        db.commit()

        print("\n[SUCCESS] Database Seeding Successfully Completed!")
        print("=" * 65)
        print("WORKFORCE REGISTRY STATUS:")
        print(f"  * Total Employees in Database: 20 (EMP001 to EMP020)")
        print(f"  * Total Administrators:       1 (ADMIN01)")
        print(f"  * Real Employee:             EMP001 — Zala Prachi")
        print(f"                               Email: prachizala2003@gmail.com")
        print(f"                               Phone: 7698951982")
        print(f"                               Department: Computer Applications")
        print(f"                               Designation: Employee")
        print(f"                               Password: [CONFIGURED]")
        print(f"                               Biometric Face: NOT REGISTERED (Pending live capture)")
        print(f"  * Demo Employees:            EMP002 to EMP020 (Realistic Indian profiles)")
        print("=" * 65)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding error: {str(e)}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
