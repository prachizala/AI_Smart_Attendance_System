"""Unit test suite for AI Smart Attendance System.

Covers SQLite persistence, Haversine geofence boundaries,
biometric vector matching, and CSV report exports.
"""

import os
import sys
import unittest
import tempfile
import csv

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import (
    init_db,
    register_employee,
    get_all_employees,
    get_employee_by_code,
    record_attendance,
    get_attendance_records,
    export_attendance_to_csv
)
from geofencing import (
    haversine_distance,
    validate_geofence,
    DEFAULT_OFFICE_LAT,
    DEFAULT_OFFICE_LON
)
from biometrics import (
    calculate_feature_distance,
    verify_face_match
)


class TestAttendanceSystem(unittest.TestCase):
    def setUp(self):
        # Create temporary database for isolated test execution
        self.temp_db_fd, self.temp_db_path = tempfile.mkstemp(suffix=".db")
        init_db(self.temp_db_path)

    def tearDown(self):
        os.close(self.temp_db_fd)
        if os.path.exists(self.temp_db_path):
            os.remove(self.temp_db_path)

    # -------------------------------------------------------------------------
    # Database & Employee Registration Tests
    # -------------------------------------------------------------------------
    def test_employee_registration_and_retrieval(self):
        res = register_employee(
            name="Prachi Zala",
            employee_code="EMP-001",
            department="AI & Data Science",
            face_features=[0.1] * 64,
            db_path=self.temp_db_path
        )
        self.assertTrue(res["success"])
        self.assertEqual(res["employee_code"], "EMP-001")

        # Retrieve employee
        emp = get_employee_by_code("EMP-001", db_path=self.temp_db_path)
        self.assertIsNotNone(emp)
        self.assertEqual(emp["name"], "Prachi Zala")
        self.assertEqual(len(emp["face_features"]), 64)

    def test_duplicate_employee_code_rejected(self):
        register_employee("Prachi Zala", "EMP-001", "AI", db_path=self.temp_db_path)
        dup = register_employee("Another Person", "EMP-001", "IT", db_path=self.temp_db_path)
        self.assertFalse(dup["success"])
        self.assertIn("already registered", dup["error"])

    # -------------------------------------------------------------------------
    # Geofencing Mathematical Calculations Tests
    # -------------------------------------------------------------------------
    def test_haversine_identical_coordinates(self):
        dist = haversine_distance(23.0225, 72.5714, 23.0225, 72.5714)
        self.assertAlmostEqual(dist, 0.0, places=2)

    def test_haversine_perimeter_validation(self):
        # Near point (~15 meters away)
        near_lat = DEFAULT_OFFICE_LAT + 0.0001
        near_lon = DEFAULT_OFFICE_LON + 0.0001
        check_near = validate_geofence(near_lat, near_lon, radius_meters=100.0)
        self.assertTrue(check_near["within_geofence"])
        self.assertLess(check_near["distance_meters"], 100.0)

        # Far point (Ahmedabad to Mumbai ~450km away)
        mumbai_lat, mumbai_lon = 19.0760, 72.8777
        check_far = validate_geofence(mumbai_lat, mumbai_lon, radius_meters=100.0)
        self.assertFalse(check_far["within_geofence"])
        self.assertGreater(check_far["distance_meters"], 400000)

    # -------------------------------------------------------------------------
    # Biometric Similarity Matching Tests
    # -------------------------------------------------------------------------
    def test_biometric_identical_match(self):
        vec = [0.25] * 64
        dist = calculate_feature_distance(vec, vec)
        self.assertEqual(dist, 0.0)
        is_match, conf = verify_face_match(vec, vec)
        self.assertTrue(is_match)
        self.assertEqual(conf, 1.0)

    def test_biometric_mismatch(self):
        vec1 = [0.1] * 64
        vec2 = [0.8] * 64
        dist = calculate_feature_distance(vec1, vec2)
        self.assertGreater(dist, 0.55)
        is_match, conf = verify_face_match(vec1, vec2)
        self.assertFalse(is_match)
        self.assertLess(conf, 0.5)

    # -------------------------------------------------------------------------
    # Attendance Logging & CSV Export Tests
    # -------------------------------------------------------------------------
    def test_attendance_logging_and_export(self):
        register_employee("Prachi Zala", "EMP-001", "AI", db_path=self.temp_db_path)
        log_res = record_attendance(
            employee_code="EMP-001",
            lat=DEFAULT_OFFICE_LAT,
            lon=DEFAULT_OFFICE_LON,
            distance_m=12.5,
            face_score=0.96,
            status="Present",
            verification_mode="Biometric+GPS",
            db_path=self.temp_db_path
        )
        self.assertTrue(log_res["success"])

        records = get_attendance_records(db_path=self.temp_db_path)
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["status"], "Present")

        # Test CSV Export
        temp_csv_fd, temp_csv_path = tempfile.mkstemp(suffix=".csv")
        os.close(temp_csv_fd)
        try:
            export_attendance_to_csv(temp_csv_path, db_path=self.temp_db_path)
            self.assertTrue(os.path.exists(temp_csv_path))

            with open(temp_csv_path, "r", encoding="utf-8") as f:
                reader = list(csv.reader(f))
                # Header + 1 record row
                self.assertEqual(len(reader), 2)
                self.assertIn("Employee Code", reader[0])
                self.assertEqual(reader[1][1], "EMP-001")
                self.assertEqual(reader[1][10], "Present")
        finally:
            if os.path.exists(temp_csv_path):
                os.remove(temp_csv_path)


if __name__ == "__main__":
    unittest.main()
