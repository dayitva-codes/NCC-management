from datetime import datetime

from pydantic import BaseModel


class EvaluationCreate(BaseModel):
    cadet_id: int
    criterion_id: int
    score: float
    remarks: str | None = None


class EvaluationOut(BaseModel):
    id: int
    cadet_id: int
    mentor_id: int
    criterion_id: int
    score: float
    remarks: str | None
    evaluated_at: datetime

    class Config:
        from_attributes = True


class CriterionBase(BaseModel):
    name: str
    label: str | None = None
    max_score: int = 10
    priority: str = "normal"  # "high" (More to Focus), "normal" (Standard Focus), "low" (Less to Focus)
    description: str | None = None
    icon: str | None = "🎯"
    category: str | None = "custom"


class CriterionCreate(BaseModel):
    name: str
    label: str | None = None
    max_score: int = 10
    priority: str = "high"  # Default when adding specific focus parameters
    description: str | None = None
    icon: str | None = "🎯"
    category: str | None = "custom"


class CriterionUpdate(BaseModel):
    label: str | None = None
    max_score: int | None = None
    priority: str | None = None
    description: str | None = None
    icon: str | None = None
    category: str | None = None
    is_active: bool | None = None


class CriterionOut(BaseModel):
    id: int
    name: str
    label: str | None = None
    max_score: int = 10
    priority: str = "normal"
    description: str | None = None
    icon: str | None = "🎯"
    category: str | None = "core"
    created_by_role: str | None = "admin"
    is_active: bool = True

    class Config:
        from_attributes = True


class CadetScoreSummary(BaseModel):
    """One row per criterion, averaged — feeds the dashboard, matrix, and AI insights."""
    criterion_id: int | None = None
    criterion_name: str
    label: str | None = None
    priority: str = "normal"
    icon: str | None = "🎯"
    average_score: float
    max_score: int
