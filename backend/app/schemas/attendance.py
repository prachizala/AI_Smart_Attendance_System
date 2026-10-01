from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class CheckInRequest(BaseModel):
    latitude: float = Field(..., description="Device GPS Latitude", json_schema_extra={"example": 23.002217})
    longitude: float = Field(..., description="Device GPS Longitude", json_schema_extra={"example": 72.455763})
    face_image_base64: str = Field(..., description="Base64 encoded live camera selfie")


class CheckOutRequest(BaseModel):
    latitude: float = Field(..., description="Device GPS Latitude", json_schema_extra={"example": 23.002217})
    longitude: float = Field(..., description="Device GPS Longitude", json_schema_extra={"example": 72.455763})


class AttendanceResponse(BaseModel):
    id: int
    user_id: int
    date: date
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    face_verified: bool
    location_verified: bool
    distance_from_office: Optional[float] = None
    status: str
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AttendanceStats(BaseModel):
    total_employees: int
    present_today: int
    late_today: int
    absent_today: int
    on_leave_today: int
