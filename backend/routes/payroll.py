from datetime import datetime, date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session

from database import get_db
import models
from auth import get_current_admin
from services.payroll_service import calculate_employee_payroll, calculate_monthly_pay

router = APIRouter(prefix="/payroll", tags=["Academic Payroll"])


# ==========================================
# Pydantic Schemas
# ==========================================
class PayrollSummaryResponse(BaseModel):
    employee_id: str = Field(..., json_schema_extra={"example": "EMP001"})
    employee_name: str = Field(..., json_schema_extra={"example": "Prachi Sharma"})
    email: str = Field(..., json_schema_extra={"example": "prachi@college.edu"})
    role: str = Field(..., json_schema_extra={"example": "employee"})
    month: int = Field(..., json_schema_extra={"example": 9})
    year: int = Field(..., json_schema_extra={"example": 2026})
    base_salary: float = Field(..., json_schema_extra={"example": 35000.0})
    working_days: int = Field(..., json_schema_extra={"example": 30})
    days_present: float = Field(..., json_schema_extra={"example": 22.0})
    paid_leaves: int = Field(..., json_schema_extra={"example": 2})
    payable_days: float = Field(..., json_schema_extra={"example": 24.0})
    absent_days: float = Field(..., json_schema_extra={"example": 6.0})
    per_day_salary: float = Field(..., json_schema_extra={"example": 1166.67})
    deductions: float = Field(..., json_schema_extra={"example": 7000.0})
    final_payout: float = Field(..., json_schema_extra={"example": 28000.0})
    status: str = Field(..., json_schema_extra={"example": "calculated"})
    formula: str = Field(..., json_schema_extra={"example": "(35000 / 30) * (22 + 2) = 28000.00"})
    calculated_at: str
    model_config = ConfigDict(from_attributes=True)


class PayrollGenerateRequest(BaseModel):
    month: int = Field(..., ge=1, le=12, json_schema_extra={"example": 9})
    year: int = Field(..., ge=2020, le=2050, json_schema_extra={"example": 2026})
    user_id: Optional[int] = Field(None, json_schema_extra={"example": 1})
    working_days: int = Field(default=30, ge=1, le=31, json_schema_extra={"example": 30})


class PayrollRecordResponse(BaseModel):
    id: int
    user_id: int
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    month: int
    year: int
    base_salary: float
    present_days: int
    paid_leaves: int
    calculated_salary: float
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 1. Real-Time Dynamic Payroll Summary Endpoint
# ==========================================
@router.get(
    "/summary/{employee_id}",
    response_model=PayrollSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Fetch salary breakdown & deductions for an employee"
)
def get_payroll_summary(
    employee_id: str,
    month: Optional[int] = Query(None, ge=1, le=12, description="Month (1-12), defaults to current month"),
    year: Optional[int] = Query(None, ge=2020, le=2050, description="Year (e.g., 2026), defaults to current year"),
    working_days: int = Query(30, ge=1, le=31, description="Standard working days in month (default: 30)"),
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin)
):
    """
    Computes exact real-time salary breakdown for an employee:
    - Base Salary from profile
    - Present days dynamically fetched from attendance log
    - Paid leaves dynamically counted from approved leave requests
    - Per-day rate = Base Salary / Working Days
    - Deductions = Base Salary - Final Payout
    - Formula: (Base Salary / Working Days) * (Present Days + Paid Leaves)
    """
    try:
        summary = calculate_employee_payroll(
            db=db,
            employee_identifier=employee_id,
            month=month,
            year=year,
            working_days=working_days
        )
        return summary
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payroll calculation error: {str(e)}"
        )


# ==========================================
# 2. Batch Payroll Generation & Commit to DB
# ==========================================
@router.post(
    "/generate",
    response_model=List[PayrollRecordResponse],
    status_code=status.HTTP_200_OK,
    summary="Generate & commit monthly payrolls to DB"
)
def generate_payrolls(
    payload: PayrollGenerateRequest,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin)
):
    """
    Batch generates and persists monthly salary records for all employees or a single user.
    """
    query = db.query(models.User).filter(models.User.role == "employee")
    if payload.user_id:
        query = query.filter(models.User.id == payload.user_id)
    employees = query.all()

    if not employees:
        raise HTTPException(status_code=404, detail="No employees found for payroll generation")

    results = []
    for emp in employees:
        try:
            summary = calculate_employee_payroll(
                db=db,
                employee_identifier=emp.id,
                month=payload.month,
                year=payload.year,
                working_days=payload.working_days
            )

            # Persist or update record in database
            payroll_rec = db.query(models.Payroll).filter(
                models.Payroll.user_id == emp.id,
                models.Payroll.month == payload.month,
                models.Payroll.year == payload.year
            ).first()

            if payroll_rec:
                payroll_rec.present_days = int(summary["days_present"])
                payroll_rec.paid_leaves = summary["paid_leaves"]
                payroll_rec.calculated_salary = summary["final_payout"]
                payroll_rec.base_salary = summary["base_salary"]
            else:
                payroll_rec = models.Payroll(
                    user_id=emp.id,
                    month=payload.month,
                    year=payload.year,
                    base_salary=summary["base_salary"],
                    present_days=int(summary["days_present"]),
                    paid_leaves=summary["paid_leaves"],
                    calculated_salary=summary["final_payout"],
                    status="pending"
                )
                db.add(payroll_rec)

            db.commit()
            db.refresh(payroll_rec)

            res = PayrollRecordResponse.model_validate(payroll_rec)
            res.employee_id = emp.employee_id
            res.employee_name = emp.full_name
            results.append(res)
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to generate payroll for {emp.employee_id}: {str(e)}")

    return results


# ==========================================
# 3. List All Saved Payrolls
# ==========================================
@router.get(
    "/all",
    response_model=List[PayrollRecordResponse],
    summary="List all generated payroll records"
)
def get_all_payrolls(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin)
):
    payrolls = db.query(models.Payroll).order_by(models.Payroll.id.desc()).all()
    results = []
    for p in payrolls:
        rec = PayrollRecordResponse.model_validate(p)
        if p.user:
            rec.employee_id = p.user.employee_id
            rec.employee_name = p.user.full_name
        results.append(rec)
    return results
