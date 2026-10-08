import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.core.dependencies import get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.user import RoleEnum, User
from app.models.library import StudyMaterial

TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    admin = User(email="admin_lib@test.local", hashed_password=hash_password("admin123"), role=RoleEnum.admin, is_verified=True)
    cadet = User(email="cadet_lib@test.local", hashed_password=hash_password("cadet123"), role=RoleEnum.cadet, is_verified=True)
    db.add_all([admin, cadet])
    db.commit()

    sample_book = StudyMaterial(
        title="Cadet Foot Drill Manual 2026",
        subject="Foot Drill",
        category="handbook",
        certificate_level="common",
        wing="common",
        author="DG NCC",
        edition_year="2026 Edition",
        description="Comprehensive foot drill manual",
        cover_icon="📖",
        file_url="https://example.com/drill.pdf",
        chapters=[
            {"chapter_number": 1, "title": "Attention & Stand at Ease", "content": "Basic foot positioning", "key_points": ["Heels together", "Toes 30 degrees"]}
        ],
        is_published=True
    )
    db.add(sample_book)
    db.commit()
    db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def admin_headers():
    db = TestingSessionLocal()
    u = db.query(User).filter(User.email == "admin_lib@test.local").first()
    t = create_access_token({"sub": str(u.id), "role": u.role.value})
    db.close()
    return {"Authorization": f"Bearer {t}"}

@pytest.fixture
def cadet_headers():
    db = TestingSessionLocal()
    u = db.query(User).filter(User.email == "cadet_lib@test.local").first()
    t = create_access_token({"sub": str(u.id), "role": u.role.value})
    db.close()
    return {"Authorization": f"Bearer {t}"}

def test_list_and_get_study_materials(cadet_headers):
    client = TestClient(app)

    # Cadets can read library
    res = client.get("/api/v1/library", headers=cadet_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    book_id = data[0]["id"]
    assert data[0]["title"] == "Cadet Foot Drill Manual 2026"

    # Detail view
    res2 = client.get(f"/api/v1/library/{book_id}", headers=cadet_headers)
    assert res2.status_code == 200
    assert res2.json()["subject"] == "Foot Drill"

def test_admin_crud_study_material(admin_headers, cadet_headers):
    client = TestClient(app)

    # Cadet cannot create books (Forbidden)
    new_book = {
        "title": "Aero Navigation & Flight Principles",
        "subject": "Aviation",
        "category": "specialized",
        "certificate_level": "B",
        "wing": "air",
        "author": "IAF Trg Command",
        "edition_year": "2026",
        "description": "Navigation and meteorology guide",
        "cover_icon": "✈️",
        "file_url": "https://example.com/flight.pdf",
        "chapters": [
            {"chapter_number": 1, "title": "Altimetry and Airspeed", "content": "Instruments", "key_points": ["Pitot static tube"]}
        ],
        "is_published": True
    }
    fail_res = client.post("/api/v1/library", json=new_book, headers=cadet_headers)
    assert fail_res.status_code == 403

    # Admin can create books
    create_res = client.post("/api/v1/library", json=new_book, headers=admin_headers)
    assert create_res.status_code == 201
    created_id = create_res.json()["id"]

    # Admin can update book
    update_res = client.put(f"/api/v1/library/{created_id}", json={"title": "Aero Navigation Vol 2 (Updated)"}, headers=admin_headers)
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Aero Navigation Vol 2 (Updated)"

    # Admin can delete book
    del_res = client.delete(f"/api/v1/library/{created_id}", headers=admin_headers)
    assert del_res.status_code == 200
