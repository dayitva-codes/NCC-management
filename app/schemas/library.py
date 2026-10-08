from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel


class ChapterSchema(BaseModel):
    chapter_number: int
    title: str
    content: Optional[str] = None
    key_points: Optional[List[str]] = None


class StudyMaterialBase(BaseModel):
    title: str
    subject: str
    category: Optional[str] = "handbook"
    certificate_level: Optional[str] = "common"
    wing: Optional[str] = "common"
    author: Optional[str] = "Directorate General NCC"
    edition_year: Optional[str] = "2025-26"
    description: Optional[str] = None
    file_url: Optional[str] = None
    cover_icon: Optional[str] = "📖"
    chapters: Optional[List[Any]] = None
    is_published: Optional[bool] = True


class StudyMaterialCreate(StudyMaterialBase):
    pass


class StudyMaterialUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    category: Optional[str] = None
    certificate_level: Optional[str] = None
    wing: Optional[str] = None
    author: Optional[str] = None
    edition_year: Optional[str] = None
    description: Optional[str] = None
    file_url: Optional[str] = None
    cover_icon: Optional[str] = None
    chapters: Optional[List[Any]] = None
    is_published: Optional[bool] = None


class StudyMaterialOut(StudyMaterialBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
