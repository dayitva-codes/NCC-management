from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.cadet import Cadet
from app.models.user import RoleEnum, User
from app.services import ai_insight_service, evaluation_service

router = APIRouter(tags=["ai"])


@router.get("/cadets/{cadet_id}/ai-insight")
def get_ai_insight(
    cadet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate tailored training and drill regimen. Protected against unauthorized cross-cadet access."""
    cadet = db.query(Cadet).filter(Cadet.id == cadet_id).first()
    if not cadet:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cadet not found")

    is_officer = current_user.role in [RoleEnum.admin, RoleEnum.mentor, RoleEnum.co, RoleEnum.co_admin]
    if not is_officer and cadet.user_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access to other cadets' AI insights is restricted")

    scores = evaluation_service.get_cadet_score_summary(db, cadet_id)
    insight = ai_insight_service.generate_insight(scores)
    return insight
