from datetime import datetime, date as date_type
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Float, Text, ForeignKey
from sqlalchemy.orm import relationship, synonym
from database import Base


# ==========================================
# Domain 1: User Authentication & Profiles
# ==========================================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="employee", nullable=False)  # 'admin' vs 'employee'
    
    # 128-d biometric embedding stored as JSON string
    face_embedding = Column(Text, nullable=True)
    face_encoding = synonym("face_embedding")
    
    # Profile & Department Attributes
    phone = Column(String(20), nullable=True)
    department = Column(String(100), default="Computer Applications", nullable=True)
    designation = Column(String(100), default="Employee", nullable=True)

    base_salary = Column(Float, default=30000.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    attendances = relationship("Attendance", back_populates="user", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="user", cascade="all, delete-orphan")
    payrolls = relationship("Payroll", back_populates="user", cascade="all, delete-orphan")


# ==========================================
# Domain 2: Attendance Tracking Log
# ==========================================
class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, default=date_type.today, nullable=False, index=True)
    
    # Timestamps
    check_in = Column(DateTime, nullable=True)
    check_in_time = synonym("check_in")
    
    check_out = Column(DateTime, nullable=True)
    check_out_time = synonym("check_out")
    
    # Dual-factor validation flags
    face_verified = Column(Boolean, default=False, nullable=False)
    location_verified = Column(Boolean, default=False, nullable=False)
    
    # Geolocation telemetry
    latitude = Column(Float, nullable=True)
    check_in_lat = synonym("latitude")
    
    longitude = Column(Float, nullable=True)
    check_in_lng = synonym("longitude")
    
    distance_meters = Column(Float, nullable=True)
    distance_from_office = synonym("distance_meters")
    
    # Status: 'present', 'late', 'half_day', 'absent'
    status = Column(String(20), default="present", nullable=False)

    # Relationships
    user = relationship("User", back_populates="attendances")


# ==========================================
# Domain 3: Leave Management System
# ==========================================
class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    leave_type = Column(String(50), nullable=False)  # 'sick', 'casual', 'academic'
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=False)
    
    # Tracking status: 'pending', 'approved', 'rejected'
    status = Column(String(20), default="pending", nullable=False)
    admin_remarks = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="leave_requests")


# ==========================================
# Domain 4: Basic Academic Payroll
# ==========================================
class Payroll(Base):
    __tablename__ = "payroll"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    month = Column(Integer, nullable=False)  # 1 - 12
    year = Column(Integer, nullable=False)   # e.g., 2026
    
    base_salary = Column(Float, nullable=False)
    present_days = Column(Integer, default=0, nullable=False)
    paid_leaves = Column(Integer, default=0, nullable=False)
    calculated_salary = Column(Float, nullable=False)
    
    status = Column(String(20), default="pending", nullable=False)  # 'pending', 'paid'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="payrolls")
