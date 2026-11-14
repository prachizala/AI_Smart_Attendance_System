"""AI Smart Attendance & Workforce Management System - Streamlit Web UI.

Features:
- Dual-factor authentication: OpenCV Biometric Verification + Haversine GPS Geofencing
- SQLite persistence for employee profiles and audit logs
- Real-time punch verification and anti-proxy spoofing detection
- Dynamic analytics dashboard and one-click CSV report export
"""

import os
from datetime import datetime, date
import streamlit as st
import pandas as pd

from database import (
    init_db,
    register_employee,
    get_all_employees,
    get_employee_by_code,
    record_attendance,
    get_attendance_records,
    export_attendance_to_csv,
    DEFAULT_DB_PATH
)
from geofencing import (
    haversine_distance,
    validate_geofence,
    DEFAULT_OFFICE_LAT,
    DEFAULT_OFFICE_LON,
    DEFAULT_GEOFENCE_RADIUS_METERS
)
from biometrics import (
    extract_features_from_image,
    verify_face_match
)

# Page Configuration
st.set_page_config(
    page_title="AI Smart Attendance System",
    page_icon="📍",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize database on startup
init_db()

# Seed default demo employees if database is empty
if len(get_all_employees()) == 0:
    register_employee("Prachi Zala", "EMP-101", "AI & Data Science", [0.12] * 64)
    register_employee("Aarav Sharma", "EMP-102", "Software Engineering", [0.25] * 64)
    register_employee("Pooja Patel", "EMP-103", "Human Resources", [0.40] * 64)


# Custom CSS for polished interface
st.markdown("""
<style>
    .main-title { font-size: 2.2rem; font-weight: 700; color: #1E3A8A; margin-bottom: 0.2rem; }
    .sub-title { font-size: 1.05rem; color: #4B5563; margin-bottom: 1.5rem; }
    .metric-card { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 1rem; }
    .badge-present { background-color: #DEF7EC; color: #03543F; padding: 4px 10px; border-radius: 12px; font-weight: 600; }
    .badge-proxy { background-color: #FDE8E8; color: #9B1C1C; padding: 4px 10px; border-radius: 12px; font-weight: 600; }
</style>
""", unsafe_allow_html=True)

st.markdown('<div class="main-title">📍 AI Smart Attendance & Workforce Analytics</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-title">Dual-Factor Biometric Facial Recognition & Haversine Geofencing Suite | Built by Prachi Zala</div>', unsafe_allow_html=True)

# Sidebar Configuration & System Info
with st.sidebar:
    st.image("https://img.icons8.com/clouds/200/face-id.png", width=120)
    st.subheader("⚙️ System Status")
    st.success("🟢 SQLite Database Connected")
    st.info(f"📍 **Office Lat:** `{DEFAULT_OFFICE_LAT}`\n\n📍 **Office Lon:** `{DEFAULT_OFFICE_LON}`\n\n🎯 **Geofence Boundary:** `{int(DEFAULT_GEOFENCE_RADIUS_METERS)}m`")
    
    st.markdown("---")
    st.markdown("### 👩‍💻 Developer Profile")
    st.markdown("**Prachi Zala**  \nBCA Student, Ahmedabad  \nFocus: Python, AI & Data Analytics  \n[GitHub Profile](https://github.com/prachizala)")

# Main Tabs
tab1, tab2, tab3, tab4 = st.tabs([
    "📸 Biometric Punch-In",
    "👤 Employee Registration",
    "📊 Attendance Analytics",
    "📥 Export CSV Reports"
])

# -----------------------------------------------------------------------------
# TAB 1: BIOMETRIC PUNCH-IN
# -----------------------------------------------------------------------------
with tab1:
    st.subheader("Dual-Factor Authentication Punch-In")
    st.markdown("Verify presence via on-device **Biometric Facial Recognition** and **GPS Geofence Validation**.")

    employees = get_all_employees()
    if not employees:
        st.warning("No employees registered yet. Please register in the 'Employee Registration' tab.")
    else:
        col_input, col_camera = st.columns([1, 1.2])

        with col_input:
            emp_options = {f"{e['employee_code']} — {e['name']} ({e['department']})": e['employee_code'] for e in employees}
            selected_emp_label = st.selectbox("Select Employee", list(emp_options.keys()))
            selected_emp_code = emp_options[selected_emp_label]
            emp_data = get_employee_by_code(selected_emp_code)

            st.markdown("#### 1. GPS Location Coordinates")
            location_preset = st.radio(
                "Simulate Device GPS Location:",
                [
                    "🏢 At Office Desk (Inside 25m)",
                    "🚶 Office Campus Entrance (Inside 85m)",
                    "🚗 Parking Lot / Boundary Edge (Inside 98m)",
                    "🏠 Remote / Home (5.2 km Away — Spoof Alert!)"
                ]
            )

            if "Office Desk" in location_preset:
                user_lat = DEFAULT_OFFICE_LAT + 0.0001
                user_lon = DEFAULT_OFFICE_LON + 0.0001
            elif "Campus Entrance" in location_preset:
                user_lat = DEFAULT_OFFICE_LAT + 0.0006
                user_lon = DEFAULT_OFFICE_LON + 0.0004
            elif "Parking Lot" in location_preset:
                user_lat = DEFAULT_OFFICE_LAT + 0.0008
                user_lon = DEFAULT_OFFICE_LON + 0.0005
            else:
                user_lat = DEFAULT_OFFICE_LAT + 0.0450
                user_lon = DEFAULT_OFFICE_LON + 0.0350

            geo_check = validate_geofence(user_lat, user_lon)
            st.write(f"**Detected Distance to Office:** `{geo_check['distance_meters']:.1f} meters`")

            if geo_check["within_geofence"]:
                st.success(f"✅ GPS Verified: Within authorized {int(DEFAULT_GEOFENCE_RADIUS_METERS)}m perimeter.")
            else:
                st.error(f"❌ GPS Out of Bounds: {geo_check['distance_meters']:.1f}m away (Limit: {int(DEFAULT_GEOFENCE_RADIUS_METERS)}m)!")

        with col_camera:
            st.markdown("#### 2. Biometric Facial Verification")
            input_mode = st.radio("Verification Photo Source:", ["📷 Live Camera", "📁 Upload Photo", "⚡ Quick Demo Auto-Match"], horizontal=True)

            photo_bytes = None
            if input_mode == "📷 Live Camera":
                camera_img = st.camera_input("Capture face for punch-in")
                if camera_img:
                    photo_bytes = camera_img.getvalue()
            elif input_mode == "📁 Upload Photo":
                upload_img = st.file_uploader("Upload verification image", type=["jpg", "jpeg", "png"])
                if upload_img:
                    photo_bytes = upload_img.getvalue()
            else:
                st.info("⚡ Demo mode automatically injects sample biometric matching features for quick testing.")

            st.markdown("---")
            if st.button("🚀 Submit Biometric Attendance Punch", type="primary", use_container_width=True):
                # 1. Evaluate Geofence
                within_geofence = geo_check["within_geofence"]
                dist_m = geo_check["distance_meters"]

                # 2. Evaluate Biometrics
                enrolled_features = emp_data.get("face_features") or ([0.12] * 64)
                if photo_bytes is not None:
                    probe_features = extract_features_from_image(photo_bytes)
                    is_face_match, face_score = verify_face_match(probe_features, enrolled_features)
                    mode_used = "Biometric+GPS"
                elif input_mode == "⚡ Quick Demo Auto-Match":
                    is_face_match = True
                    face_score = 0.94
                    mode_used = "Demo Simulation"
                else:
                    st.error("Please provide a photo or select 'Quick Demo Auto-Match'.")
                    st.stop()

                # 3. Determine Status
                if not within_geofence:
                    final_status = "Proxy Blocked (Location Out of Bounds)"
                    st.error(f"🚫 **PUNCH REJECTED (PROXY ALERT):** Device is {dist_m:.1f}m away from authorized perimeter!")
                elif not is_face_match:
                    final_status = "Proxy Blocked (Biometric Mismatch)"
                    st.error(f"🚫 **PUNCH REJECTED (IDENTITY MISMATCH):** Facial features did not match employee record! (Confidence: {face_score*100:.1f}%)")
                else:
                    # Check hour for Late status
                    current_hour = datetime.now().hour
                    final_status = "Late" if current_hour >= 10 else "Present"
                    st.success(f"🎉 **PUNCH ACCEPTED ({final_status}):** Welcome, {emp_data['name']}! Identity verified at {dist_m:.1f}m distance.")

                # 4. Save to SQLite
                rec = record_attendance(
                    employee_code=emp_data["employee_code"],
                    lat=user_lat,
                    lon=user_lon,
                    distance_m=dist_m,
                    face_score=face_score,
                    status=final_status,
                    verification_mode=mode_used
                )
                st.info(f"Audit Log ID: `#{rec['log_id']}` recorded in SQLite database.")

# -----------------------------------------------------------------------------
# TAB 2: EMPLOYEE REGISTRATION
# -----------------------------------------------------------------------------
with tab2:
    st.subheader("Enroll New Employee")
    with st.form("employee_reg_form"):
        col_reg1, col_reg2 = st.columns(2)
        with col_reg1:
            new_name = st.text_input("Full Name *", placeholder="e.g. Rahul Sharma")
            new_code = st.text_input("Employee Code *", placeholder="e.g. EMP-104").upper()
            new_dept = st.selectbox("Department *", ["AI & Data Science", "Software Engineering", "Human Resources", "Sales & Marketing", "Finance & Operations"])

        with col_reg2:
            st.markdown("**Biometric Enrollment Photo (Optional)**")
            reg_photo = st.file_uploader("Upload enrollment portrait", type=["jpg", "png", "jpeg"], key="reg_upload")

        submitted = st.form_submit_button("✅ Register Employee", use_container_width=True)
        if submitted:
            if not new_name.strip() or not new_code.strip():
                st.error("Please provide both Full Name and Employee Code.")
            else:
                features = None
                if reg_photo:
                    features = extract_features_from_image(reg_photo.getvalue())
                res = register_employee(new_name, new_code, new_dept, features)
                if res["success"]:
                    st.success(f"Employee {res['name']} ({res['employee_code']}) registered successfully!")
                    st.rerun()
                else:
                    st.error(res["error"])

    st.markdown("#### Currently Enrolled Roster")
    roster_df = pd.DataFrame(get_all_employees())
    if not roster_df.empty:
        st.dataframe(roster_df[["employee_code", "name", "department", "registered_at", "has_face"]], use_container_width=True)

# -----------------------------------------------------------------------------
# TAB 3: ATTENDANCE ANALYTICS
# -----------------------------------------------------------------------------
with tab3:
    st.subheader("Workforce Attendance Analytics & Audit Logs")

    # Filter controls
    col_f1, col_f2, col_f3 = st.columns(3)
    with col_f1:
        dept_filter = st.selectbox("Filter Department:", ["All", "AI & Data Science", "Software Engineering", "Human Resources", "Sales & Marketing", "Finance & Operations"])
    with col_f2:
        status_filter = st.selectbox("Filter Status:", ["All", "Present", "Late", "Proxy Blocked (Location Out of Bounds)", "Proxy Blocked (Biometric Mismatch)"])
    with col_f3:
        refresh_btn = st.button("🔄 Refresh Data", use_container_width=True)

    records = get_attendance_records(department=dept_filter, status=status_filter)
    df_records = pd.DataFrame(records)

    if df_records.empty:
        st.info("No attendance records found matching filters.")
    else:
        # High Level Metrics
        total_punches = len(df_records)
        present_count = len(df_records[df_records["status"].str.contains("Present")])
        blocked_count = len(df_records[df_records["status"].str.contains("Proxy Blocked")])
        avg_dist = df_records["distance_meters"].mean()

        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Total Punches Recorded", total_punches)
        m2.metric("Successful Check-ins", present_count)
        m3.metric("Proxy Attempts Prevented", blocked_count, delta_color="inverse")
        m4.metric("Average Punch Distance", f"{avg_dist:.1f} m")

        st.markdown("#### Real-Time Audit Log Table")
        display_cols = ["id", "employee_code", "employee_name", "department", "timestamp", "distance_meters", "face_confidence", "status", "verification_mode"]
        st.dataframe(df_records[display_cols], use_container_width=True)

        st.markdown("#### Status Breakdown")
        status_counts = df_records["status"].value_counts()
        st.bar_chart(status_counts)

# -----------------------------------------------------------------------------
# TAB 4: EXPORT CSV REPORTS
# -----------------------------------------------------------------------------
with tab4:
    st.subheader("Generate & Export Attendance Reports")
    st.markdown("Download audited attendance logs in standard CSV format for HR payroll or academic attendance reporting.")

    export_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "attendance_export.csv")
    export_attendance_to_csv(export_path, department=dept_filter, status=status_filter)

    with open(export_path, "rb") as f:
        csv_bytes = f.read()

    st.download_button(
        label="📥 Download Filtered Attendance Report (CSV)",
        data=csv_bytes,
        file_name=f"attendance_report_{date.today().strftime('%Y%m%d')}.csv",
        mime="text/csv",
        type="primary",
        use_container_width=True
    )

    st.markdown("#### CSV Preview")
    preview_df = pd.read_csv(export_path)
    st.dataframe(preview_df.head(10), use_container_width=True)
