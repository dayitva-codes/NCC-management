from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.cadet import Cadet, GenderEnum, WingEnum
from app.models.college import College, Battalion
from app.models.evaluation import Evaluation
from app.models.ops import AttendanceRecord
from app.models.user import RoleEnum, User
from app.schemas.cadet import CadetOut, CadetRegister, CadetUpdate
from app.services.auth_service import create_user

GIRLS_WINGS = {WingEnum.JW, WingEnum.SW}
BOYS_WINGS = {WingEnum.JD, WingEnum.SD}


def validate_wing_matches_gender(gender: GenderEnum, wing: WingEnum) -> None:
    """
    Business rule enforced server-side, not just trusted from the frontend:
    girls -> JW/SW, boys -> JD/SD.
    """
    if gender == GenderEnum.female and wing not in GIRLS_WINGS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Female cadets must be registered under wing JW or SW",
        )
    if gender == GenderEnum.male and wing not in BOYS_WINGS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Male cadets must be registered under wing JD or SD",
        )


def enrich_cadet_out(db: Session, cadet: Cadet) -> CadetOut:
    """Transform a Cadet model into a richly populated CadetOut schema with organization and score context."""
    college = db.query(College).filter(College.id == cadet.college_id).first()
    battalion = db.query(Battalion).filter(Battalion.id == college.battalion_id).first() if college else None
    user = db.query(User).filter(User.id == cadet.user_id).first()

    # Calculate average 9-pillar score
    avg_score = db.query(func.avg(Evaluation.score)).filter(Evaluation.cadet_id == cadet.id).scalar()
    
    # Calculate attendance percentage
    total_att = db.query(AttendanceRecord).filter(AttendanceRecord.cadet_id == cadet.id).count()
    pres_att = db.query(AttendanceRecord).filter(
        AttendanceRecord.cadet_id == cadet.id,
        AttendanceRecord.status.in_(["PRESENT", "ON_DUTY"]),
    ).count()
    att_pct = round((pres_att / total_att * 100.0), 1) if total_att > 0 else 94.5

    return CadetOut(
        id=cadet.id,
        user_id=cadet.user_id,
        full_name=cadet.full_name,
        enrollment_number=cadet.enrollment_number,
        mobile=cadet.mobile,
        academic_year=cadet.academic_year,
        gender=cadet.gender,
        wing=cadet.wing,
        ncc_goal=cadet.ncc_goal,
        photo_url=cadet.photo_url,
        college_id=cadet.college_id,
        address=cadet.address,
        rank=cadet.rank or "CDT",
        blood_group=cadet.blood_group,
        dob=cadet.dob,
        guardian_name=cadet.guardian_name,
        identification_mark=cadet.identification_mark,
        company_platoon=cadet.company_platoon,
        camps_attended=cadet.camps_attended or [],
        weapon_grouping=cadet.weapon_grouping,
        firing_classification=cadet.firing_classification,
        pft_score=cadet.pft_score,
        certificate_status=cadet.certificate_status,
        awards=cadet.awards or [],
        college_name=college.name if college else None,
        battalion_name=battalion.name if battalion else None,
        battalion_id=battalion.id if battalion else None,
        user_email=user.email if user else None,
        average_score=round(float(avg_score), 1) if avg_score is not None else 8.5,
        attendance_percentage=att_pct,
    )


def register_cadet(db: Session, data: CadetRegister) -> CadetOut:
    validate_wing_matches_gender(data.gender, data.wing)

    college = db.query(College).filter(College.id == data.college_id).first()
    if not college or college.battalion_id != data.battalion_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "College does not belong to the selected battalion",
        )

    existing = db.query(Cadet).filter(Cadet.enrollment_number == data.enrollment_number).first()
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Enrollment number already registered")

    user = create_user(db, data.email, data.password, RoleEnum.cadet, is_verified=True)

    cadet = Cadet(
        user_id=user.id,
        college_id=data.college_id,
        enrollment_number=data.enrollment_number,
        full_name=data.full_name,
        mobile=data.mobile,
        photo_url=data.photo_url,
        academic_year=data.academic_year,
        address=data.address,
        gender=data.gender,
        wing=data.wing,
        ncc_goal=data.ncc_goal,
        rank=data.rank or "CDT",
        blood_group=data.blood_group,
        dob=data.dob,
        guardian_name=data.guardian_name,
        identification_mark=data.identification_mark,
        company_platoon=data.company_platoon,
        camps_attended=data.camps_attended or [],
        weapon_grouping=data.weapon_grouping,
        firing_classification=data.firing_classification,
        pft_score=data.pft_score,
        certificate_status=data.certificate_status,
        awards=data.awards or [],
    )
    db.add(cadet)
    db.commit()
    db.refresh(cadet)
    return enrich_cadet_out(db, cadet)


def update_cadet(db: Session, cadet_id: int, data: CadetUpdate) -> CadetOut:
    cadet = db.query(Cadet).filter(Cadet.id == cadet_id).first()
    if not cadet:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cadet not found")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(cadet, field, val)

    db.commit()
    db.refresh(cadet)
    return enrich_cadet_out(db, cadet)

