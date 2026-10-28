from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.cadet import Cadet
from app.models.evaluation import Evaluation, EvaluationCriterion
from app.models.mentor import Mentor
from app.schemas.evaluation import CadetScoreSummary, EvaluationCreate


def submit_evaluation(db: Session, mentor_user_id: int, data: EvaluationCreate) -> Evaluation:
    mentor = db.query(Mentor).filter(Mentor.user_id == mentor_user_id).first()
    if not mentor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mentor profile not found")

    cadet = db.query(Cadet).filter(Cadet.id == data.cadet_id).first()
    if not cadet:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cadet not found")

    criterion = db.query(EvaluationCriterion).filter(EvaluationCriterion.id == data.criterion_id).first()
    if not criterion:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evaluation criterion not found")

    if data.score < 0 or data.score > criterion.max_score:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Score must be between 0 and {criterion.max_score} for {criterion.name}",
        )

    evaluation = Evaluation(
        cadet_id=data.cadet_id,
        mentor_id=mentor.id,
        criterion_id=data.criterion_id,
        score=data.score,
        remarks=data.remarks,
    )
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)
    return evaluation


def get_cadet_score_summary(db: Session, cadet_id: int) -> list[CadetScoreSummary]:
    """Average score per criterion for one cadet — feeds both the dashboard and the AI insight."""
    rows = (
        db.query(
            EvaluationCriterion.id.label("criterion_id"),
            EvaluationCriterion.name,
            EvaluationCriterion.label,
            EvaluationCriterion.priority,
            EvaluationCriterion.icon,
            EvaluationCriterion.max_score,
            func.avg(Evaluation.score).label("avg_score"),
        )
        .join(Evaluation, Evaluation.criterion_id == EvaluationCriterion.id)
        .filter(Evaluation.cadet_id == cadet_id)
        .group_by(
            EvaluationCriterion.id,
            EvaluationCriterion.name,
            EvaluationCriterion.label,
            EvaluationCriterion.priority,
            EvaluationCriterion.icon,
            EvaluationCriterion.max_score,
        )
        .all()
    )
    return [
        CadetScoreSummary(
            criterion_id=cid,
            criterion_name=name,
            label=label or name.replace("_", " ").title(),
            priority=priority or "normal",
            icon=icon or "🎯",
            average_score=round(avg_score, 2),
            max_score=max_score,
        )
        for cid, name, label, priority, icon, max_score, avg_score in rows
    ]


def get_battalion_dashboard(db: Session, battalion_id: int) -> dict:
    """Aggregate: overall average score across every cadet in every college in the battalion."""
    from app.models.college import College

    result = (
        db.query(func.avg(Evaluation.score), func.count(func.distinct(Cadet.id)))
        .join(Cadet, Cadet.id == Evaluation.cadet_id)
        .join(College, College.id == Cadet.college_id)
        .filter(College.battalion_id == battalion_id)
        .first()
    )
    avg_score, cadet_count = result
    return {
        "battalion_id": battalion_id,
        "average_score": round(avg_score, 2) if avg_score else None,
        "cadets_evaluated": cadet_count or 0,
    }
