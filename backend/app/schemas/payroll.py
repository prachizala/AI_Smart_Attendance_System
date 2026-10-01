from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class PayrollGenerateRequest(BaseModel):
    month: int = Field(..., ge=1, le=12, json_schema_extra={"example": 10})
    year: int = Field(..., ge=2020, le=2050, json_schema_extra={"example": 2026})


class PayrollResponse(BaseModel):
    id: int
    user_id: int
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    month: int
    year: int
    base_salary: float
    total_working_days: int
    present_days: int
    paid_leaves: int
    unpaid_leaves: int
    net_salary: float
    payment_status: str
    generated_at: datetime

    model_config = ConfigDict(from_attributes=True)
