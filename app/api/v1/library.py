from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db, require_role
from app.models.library import StudyMaterial
from app.models.user import User
from app.schemas.library import StudyMaterialCreate, StudyMaterialOut, StudyMaterialUpdate

router = APIRouter()


@router.get("", response_model=List[StudyMaterialOut])
def list_study_materials(
    search: Optional[str] = None,
    category: Optional[str] = None,
    certificate_level: Optional[str] = None,
    wing: Optional[str] = None,
    subject: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve all official NCC syllabus books, manuals, and online study modules.
    Accessible by Cadets, Mentors, and Administrators.
    """
    q = db.query(StudyMaterial)

    if search:
        term = f"%{search.strip().lower()}%"
        q = q.filter(
            StudyMaterial.title.ilike(term)
            | StudyMaterial.subject.ilike(term)
            | StudyMaterial.author.ilike(term)
            | StudyMaterial.description.ilike(term)
        )
    if category and category != "all":
        q = q.filter(StudyMaterial.category == category)
    if certificate_level and certificate_level != "all":
        q = q.filter(StudyMaterial.certificate_level.in_([certificate_level, "common"]))
    if wing and wing != "all":
        q = q.filter(StudyMaterial.wing.in_([wing, "common"]))
    if subject and subject != "all":
        q = q.filter(StudyMaterial.subject.ilike(f"%{subject.strip()}%"))

    # Only show published to non-admins
    is_admin = current_user.role in ["admin", "co", "co_admin"]
    if not is_admin:
        q = q.filter(StudyMaterial.is_published == True)

    return q.order_by(StudyMaterial.id.asc()).offset(skip).limit(limit).all()


@router.get("/{material_id}", response_model=StudyMaterialOut)
def get_study_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve full chapters and study contents for a specific handbook or guide."""
    item = db.query(StudyMaterial).filter(StudyMaterial.id == material_id).first()
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Study material not found")
    return item


@router.post("", response_model=StudyMaterialOut, status_code=status.HTTP_201_CREATED)
def create_study_material(
    payload: StudyMaterialCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin", "co", "co_admin")),
):
    """(Admin) Add a new handbook, syllabus guide, or online training module."""
    data = payload.dict()
    item = StudyMaterial(**data)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{material_id}", response_model=StudyMaterialOut)
def update_study_material(
    material_id: int,
    payload: StudyMaterialUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin", "co", "co_admin")),
):
    """(Admin) Edit and update an existing handbook or online training guide."""
    item = db.query(StudyMaterial).filter(StudyMaterial.id == material_id).first()
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Study material not found")

    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{material_id}")
def delete_study_material(
    material_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin", "co", "co_admin")),
):
    """(Admin) Delete or archive a handbook from the library."""
    item = db.query(StudyMaterial).filter(StudyMaterial.id == material_id).first()
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Study material not found")
    db.delete(item)
    db.commit()
    return {"message": "Study material removed successfully"}
