import enum

from sqlalchemy import Column, ForeignKey, Integer, String, Enum
from sqlalchemy.orm import relationship

from app.db.base import Base


class ScopeLevelEnum(str, enum.Enum):
    institute = "institute"
    multi_college = "multi_college"


class Mentor(Base):
    __tablename__ = "mentors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    enrollment_number = Column(String, nullable=False)
    scope_level = Column(Enum(ScopeLevelEnum), nullable=False)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=True)
    battalion_id = Column(Integer, ForeignKey("battalions.id"), nullable=True)

    user = relationship("User", back_populates="mentor_profile")
    evaluations = relationship("Evaluation", back_populates="mentor")
    college = relationship("College", foreign_keys=[college_id])
    battalion = relationship("Battalion", foreign_keys=[battalion_id])

