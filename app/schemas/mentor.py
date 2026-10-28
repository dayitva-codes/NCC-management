from pydantic import BaseModel, EmailStr

from app.models.mentor import ScopeLevelEnum


class MentorRegister(BaseModel):
    email: EmailStr
    password: str
    enrollment_number: str
    scope_level: ScopeLevelEnum
    college_id: int | None = None
    battalion_id: int | None = None


class MentorOut(BaseModel):
    id: int
    user_id: int
    enrollment_number: str
    scope_level: ScopeLevelEnum
    college_id: int | None
    battalion_id: int | None
    college_name: str | None = None
    battalion_name: str | None = None

    class Config:
        from_attributes = True

