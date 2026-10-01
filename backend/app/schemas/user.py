from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserBase(BaseModel):
    employee_id: str = Field(..., json_schema_extra={"example": "EMP001"})
    full_name: str = Field(..., json_schema_extra={"example": "Prachi Sharma"})
    email: EmailStr = Field(..., json_schema_extra={"example": "prachi@college.edu"})
    role: str = Field(default="employee", json_schema_extra={"example": "employee"})  # "admin" or "employee"
    base_salary: float = Field(default=30000.0, json_schema_extra={"example": 35000.0})


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, json_schema_extra={"example": "secret123"})


class UserLogin(BaseModel):
    identifier: str = Field(..., description="Employee ID or Email", json_schema_extra={"example": "EMP001"})
    password: str = Field(..., json_schema_extra={"example": "secret123"})


class UserResponse(BaseModel):
    id: int
    employee_id: str
    full_name: str
    email: EmailStr
    role: str
    base_salary: float
    is_active: bool
    has_face_registered: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FaceRegisterRequest(BaseModel):
    face_image_base64: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None
