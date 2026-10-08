from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db, require_role
from app.models.cadet import Cadet
from app.models.ops import AttendanceRecord, TrainingTask
from app.models.user import RoleEnum, User
from app.schemas.ops import (
    AttendanceBulkCreate,
    AttendanceRecordOut,
    CadetAttendanceStatsOut,
    TrainingTaskCreate,
    TrainingTaskOut,
    TrainingTaskUpdate,
)

router = APIRouter(prefix="/ops", tags=["ops"])

# =========================================================================
# Attendance Ledger Endpoints
# =========================================================================

@router.get("/attendance", response_model=List[AttendanceRecordOut])
def list_attendance(
    date: Optional[str] = None,
    cadet_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve real-time attendance muster records.
    Can be filtered by parade date (YYYY-MM-DD) or specific cadet ID.
    """
    q = db.query(AttendanceRecord)
    if date:
        q = q.filter(AttendanceRecord.date == date)
    if cadet_id:
        q = q.filter(AttendanceRecord.cadet_id == cadet_id)

    records = q.order_by(AttendanceRecord.date.desc(), AttendanceRecord.id.desc()).all()

    # Pre-populate cadet name and enrollment number
    results = []
    for r in records:
        c = db.query(Cadet).filter(Cadet.id == r.cadet_id).first()
        results.append(
            AttendanceRecordOut(
                id=r.id,
                cadet_id=r.cadet_id,
                cadet_name=c.full_name if c else "Unknown",
                cadet_enrollment=c.enrollment_number if c else "N/A",
                date=r.date,
                parade_type=r.parade_type,
                status=r.status,
                created_at=r.created_at,
            )
        )
    return results


@router.get("/attendance/cadet/me", response_model=CadetAttendanceStatsOut)
def get_my_attendance_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Calculate certified parade attendance percentage and qualification status for the logged-in cadet.
    Threshold: 75% minimum required for NCC Certificate B & C examination eligibility.
    """
    cadet = db.query(Cadet).filter(Cadet.user_id == current_user.id).first()
    if not cadet:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cadet profile not found")

    records = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.cadet_id == cadet.id)
        .order_by(AttendanceRecord.date.desc())
        .all()
    )

    total_parades = len(records)
    attended_parades = sum(1 for r in records if r.status in ["PRESENT", "ON_DUTY"])
    attendance_rate = round((attended_parades / total_parades * 100.0), 1) if total_parades > 0 else 100.0
    is_exam_qualified = attendance_rate >= 75.0

    history = [
        AttendanceRecordOut(
            id=r.id,
            cadet_id=r.cadet_id,
            cadet_name=cadet.full_name,
            cadet_enrollment=cadet.enrollment_number,
            date=r.date,
            parade_type=r.parade_type,
            status=r.status,
            created_at=r.created_at,
        )
        for r in records
    ]

    return CadetAttendanceStatsOut(
        cadet_id=cadet.id,
        total_parades=total_parades,
        attended_parades=attended_parades,
        attendance_rate=attendance_rate,
        is_exam_qualified=is_exam_qualified,
        history=history,
    )


@router.post("/attendance/bulk")
def save_bulk_attendance(
    payload: AttendanceBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "mentor", "co", "co_admin")),
):
    """
    (ANO & Admins) Commit full parade muster roll call into the database.
    Updates existing records or inserts new records for each cadet for the given date.
    """
    count = 0
    for item in payload.records:
        rec = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.cadet_id == item.cadet_id,
                AttendanceRecord.date == payload.date,
            )
            .first()
        )
        if rec:
            rec.status = item.status
            rec.parade_type = payload.parade_type
            rec.marked_by_id = current_user.id
        else:
            rec = AttendanceRecord(
                cadet_id=item.cadet_id,
                date=payload.date,
                parade_type=payload.parade_type,
                status=item.status,
                marked_by_id=current_user.id,
            )
            db.add(rec)
        count += 1

    db.commit()
    return {"message": "Roll call saved successfully", "count": count, "date": payload.date}


# =========================================================================
# Training Tasks & Calendar Endpoints
# =========================================================================

@router.get("/tasks", response_model=List[TrainingTaskOut])
def list_training_tasks(
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve real-time operational calendar of events, camp dates, and drills.
    """
    q = db.query(TrainingTask)
    if category and category != "ALL":
        q = q.filter(TrainingTask.category == category)
    if status_filter:
        q = q.filter(TrainingTask.status == status_filter)

    return q.order_by(TrainingTask.id.desc()).all()


@router.post("/tasks", response_model=TrainingTaskOut, status_code=status.HTTP_201_CREATED)
def create_training_task(
    payload: TrainingTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "mentor", "co", "co_admin")),
):
    """(ANO & Admins) Publish a new camp, inspection, or ceremonial drill to the unit calendar."""
    task = TrainingTask(
        title=payload.title,
        category=payload.category,
        target=payload.target,
        date=payload.date,
        time=payload.time,
        location=payload.location,
        priority=payload.priority,
        status=payload.status,
        desc=payload.desc,
        created_by_id=current_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.put("/tasks/{task_id}", response_model=TrainingTaskOut)
def update_training_task(
    task_id: int,
    payload: TrainingTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "mentor", "co", "co_admin")),
):
    """(ANO & Admins) Update event schedule, status, or details."""
    task = db.query(TrainingTask).filter(TrainingTask.id == task_id).first()
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Training task not found")

    for field, val in payload.dict(exclude_unset=True).items():
        if val is not None:
            setattr(task, field, val)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{task_id}")
def delete_training_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "co", "co_admin")),
):
    """(Admins) Remove an event from the calendar."""
    task = db.query(TrainingTask).filter(TrainingTask.id == task_id).first()
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Training task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task removed successfully"}
