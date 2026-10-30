import os
from datetime import datetime, date
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from database import get_db
import models
from services.face_service import extract_face_embedding, verify_face
from services.geo_service import verify_location

router = APIRouter(prefix="/attendance", tags=["Attendance Verification"])

SECRET_KEY = os.getenv("SECRET_KEY", "college-secret-key-change-in-production-demo")
ALGORITHM = "HS256"


# ==========================================
# Request & Response Contracts
# ==========================================
class CheckInRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Device GPS Latitude", json_schema_extra={"example": 23.002217})
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Device GPS Longitude", json_schema_extra={"example": 72.455763})
    face_image_base64: str = Field(..., min_length=1, max_length=7000000, description="Base64 encoded live camera selfie")
    user_id: Optional[int] = Field(None, description="Optional explicit user_id")


class CheckOutRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Device GPS Latitude", json_schema_extra={"example": 23.002217})
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Device GPS Longitude", json_schema_extra={"example": 72.455763})
    face_image_base64: Optional[str] = Field(None, max_length=7000000, description="Base64 encoded live selfie for checkout security")
    user_id: Optional[int] = Field(None, description="Optional explicit user_id")


class AttendanceResponse(BaseModel):
    id: int
    user_id: int
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    face_verified: bool
    location_verified: bool
    verification_method: Optional[str] = "face"
    distance_meters: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str
    late_minutes: Optional[int] = None
    early_exit: Optional[bool] = None
    overtime_minutes: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Auth Token Extraction & User Resolution Helper
# ==========================================
def resolve_user(
    explicit_user_id: Optional[int],
    authorization: Optional[str],
    db: Session
) -> models.User:
    """
    Resolves authenticated user securely:
    1. If Bearer token provided, validates JWT signature and expiration.
       - Rejects invalid/expired tokens with 401 Unauthorized.
       - Prevents user impersonation: non-admin cannot perform actions for another user_id.
    2. If no Bearer token provided, falls back to explicit_user_id (for test backwards-compatibility).
    3. Verifies account is active.
    """
    if authorization:
        if not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Malformed authorization header. Bearer token required.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token = authorization.split(" ")[1].strip()
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            token_sub = payload.get("sub")
            if not token_sub:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token payload: missing subject identifier.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            token_user_id = int(token_sub)
        except (JWTError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials: Token is invalid or expired.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        authenticated_user = db.query(models.User).filter(models.User.id == token_user_id).first()
        if not authenticated_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authenticated user record does not exist.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Anti-impersonation: Non-admin users cannot act on behalf of another user_id
        if explicit_user_id and explicit_user_id != authenticated_user.id:
            if not authenticated_user.role or authenticated_user.role.lower() != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: Cannot perform attendance operations on behalf of another employee."
                )
            # Admin performing operation on target user
            target_user = db.query(models.User).filter(models.User.id == explicit_user_id).first()
            if not target_user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target employee not found")
            return target_user

        if not authenticated_user.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee account is deactivated")
        return authenticated_user

    # No authorization header provided - check explicit_user_id
    if explicit_user_id:
        user = db.query(models.User).filter(models.User.id == explicit_user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee account is deactivated")
        return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide a valid Bearer token or user_id.",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ==========================================
# 1. Check-In Endpoint
# ==========================================
@router.post("/check-in", response_model=AttendanceResponse, status_code=status.HTTP_200_OK)
def attendance_check_in(
    payload: CheckInRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Core Check-In Protocol:
    1. Authenticate user from JWT Bearer token or payload user_id.
    2. Geofence Verification: verify_location(lat, lon). If False -> abort 403.
    3. Biometric Verification: verify_face(live, db). If False -> abort 401.
    4. Anti-Duplicate Rule: Ensure no prior check-in exists for today (abort 409).
    5. Save attendance timestamp safely into SQLite.
    """
    user = resolve_user(payload.user_id, authorization, db)

    # Gate 1: WHERE Verification (GPS Geofence Perimeter)
    geo_result = verify_location(payload.latitude, payload.longitude)
    if not geo_result["inside_geofence"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Check-in rejected: Device is outside office perimeter. "
                f"Distance: {geo_result['distance_meters']}m, Allowed: {geo_result['allowed_radius_meters']}m"
            )
        )

    # Gate 2: WHO Verification (Biometric Face Comparison)
    if not user.face_embedding:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No registered biometric face profile found. Please enroll your face reference first."
        )

    try:
        live_embedding = extract_face_embedding(payload.face_image_base64)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Biometric processing failed: {str(e)}"
        )

    face_match = verify_face(live_embedding, user.face_embedding, tolerance=0.5)
    if not face_match["is_matched"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                f"Face verification failed. Live face does not match registered profile. "
                f"(Distance: {face_match['distance']}, Confidence: {face_match['confidence_percentage']}%)"
            )
        )

    # Gate 3: Anti-Duplicate Daily Check
    today = date.today()
    existing_attendance = db.query(models.Attendance).filter(
        models.Attendance.user_id == user.id,
        models.Attendance.date == today
    ).first()

    if existing_attendance and existing_attendance.check_in is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate check-in rejected: Already checked in for today at {existing_attendance.check_in.strftime('%H:%M:%S')}"
        )

    now = datetime.utcnow()
    # Shift arrival threshold: 09:30 AM
    attendance_status = "late" if now.time() > datetime.strptime("09:30", "%H:%M").time() else "present"

    if existing_attendance:
        existing_attendance.check_in = now
        existing_attendance.face_verified = True
        existing_attendance.location_verified = True
        existing_attendance.latitude = payload.latitude
        existing_attendance.longitude = payload.longitude
        existing_attendance.distance_meters = geo_result["distance_meters"]
        existing_attendance.status = attendance_status
        record_to_return = existing_attendance
    else:
        new_attendance = models.Attendance(
            user_id=user.id,
            date=today,
            check_in=now,
            face_verified=True,
            location_verified=True,
            latitude=payload.latitude,
            longitude=payload.longitude,
            distance_meters=geo_result["distance_meters"],
            status=attendance_status
        )
        db.add(new_attendance)
        record_to_return = new_attendance

    # Commit transaction safely
    try:
        db.commit()
        db.refresh(record_to_return)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database commit error: {str(e)}")

    res = AttendanceResponse.model_validate(record_to_return)
    res.employee_id = user.employee_id
    res.employee_name = user.full_name
    return res


# ==========================================
# 2. Check-Out Endpoint
# ==========================================
@router.post("/check-out", response_model=AttendanceResponse, status_code=status.HTTP_200_OK)
def attendance_check_out(
    payload: CheckOutRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Core Check-Out Protocol:
    1. Authenticate user from JWT Bearer token or payload user_id.
    2. Re-verify GPS Geofence Perimeter: verify_location(lat, lon). If False -> abort 403.
    3. Re-verify Biometric Face (if image provided): verify_face(live, db). If False -> abort 401.
    4. Ensure user had checked in today, and prevent duplicate checkout.
    5. Update checkout timestamp safely in SQLite.
    """
    user = resolve_user(payload.user_id, authorization, db)

    # 1. Re-verify GPS location for checkout security
    geo_result = verify_location(payload.latitude, payload.longitude)
    if not geo_result["inside_geofence"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Check-out rejected: Device is outside office perimeter. "
                f"Distance: {geo_result['distance_meters']}m, Allowed: {geo_result['allowed_radius_meters']}m"
            )
        )

    # 2. Re-verify Face biometrics if photo provided
    if payload.face_image_base64 and user.face_embedding:
        try:
            live_embedding = extract_face_embedding(payload.face_image_base64)
            face_match = verify_face(live_embedding, user.face_embedding, tolerance=0.5)
            if not face_match["is_matched"]:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Checkout face verification failed. (Confidence: {face_match['confidence_percentage']}%)"
                )
        except ValueError as ve:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

    today = date.today()
    record = db.query(models.Attendance).filter(
        models.Attendance.user_id == user.id,
        models.Attendance.date == today
    ).first()

    if not record or record.check_in is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot check out: No active check-in record found for today."
        )

    if record.check_out is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Already checked out for today at {record.check_out.strftime('%H:%M:%S')}"
        )

    record.check_out = datetime.utcnow()

    # Commit transaction safely
    try:
        db.commit()
        db.refresh(record)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database commit error: {str(e)}")

    res = AttendanceResponse.model_validate(record)
    res.employee_id = user.employee_id
    res.employee_name = user.full_name
    return res


# ==========================================
# 3. Attendance History Endpoint
# ==========================================
@router.get(
    "/history/{employee_id}",
    response_model=List[AttendanceResponse],
    status_code=status.HTTP_200_OK,
    summary="Get attendance history for an employee"
)
def get_attendance_history(
    employee_id: str,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Returns chronological attendance history logs for a specific employee.
    Supports lookup by employee_id string (e.g. EMP001) or internal user_id.
    Authenticates via optional Bearer JWT token if provided.
    """
    # 1. Lookup employee by employee_id code or integer id
    target_user = None
    if employee_id.isdigit():
        target_user = db.query(models.User).filter(
            (models.User.id == int(employee_id)) | (models.User.employee_id == employee_id)
        ).first()
    else:
        target_user = db.query(models.User).filter(
            models.User.employee_id == employee_id
        ).first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee '{employee_id}' not found"
        )

    # 2. If JWT provided, verify authorization (user can view their own, or admin can view any)
    if authorization and authorization.startswith("Bearer "):
        try:
            auth_user = resolve_user(None, authorization, db)
            if auth_user.role.lower() != "admin" and auth_user.id != target_user.id and auth_user.employee_id != target_user.employee_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You can only view your own attendance history."
                )
        except HTTPException:
            raise
        except Exception:
            pass

    # 3. Query attendance records sorted by newest date first
    records = db.query(models.Attendance).filter(
        models.Attendance.user_id == target_user.id
    ).order_by(models.Attendance.date.desc(), models.Attendance.check_in.desc()).all()

    results = []
    for r in records:
        rec = AttendanceResponse.model_validate(r)
        rec.employee_id = target_user.employee_id
        rec.employee_name = target_user.full_name
        rec.latitude = r.latitude
        rec.longitude = r.longitude

        # Compute late arrival minutes (threshold 09:30 AM)
        if r.check_in:
            ci = r.check_in
            ci_minutes = ci.hour * 60 + ci.minute
            shift_start = 9 * 60 + 30
            rec.late_minutes = max(0, ci_minutes - shift_start) if ci_minutes > shift_start else 0
        else:
            rec.late_minutes = 0

        # Compute early exit & overtime minutes
        if r.check_out:
            co = r.check_out
            co_minutes = co.hour * 60 + co.minute
            shift_end = 17 * 60  # 5:00 PM standard shift end
            rec.early_exit = co_minutes < shift_end

            if r.check_in:
                total_seconds = (r.check_out - r.check_in).total_seconds()
                standard_seconds = 8 * 3600
                if total_seconds > standard_seconds:
                    rec.overtime_minutes = int((total_seconds - standard_seconds) / 60)
                else:
                    rec.overtime_minutes = 0
        else:
            rec.early_exit = False
            rec.overtime_minutes = 0

        results.append(rec)

    return results

