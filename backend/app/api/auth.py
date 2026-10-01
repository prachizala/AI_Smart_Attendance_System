from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.utils.security import (
    verify_password, get_password_hash, create_access_token, get_current_user, get_current_admin
)

router = APIRouter(prefix="/api/auth", tags=["Authentication & Profile"])


def _to_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        employee_id=user.employee_id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        base_salary=user.base_salary,
        is_active=user.is_active,
        has_face_registered=user.face_encoding is not None and len(user.face_encoding.strip()) > 0,
        created_at=user.created_at,
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new employee or administrator."""
    # Check if employee_id already exists
    if db.query(User).filter(User.employee_id == user_in.employee_id).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee ID '{user_in.employee_id}' is already registered."
        )

    # Check if email already exists
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{user_in.email}' is already registered."
        )

    new_user = User(
        employee_id=user_in.employee_id.strip().upper(),
        full_name=user_in.full_name.strip(),
        email=user_in.email.strip().lower(),
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role.lower(),
        base_salary=user_in.base_salary,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return _to_user_response(new_user)


@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate via Employee ID or Email and receive a JWT Bearer Token."""
    identifier = login_data.identifier.strip()
    
    # Check identifier as employee_id (case-insensitive) or email
    user = db.query(User).filter(
        (User.employee_id == identifier.upper()) | (User.email == identifier.lower())
    ).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Employee ID / Email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is disabled. Please contact administrator."
        )

    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=_to_user_response(user)
    )


@router.get("/me", response_model=UserResponse)
def get_current_profile(current_user: User = Depends(get_current_user)):
    """Fetch profile of currently authenticated user."""
    return _to_user_response(current_user)


@router.get("/users", response_model=List[UserResponse])
def list_employees(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Admin-only endpoint to list all registered employees."""
    users = db.query(User).order_by(User.id.desc()).all()
    return [_to_user_response(u) for u in users]
