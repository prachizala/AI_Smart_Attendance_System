"""Database management module for AI Smart Attendance System.

Manages SQLite storage for employee profiles, biometric signatures,
and timestamped attendance audit logs.
"""

import os
import sqlite3
import json
import csv
from datetime import datetime
from typing import List, Dict, Optional, Any

DEFAULT_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "attendance.db")


def get_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    """Creates and returns a connection to the SQLite database."""
    target_path = db_path or DEFAULT_DB_PATH
    conn = sqlite3.connect(target_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Optional[str] = None) -> None:
    """Initializes the database schema with necessary tables and indexes."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    # Employees Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            department TEXT NOT NULL,
            face_features TEXT,
            registered_at TEXT NOT NULL
        )
    """)

    # Attendance Logs Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS attendance_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_code TEXT NOT NULL,
            employee_name TEXT NOT NULL,
            department TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            date TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            distance_meters REAL NOT NULL,
            face_confidence REAL NOT NULL,
            status TEXT NOT NULL,
            verification_mode TEXT NOT NULL,
            FOREIGN KEY (employee_code) REFERENCES employees (employee_code)
        )
    """)

    # Create Indexes for fast queries
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_logs (date)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_attendance_emp ON attendance_logs (employee_code)")

    conn.commit()
    conn.close()


def register_employee(
    name: str,
    employee_code: str,
    department: str,
    face_features: Optional[List[float]] = None,
    db_path: Optional[str] = None
) -> Dict[str, Any]:
    """Registers a new employee into the system."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    features_json = json.dumps(face_features) if face_features else None
    now_str = datetime.now().isoformat()

    try:
        cursor.execute("""
            INSERT INTO employees (employee_code, name, department, face_features, registered_at)
            VALUES (?, ?, ?, ?, ?)
        """, (employee_code.strip().upper(), name.strip(), department.strip(), features_json, now_str))
        conn.commit()
        emp_id = cursor.lastrowid
        return {
            "success": True,
            "id": emp_id,
            "employee_code": employee_code.strip().upper(),
            "name": name.strip(),
            "department": department.strip()
        }
    except sqlite3.IntegrityError:
        return {"success": False, "error": f"Employee code '{employee_code}' already registered."}
    finally:
        conn.close()


def get_all_employees(db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves all registered employees."""
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, employee_code, name, department, registered_at, (face_features IS NOT NULL) AS has_face FROM employees ORDER BY name ASC")
    rows = cursor.fetchall()
    result = [dict(r) for r in rows]
    conn.close()
    return result


def get_employee_by_code(employee_code: str, db_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Fetches employee record including face features by code."""
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM employees WHERE employee_code = ?", (employee_code.strip().upper(),))
    row = cursor.fetchone()
    conn.close()
    if row:
        data = dict(row)
        if data["face_features"]:
            data["face_features"] = json.loads(data["face_features"])
        return data
    return None


def record_attendance(
    employee_code: str,
    lat: float,
    lon: float,
    distance_m: float,
    face_score: float,
    status: str,
    verification_mode: str = "Biometric+GPS",
    db_path: Optional[str] = None
) -> Dict[str, Any]:
    """Records an attendance attempt (Present, Late, or Proxy Blocked)."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    emp = get_employee_by_code(employee_code, db_path=db_path)
    if not emp:
        conn.close()
        return {"success": False, "error": f"Employee {employee_code} not found."}

    now = datetime.now()
    timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S")
    date_str = now.strftime("%Y-%m-%d")

    cursor.execute("""
        INSERT INTO attendance_logs (
            employee_code, employee_name, department, timestamp, date,
            latitude, longitude, distance_meters, face_confidence,
            status, verification_mode
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        emp["employee_code"],
        emp["name"],
        emp["department"],
        timestamp_str,
        date_str,
        round(lat, 6),
        round(lon, 6),
        round(distance_m, 2),
        round(face_score, 4),
        status,
        verification_mode
    ))
    conn.commit()
    log_id = cursor.lastrowid
    conn.close()

    return {
        "success": True,
        "log_id": log_id,
        "employee_code": emp["employee_code"],
        "employee_name": emp["name"],
        "status": status,
        "timestamp": timestamp_str,
        "distance_m": round(distance_m, 2),
        "face_score": round(face_score, 4)
    }


def get_attendance_records(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    db_path: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Queries attendance logs with flexible filtering."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    query = "SELECT * FROM attendance_logs WHERE 1=1"
    params = []

    if start_date:
        query += " AND date >= ?"
        params.append(start_date)
    if end_date:
        query += " AND date <= ?"
        params.append(end_date)
    if department and department != "All":
        query += " AND department = ?"
        params.append(department)
    if status and status != "All":
        query += " AND status = ?"
        params.append(status)

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    result = [dict(r) for r in rows]
    conn.close()
    return result


def export_attendance_to_csv(
    filepath: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    db_path: Optional[str] = None
) -> str:
    """Exports filtered attendance logs to a CSV report file."""
    records = get_attendance_records(
        start_date=start_date,
        end_date=end_date,
        department=department,
        status=status,
        db_path=db_path
    )

    headers = [
        "Log ID", "Employee Code", "Employee Name", "Department",
        "Timestamp", "Date", "Latitude", "Longitude",
        "Distance (Meters)", "Face Confidence", "Status", "Verification Mode"
    ]

    with open(filepath, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(headers)
        for r in records:
            writer.writerow([
                r["id"],
                r["employee_code"],
                r["employee_name"],
                r["department"],
                r["timestamp"],
                r["date"],
                r["latitude"],
                r["longitude"],
                r["distance_meters"],
                r["face_confidence"],
                r["status"],
                r["verification_mode"]
            ])

    return filepath
