import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class RoleEnum(str, enum.Enum):
    cadet = "cadet"
    mentor = "mentor"
    admin = "admin"
    co = "co"
    co_admin = "co_admin"


class User(Base):
    """
    One shared identity table for everyone who can log in.
    Cadet/Mentor/Admin profile tables hang off this with a user_id FK,
    instead of three separate registration+login systems.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)  # mentors/admins gated on this
    created_at = Column(DateTime, default=datetime.utcnow)

    cadet_profile = relationship("Cadet", back_populates="user", uselist=False)
    mentor_profile = relationship("Mentor", back_populates="user", uselist=False)
