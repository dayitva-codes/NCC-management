from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

# =========================================================================
# Attendance Schemas
# =========================================================================

class AttendanceItemCreate(BaseModel):
    cadet_id: int
    status: str  # "PRESENT", "ABSENT", "ON_DUTY", "MEDICAL"


class AttendanceBulkCreate(BaseModel):
    date: str  # YYYY-MM-DD
    parade_type: str  # e.g., "Ceremonial Drill", "Weapon Training"
    records: List[AttendanceItemCreate]


class AttendanceRecordOut(BaseModel):
    id: int
    cadet_id: int
    cadet_name: Optional[str] = None
    cadet_enrollment: Optional[str] = None
    date: str
    parade_type: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class CadetAttendanceStatsOut(BaseModel):
    cadet_id: int
    total_parades: int
    attended_parades: int
    attendance_rate: float
    is_exam_qualified: bool  # >= 75.0%
    history: List[AttendanceRecordOut]


# =========================================================================
# Training Tasks Schemas
# =========================================================================

class TrainingTaskCreate(BaseModel):
    title: str
    category: str  # "CAMP", "PARADE", "SOCIAL", "DRILL"
    target: str
    date: str
    time: str
    location: str
    priority: str  # "MANDATORY", "HIGH PRIORITY", "ROUTINE", "SERVICE"
    status: str = "SCHEDULED"  # "SCHEDULED", "CONFIRMED", "ONGOING", "COMPLETED"
    desc: str


class TrainingTaskUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    target: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    desc: Optional[str] = None


class TrainingTaskOut(BaseModel):
    id: int
    title: str
    category: str
    target: str
    date: str
    time: str
    location: str
    priority: str
    status: str
    desc: str
    created_at: datetime

    class Config:
        from_attributes = True
