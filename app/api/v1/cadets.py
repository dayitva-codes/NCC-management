from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db, require_role
from app.models.cadet import Cadet
from app.models.user import User
from app.schemas.cadet import CadetOut, CadetRegister, CadetUpdate
from app.schemas.evaluation import CadetScoreSummary
from app.services import cadet_service, evaluation_service

router = APIRouter(prefix="/cadets", tags=["cadets"])


@router.post("/register", response_model=CadetOut, status_code=status.HTTP_201_CREATED)
def register(data: CadetRegister, db: Session = Depends(get_db)):
    return cadet_service.register_cadet(db, data)


@router.get("", response_model=List[CadetOut])
@router.get("/", response_model=List[CadetOut])
def list_cadets(
    college_id: Optional[int] = None,
    wing: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Cadet)
    # If cadet, only see self
    if current_user.role.value == "cadet":
        query = query.filter(Cadet.user_id == current_user.id)
    # If mentor with institute scope, filter by mentor's college
    elif current_user.role.value == "mentor":
        mentor = current_user.mentor_profile
        if mentor and mentor.college_id and mentor.scope_level.value == "institute":
            query = query.filter(Cadet.college_id == mentor.college_id)
    
    if college_id:
        query = query.filter(Cadet.college_id == college_id)
    if wing:
        query = query.filter(Cadet.wing == wing)
    
    cadets = query.all()
    return [cadet_service.enrich_cadet_out(db, c) for c in cadets]


@router.get("/me", response_model=CadetOut)
def get_my_profile(
    current_user: User = Depends(require_role("cadet")), db: Session = Depends(get_db)
):
    cadet = db.query(Cadet).filter(Cadet.user_id == current_user.id).first()
    if not cadet:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cadet profile not found")
    return cadet_service.enrich_cadet_out(db, cadet)


@router.get("/{cadet_id}", response_model=CadetOut)
def get_cadet(cadet_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    cadet = db.query(Cadet).filter(Cadet.id == cadet_id).first()
    if not cadet:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cadet not found")
    return cadet_service.enrich_cadet_out(db, cadet)


@router.put("/{cadet_id}", response_model=CadetOut)
def update_cadet(
    cadet_id: int,
    data: CadetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "mentor", "co", "co_admin")),
):
    """(Officers & Admins) Update a cadet's rank, camps, firing classification, or dossier records."""
    return cadet_service.update_cadet(db, cadet_id=cadet_id, data=data)


@router.get("/{cadet_id}/scores", response_model=List[CadetScoreSummary])
def get_cadet_scores(cadet_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return evaluation_service.get_cadet_score_summary(db, cadet_id)


