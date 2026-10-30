from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.services import evaluation_service, leaderboard_service

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/battalion/{battalion_id}")
def battalion_dashboard(
    battalion_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return evaluation_service.get_battalion_dashboard(db, battalion_id)


@router.get("/leaderboard")
def leaderboard(
    battalion_id: int | None = None,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return leaderboard_service.get_leaderboard(db, battalion_id, limit)
