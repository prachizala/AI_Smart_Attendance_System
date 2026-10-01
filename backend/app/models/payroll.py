from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Payroll(Base):
    __tablename__ = "payroll"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    month = Column(Integer, nullable=False)  # 1 - 12
    year = Column(Integer, nullable=False)   # e.g., 2026
    
    base_salary = Column(Float, nullable=False)
    total_working_days = Column(Integer, default=30, nullable=False)
    present_days = Column(Integer, default=0, nullable=False)
    paid_leaves = Column(Integer, default=0, nullable=False)
    unpaid_leaves = Column(Integer, default=0, nullable=False)
    
    net_salary = Column(Float, nullable=False)
    payment_status = Column(String(20), default="PENDING", nullable=False)  # PENDING, PAID
    
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="payrolls")
