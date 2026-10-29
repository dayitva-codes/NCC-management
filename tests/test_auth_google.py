import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.db.base import Base
from app.core.dependencies import get_db
from app.main import app
from app.services import auth_service
from app.models.user import User, RoleEnum
from app.models.cadet import Cadet
from app.models.college import Battalion, College

# Shared in-memory SQLite using StaticPool
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


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    b = Battalion(name="27 CG Bn NCC", code="27-CG-TEST")
    db.add(b)
    db.commit()
    c = College(name="Science College Raipur", battalion_id=b.id, academic_year_start=2026)
    db.add(c)
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


def test_supabase_google_login_provisions_cadet():
    db = TestingSessionLocal()

    claims = {
        "role": "authenticated",
        "email": "cadet.vikram@gmail.com",
        "sub": "supabase-uuid-12345",
        "user_metadata": {
            "full_name": "Vikram Singh",
            "name": "Vikram Singh",
        },
    }

    # 1. First login with Google
    token = auth_service.login_with_supabase(db, claims)
    assert token is not None

    # Verify user created in DB
    user = db.query(User).filter(User.email == "cadet.vikram@gmail.com").first()
    assert user is not None
    assert user.role == RoleEnum.cadet
    assert user.is_verified is True

    # Verify Cadet profile auto-provisioned
    cadet = db.query(Cadet).filter(Cadet.user_id == user.id).first()
    assert cadet is not None
    assert cadet.full_name == "Vikram Singh"
    assert cadet.rank == "CDT"
    assert "DL" in cadet.enrollment_number

    # 2. Second login with same Google credentials returns valid token without duplicate
    token2 = auth_service.login_with_supabase(db, claims)
    assert token2 is not None
    assert db.query(User).filter(User.email == "cadet.vikram@gmail.com").count() == 1

    # 3. Test /auth/me with the issued token
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "cadet.vikram@gmail.com"
    assert data["role"] == "cadet"
    assert data["full_name"] == "Vikram Singh"

    db.close()
