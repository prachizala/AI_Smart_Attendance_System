from datetime import datetime, date as date_type
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Float, ForeignKey
from sqlalchemy.orm import relationship, synonym
from app.database import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, default=date_type.today, nullable=False, index=True)
    
    check_in = Column(DateTime, nullable=True)
    check_in_time = synonym("check_in")
    
    check_out = Column(DateTime, nullable=True)
    check_out_time = synonym("check_out")
    
    face_verified = Column(Boolean, default=False, nullable=False)
    location_verified = Column(Boolean, default=False, nullable=False)
    verification_method = Column(String(30), default="face", nullable=False)
    
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
