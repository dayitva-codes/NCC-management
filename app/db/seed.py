from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.college import Battalion, College
from app.models.cadet import Cadet, GenderEnum, WingEnum
from app.models.mentor import Mentor, ScopeLevelEnum
from app.models.evaluation import EvaluationCriterion, Evaluation
from app.models.user import RoleEnum, User

DEFAULT_CRITERIA = [
    "drill", "physical_fitness", "communication", "leadership",
    "ncc_knowledge", "discipline", "punctuality", "teamwork", "attendance",
]


def seed(db: Session) -> None:
    # 1. Criteria
    if db.query(EvaluationCriterion).count() == 0:
        for name in DEFAULT_CRITERIA:
            db.add(EvaluationCriterion(name=name, max_score=10))
        db.commit()

    # 2. Admin
    if db.query(User).filter(User.role == RoleEnum.admin).count() == 0:
        admin = User(
            email="admin@ncc.local",
            hashed_password=hash_password("admin123"),
            role=RoleEnum.admin,
            is_verified=True,
        )
        db.add(admin)
        db.commit()
    # If running in automated tests, let test_app.py test registration from scratch
    import os
    if os.environ.get("TESTING") == "1":
        return

    # 3. Battalion & College
    battalion = db.query(Battalion).filter(Battalion.code == "3MP-HQ").first()
    if not battalion:
        battalion = Battalion(name="3 MP Girls Bn NCC (HQ)", code="3MP-HQ")
        db.add(battalion)
        db.commit()
        db.refresh(battalion)

    college = db.query(College).filter(College.name == "Govt Girls Post Graduate College").first()
    if not college:
        college = College(
            battalion_id=battalion.id,
            name="Govt Girls Post Graduate College",
            academic_year_start=2026,
        )
        db.add(college)
        db.commit()
        db.refresh(college)

    # 4. Mentor User & Profile
    mentor_user = db.query(User).filter(User.email == "mentor1@test.com").first()
    if not mentor_user:
        mentor_user = User(
            email="mentor1@test.com",
            hashed_password=hash_password("password123"),
            role=RoleEnum.mentor,
            is_verified=True,
        )
        db.add(mentor_user)
        db.commit()
        db.refresh(mentor_user)

    mentor_profile = db.query(Mentor).filter(Mentor.user_id == mentor_user.id).first()
    if not mentor_profile:
        mentor_profile = Mentor(
            user_id=mentor_user.id,
            enrollment_number="MENT001",
            scope_level=ScopeLevelEnum.institute,
            college_id=college.id,
            battalion_id=battalion.id,
        )
        db.add(mentor_profile)
        db.commit()
        db.refresh(mentor_profile)
        print("Seeded mentor login -> email: mentor1@test.com  password: password123")

    # 5. Cadet User & Profile
    cadet_user = db.query(User).filter(User.email == "cadet1@test.com").first()
    if not cadet_user:
        cadet_user = User(
            email="cadet1@test.com",
            hashed_password=hash_password("password123"),
            role=RoleEnum.cadet,
            is_verified=True,
        )
        db.add(cadet_user)
        db.commit()
        db.refresh(cadet_user)

    cadet_profile = db.query(Cadet).filter(Cadet.user_id == cadet_user.id).first()
    if not cadet_profile:
        cadet_profile = Cadet(
            user_id=cadet_user.id,
            college_id=college.id,
            enrollment_number="MP24SWG0001",
            full_name="Priya Sharma",
            mobile="9876543210",
            academic_year=2,
            gender=GenderEnum.female,
            wing=WingEnum.SW,
            ncc_goal="Republic Day Camp (RDC) & Best Cadet",
        )
        db.add(cadet_profile)
        db.commit()
        db.refresh(cadet_profile)
        print("Seeded cadet login -> email: cadet1@test.com  password: password123")

    # 6. Sample Evaluations for Cadet
    if db.query(Evaluation).filter(Evaluation.cadet_id == cadet_profile.id).count() == 0:
        criteria_list = db.query(EvaluationCriterion).all()
        sample_scores = {
            "drill": 9.2,
            "physical_fitness": 8.8,
            "communication": 8.5,
            "leadership": 9.0,
            "ncc_knowledge": 8.4,
            "discipline": 9.6,
            "punctuality": 9.0,
            "teamwork": 8.9,
            "attendance": 9.5,
        }
        for crit in criteria_list:
            score = sample_scores.get(crit.name, 8.5)
            db.add(Evaluation(
                cadet_id=cadet_profile.id,
                mentor_id=mentor_profile.id,
                criterion_id=crit.id,
                score=score,
                remarks=f"Demonstrated excellent capability in {crit.name.replace('_', ' ')}.",
            ))
        db.commit()

