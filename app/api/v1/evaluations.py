import re
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_role
from app.models.evaluation import Evaluation, EvaluationCriterion
from app.models.user import User
from app.schemas.evaluation import (
    CriterionCreate,
    CriterionOut,
    CriterionUpdate,
    EvaluationCreate,
    EvaluationOut,
)
from app.services import evaluation_service

router = APIRouter(prefix="/evaluations", tags=["evaluations"])


@router.get("/criteria", response_model=list[CriterionOut])
def list_criteria(
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
):
    """
    Returns evaluation criteria.
    Sorted with 'high' (More to Focus) first, followed by 'normal', then 'low' (Less to Focus).
    """
    query = db.query(EvaluationCriterion)
    if not include_inactive:
        query = query.filter(EvaluationCriterion.is_active != 0)
    
    criteria = query.all()

    # Priority rank: high ("More to Focus") -> normal -> low ("Less to Focus")
    priority_order = {"high": 0, "more_focus": 0, "normal": 1, "standard": 1, "low": 2, "less_focus": 2}
    criteria.sort(key=lambda c: (priority_order.get((c.priority or "").lower(), 1), c.id))
    return criteria


@router.post("/criteria", response_model=CriterionOut, status_code=status.HTTP_201_CREATED)
def create_criterion(
    data: CriterionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "mentor")),
):
    """
    Add a new assessment parameter to the 9 Pillars evaluation framework.
    Open to both Admin (Commanding Officer) and verified Mentors (ANO Evaluators).
    """
    if user.role.value == "mentor" and not user.is_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Mentor account not yet verified by Admin.")

    # Sanitize name slug
    clean_name = re.sub(r"[^a-zA-Z0-9_]+", "_", data.name.strip().lower()).strip("_")
    if not clean_name:
        clean_name = "param_" + str(int(db.query(EvaluationCriterion).count()) + 1)

    existing = db.query(EvaluationCriterion).filter(EvaluationCriterion.name == clean_name).first()
    if existing:
        # If deactivated, reactivate and update
        if existing.is_active == 0:
            existing.is_active = 1
            if data.label: existing.label = data.label
            if data.priority: existing.priority = data.priority
            if data.description: existing.description = data.description
            if data.icon: existing.icon = data.icon
            if data.max_score: existing.max_score = data.max_score
            db.commit()
            db.refresh(existing)
            return existing
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Parameter identifier '{clean_name}' already exists.")

    criterion = EvaluationCriterion(
        name=clean_name,
        label=data.label or clean_name.replace("_", " ").title(),
        max_score=data.max_score or 10,
        priority=data.priority or "high",
        description=data.description,
        icon=data.icon or "🎯",
        category=data.category or "custom",
        created_by_role=user.role.value,
        is_active=1,
    )
    db.add(criterion)
    db.commit()
    db.refresh(criterion)
    return criterion


@router.put("/criteria/{criterion_id}", response_model=CriterionOut)
def update_criterion(
    criterion_id: int,
    data: CriterionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "mentor")),
):
    """
    Update priority (e.g. More to Focus, Less to Focus, Standard) or parameter details.
    Open to both Admin and verified Mentors.
    """
    if user.role.value == "mentor" and not user.is_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Mentor account not yet verified by Admin.")

    criterion = db.query(EvaluationCriterion).filter(EvaluationCriterion.id == criterion_id).first()
    if not criterion:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evaluation parameter not found.")

    if data.label is not None:
        criterion.label = data.label
    if data.max_score is not None:
        criterion.max_score = data.max_score
    if data.priority is not None:
        criterion.priority = data.priority
    if data.description is not None:
        criterion.description = data.description
    if data.icon is not None:
        criterion.icon = data.icon
    if data.category is not None:
        criterion.category = data.category
    if data.is_active is not None:
        criterion.is_active = 1 if data.is_active else 0

    db.commit()
    db.refresh(criterion)
    return criterion


@router.delete("/criteria/{criterion_id}")
def delete_criterion(
    criterion_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "mentor")),
):
    """
    Deactivate or remove a parameter from the evaluation framework.
    Open to both Admin and verified Mentors.
    """
    if user.role.value == "mentor" and not user.is_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Mentor account not yet verified by Admin.")

    criterion = db.query(EvaluationCriterion).filter(EvaluationCriterion.id == criterion_id).first()
    if not criterion:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evaluation parameter not found.")

    # Check if there are evaluations attached
    eval_count = db.query(Evaluation).filter(Evaluation.criterion_id == criterion_id).count()
    if eval_count > 0:
        # Soft delete
        criterion.is_active = 0
        db.commit()
        return {"message": "Parameter marked inactive (retained for evaluation history)", "status": "deactivated"}

    db.delete(criterion)
    db.commit()
    return {"message": "Parameter deleted successfully", "status": "deleted"}


@router.post("/", response_model=EvaluationOut, status_code=status.HTTP_201_CREATED)
def submit(
    data: EvaluationCreate,
    db: Session = Depends(get_db),
    mentor: User = Depends(require_role("mentor", "admin")),
):
    if mentor.role.value == "mentor" and not mentor.is_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Mentor not yet verified by admin")
    return evaluation_service.submit_evaluation(db, mentor.id, data)
