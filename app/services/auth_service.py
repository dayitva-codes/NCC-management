import secrets
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import RoleEnum, User


def create_user(db: Session, email: str, password: str, role: RoleEnum, is_verified: bool = False) -> User:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")

    user = User(
        email=email,
        hashed_password=hash_password(password),
        role=role,
        is_verified=is_verified,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is inactive")
    return user


def login(db: Session, email: str, password: str) -> str:
    user = authenticate_user(db, email, password)
    return create_access_token({"sub": str(user.id), "role": user.role.value})


def login_with_supabase(db: Session, claims: dict) -> str:
    if claims.get("role") != "authenticated":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Supabase authentication is not authenticated")

    email = claims.get("email")
    if not email:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google account did not provide an email")

    user = db.query(User).filter(User.email == email).first()
    user_metadata = claims.get("user_metadata") or {}
    full_name = (
        user_metadata.get("full_name")
        or user_metadata.get("name")
        or email.split("@")[0].replace(".", " ").title()
    )

    if not user:
        user = User(
            email=email,
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            role=RoleEnum.cadet,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Ensure Cadet service profile exists for seamless station access
    if user.role == RoleEnum.cadet and not user.cadet_profile:
        from app.models.cadet import Cadet, GenderEnum, WingEnum
        from app.models.college import College

        default_college = db.query(College).first()
        college_id = default_college.id if default_college else 1

        cadet_profile = Cadet(
            user_id=user.id,
            college_id=college_id,
            enrollment_number=f"DL{datetime.utcnow().year % 100}SDA{user.id:04d}",
            full_name=full_name,
            mobile="9999999999",
            academic_year=2026,
            gender=GenderEnum.male,
            wing=WingEnum.SD,
            rank="CDT",
            ncc_goal="Republic Day Camp (RDC) & Military Leadership",
        )
        db.add(cadet_profile)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is inactive")

    return create_access_token({"sub": str(user.id), "role": user.role.value})
