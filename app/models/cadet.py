import enum
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class GenderEnum(str, enum.Enum):
    male = "male"
    female = "female"


class WingEnum(str, enum.Enum):
    JW = "JW"  # Junior Wing (girls)
    SW = "SW"  # Senior Wing (girls)
    JD = "JD"  # Junior Division (boys)
    SD = "SD"  # Senior Division (boys)


class Cadet(Base):
    __tablename__ = "cadets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)

    enrollment_number = Column(String, unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    mobile = Column(String, nullable=False)
    photo_url = Column(String, nullable=True)
    academic_year = Column(Integer, nullable=False)
    address = Column(String, nullable=True)
    gender = Column(Enum(GenderEnum), nullable=False)
    wing = Column(Enum(WingEnum), nullable=False)
    ncc_goal = Column(String, nullable=True)

    # Detailed Military Dossier Fields
    rank = Column(String, default="CDT")  # CDT, L/CPL, CPL, SGT, CQMS, CSM, JUO, SUO
    blood_group = Column(String, nullable=True)  # O+, A+, B+, AB+, etc.
    dob = Column(String, nullable=True)  # YYYY-MM-DD
    guardian_name = Column(String, nullable=True)
    identification_mark = Column(String, nullable=True)
    company_platoon = Column(String, nullable=True)  # e.g., "Alpha Coy, 1 Platoon"
    camps_attended = Column(JSON, default=list, nullable=True)  # List of camps with role & year
    weapon_grouping = Column(String, nullable=True)  # e.g., "1.8 cm (.22 Deluxe)"
    firing_classification = Column(String, nullable=True)  # e.g., "Marksman Grade 1"
    pft_score = Column(String, nullable=True)  # Physical Fitness Test standard
    certificate_status = Column(String, nullable=True)  # e.g., "Cert 'A' Passed • Cert 'B' Appearing"
    awards = Column(JSON, default=list, nullable=True)  # List of medals & commendations

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="cadet_profile")
    college = relationship("College", back_populates="cadets")
    evaluations = relationship("Evaluation", back_populates="cadet")
