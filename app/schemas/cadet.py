from typing import Any, List, Optional
from pydantic import BaseModel, EmailStr

from app.models.cadet import GenderEnum, WingEnum


class CadetRegister(BaseModel):
    # account
    email: EmailStr
    password: str
    # org placement
    battalion_id: int
    college_id: int
    # personal
    full_name: str
    enrollment_number: str
    mobile: str
    academic_year: int
    address: Optional[str] = None
    gender: GenderEnum
    wing: WingEnum
    ncc_goal: Optional[str] = None
    photo_url: Optional[str] = None

    # Detailed military dossier fields
    rank: Optional[str] = "CDT"
    blood_group: Optional[str] = None
    dob: Optional[str] = None
    guardian_name: Optional[str] = None
    identification_mark: Optional[str] = None
    company_platoon: Optional[str] = None
    camps_attended: Optional[List[Any]] = []
    weapon_grouping: Optional[str] = None
    firing_classification: Optional[str] = None
    pft_score: Optional[str] = None
    certificate_status: Optional[str] = None
    awards: Optional[List[Any]] = []


class CadetUpdate(BaseModel):
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    academic_year: Optional[int] = None
    address: Optional[str] = None
    ncc_goal: Optional[str] = None
    photo_url: Optional[str] = None
    rank: Optional[str] = None
    blood_group: Optional[str] = None
    dob: Optional[str] = None
    guardian_name: Optional[str] = None
    identification_mark: Optional[str] = None
    company_platoon: Optional[str] = None
    camps_attended: Optional[List[Any]] = None
    weapon_grouping: Optional[str] = None
    firing_classification: Optional[str] = None
    pft_score: Optional[str] = None
    certificate_status: Optional[str] = None
    awards: Optional[List[Any]] = None


class CadetOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    full_name: str
    enrollment_number: str
    mobile: str
    academic_year: int
    gender: GenderEnum
    wing: WingEnum
    ncc_goal: Optional[str] = None
    photo_url: Optional[str] = None
    college_id: int
    address: Optional[str] = None

    # Detailed Military Dossier Fields
    rank: Optional[str] = "CDT"
    blood_group: Optional[str] = None
    dob: Optional[str] = None
    guardian_name: Optional[str] = None
    identification_mark: Optional[str] = None
    company_platoon: Optional[str] = None
    camps_attended: Optional[List[Any]] = []
    weapon_grouping: Optional[str] = None
    firing_classification: Optional[str] = None
    pft_score: Optional[str] = None
    certificate_status: Optional[str] = None
    awards: Optional[List[Any]] = []

    # Organizational Context
    college_name: Optional[str] = None
    battalion_name: Optional[str] = None
    battalion_id: Optional[int] = None
    user_email: Optional[str] = None
    average_score: Optional[float] = None
    attendance_percentage: Optional[float] = None

    class Config:
        from_attributes = True

