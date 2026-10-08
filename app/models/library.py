from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, JSON

from app.db.base import Base


class StudyMaterial(Base):
    """
    Official NCC Syllabus Books, Manuals, and Online Training Modules.
    Accessible to all Cadets, Mentors, and Admins; customizable by Admin.
    """
    __tablename__ = "study_materials"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    subject = Column(String, nullable=False, index=True)  # e.g., Weapon Training, Drill, Map Reading
    category = Column(String, default="handbook", index=True)  # handbook, core_syllabus, specialized, reference
    certificate_level = Column(String, default="common", index=True)  # common, A, B, C
    wing = Column(String, default="common", index=True)  # common, army, navy, air
    author = Column(String, default="Directorate General NCC")
    edition_year = Column(String, default="2025-26")
    description = Column(Text, nullable=True)
    file_url = Column(String, nullable=True)
    cover_icon = Column(String, default="📖")
    chapters = Column(JSON, nullable=True)  # List of { chapter_number, title, content, key_points }
    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
