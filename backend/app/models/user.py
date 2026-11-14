from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text
from sqlalchemy.orm import relationship, synonym
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="employee", nullable=False)  # "admin" or "employee"
    
    # 128-d facial embedding vector stored as JSON string
    face_embedding = Column(Text, nullable=True)
    face_encoding = synonym("face_embedding")
    
    # Base monthly salary (for basic academic payroll calculations)
    base_salary = Column(Float, default=30000.0, nullable=False)
    
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    attendances = relationship("Attendance", back_populates="user", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="user", cascade="all, delete-orphan")
    payrolls = relationship("Payroll", back_populates="user", cascade="all, delete-orphan")
