from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class LeaveCreate(BaseModel):
    leave_type: str = Field(..., description="SICK, CASUAL, ACADEMIC", json_schema_extra={"example": "SICK"})
    start_date: date = Field(..., json_schema_extra={"example": "2026-10-01"})
    end_date: date = Field(..., json_schema_extra={"example": "2026-10-03"})
    reason: str = Field(..., min_length=5, json_schema_extra={"example": "College semester exams preparation"})


class LeaveUpdate(BaseModel):
    status: str = Field(..., description="APPROVED or REJECTED", json_schema_extra={"example": "APPROVED"})
    admin_remarks: Optional[str] = Field(None, json_schema_extra={"example": "Approved as requested"})


class LeaveResponse(BaseModel):
    id: int
    user_id: int
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    leave_type: str
    start_date: date
    end_date: date
    reason: str
    status: str
    admin_remarks: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
