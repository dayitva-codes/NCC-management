from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base

class AttendanceRecord(Base):
    """
    Relational Attendance Ledger:
    Records roll call attendance per cadet per training parade date.
    Feeds certified attendance calculations for C-Certificate exam eligibility (75% minimum).
    """
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    cadet_id = Column(Integer, ForeignKey("cadets.id"), nullable=False, index=True)
    date = Column(String, nullable=False, index=True)       # ISO format: YYYY-MM-DD
    parade_type = Column(String, nullable=False)            # e.g., "Ceremonial Drill", "Weapon Training"
    status = Column(String, nullable=False)                 # "PRESENT", "ABSENT", "ON_DUTY", "MEDICAL"
    marked_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    cadet = relationship("Cadet")
    marked_by = relationship("User")


class TrainingTask(Base):
    """
    Operational Tasks & Calendar of Events:
    Maintains official scheduled camps, rehearsals, firing drills, and social initiatives.
    """
    __tablename__ = "training_tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)  # "CAMP", "PARADE", "SOCIAL", "DRILL"
    target = Column(String, nullable=False)                # Contingent or squad scope
    date = Column(String, nullable=False)                  # Scheduled date or range
    time = Column(String, nullable=False)                  # Scheduled time
    location = Column(String, nullable=False)              # Location or venue
    priority = Column(String, nullable=False)              # "MANDATORY", "HIGH PRIORITY", "ROUTINE", "SERVICE"
    status = Column(String, nullable=False)                # "SCHEDULED", "CONFIRMED", "ONGOING", "COMPLETED"
    desc = Column(String, nullable=False)                  # Description & directives
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
