from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_role
from app.models.college import Battalion, College
from app.models.user import User

router = APIRouter(tags=["colleges"])


class BattalionCreate(BaseModel):
    name: str
    code: str


class CollegeCreate(BaseModel):
    battalion_id: int
    name: str
    academic_year_start: int


@router.post("/battalions", status_code=status.HTTP_201_CREATED)
def create_battalion(
    data: BattalionCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin", "co", "co_admin")),
):
    """(Admin Only) Create a new NCC Battalion."""
    existing = db.query(Battalion).filter(Battalion.code == data.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Battalion with code '{data.code}' already exists",
        )
    b = Battalion(**data.model_dump())
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


@router.get("/battalions")
def list_battalions(db: Session = Depends(get_db)):
    """Retrieve all affiliated battalions."""
    return db.query(Battalion).all()


@router.post("/colleges", status_code=status.HTTP_201_CREATED)
def create_college(
    data: CollegeCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin", "co", "co_admin")),
):
    """(Admin Only) Register an affiliated educational institution/college."""
    existing = db.query(College).filter(
        College.battalion_id == data.battalion_id,
        College.name == data.name
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"College '{data.name}' already exists in this battalion",
        )
    c = College(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.get("/colleges")
def list_colleges(battalion_id: int | None = None, db: Session = Depends(get_db)):
    """Retrieve colleges, optionally filtered by battalion ID."""
    q = db.query(College)
    if battalion_id:
        q = q.filter(College.battalion_id == battalion_id)
    return q.all()
