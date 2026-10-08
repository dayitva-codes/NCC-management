import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.core.dependencies import get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.college import Battalion, College
from app.models.cadet import Cadet, GenderEnum, WingEnum
from app.models.ops import AttendanceRecord, TrainingTask
from app.models.user import RoleEnum, User

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

    # Create admin, mentor, cadet users
    admin = User(email="admin_ops@test.local", hashed_password=hash_password("admin123"), role=RoleEnum.admin, is_verified=True)
    mentor = User(email="mentor_ops@test.local", hashed_password=hash_password("mentor123"), role=RoleEnum.mentor, is_verified=True)
    cadet_u = User(email="cadet_ops@test.local", hashed_password=hash_password("cadet123"), role=RoleEnum.cadet, is_verified=True)
    db.add_all([admin, mentor, cadet_u])
    db.commit()

    bn = Battalion(name="Test Bn", code="TST-BN")
    db.add(bn)
    db.commit()

    coll = College(battalion_id=bn.id, name="Test College", academic_year_start=2026)
    db.add(coll)
    db.commit()

    cadet = Cadet(
        user_id=cadet_u.id,
        college_id=coll.id,
        enrollment_number="TST24SW001",
        full_name="Radha Patel",
        mobile="9898989898",
        academic_year=1,
        gender=GenderEnum.female,
        wing=WingEnum.SW,
    )
    db.add(cadet)
    db.commit()
    db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def admin_headers():
    db = TestingSessionLocal()
    u = db.query(User).filter(User.email == "admin_ops@test.local").first()
    t = create_access_token({"sub": str(u.id), "role": u.role.value})
    db.close()
    return {"Authorization": f"Bearer {t}"}

@pytest.fixture
def cadet_headers():
    db = TestingSessionLocal()
    u = db.query(User).filter(User.email == "cadet_ops@test.local").first()
    t = create_access_token({"sub": str(u.id), "role": u.role.value})
    db.close()
    return {"Authorization": f"Bearer {t}"}

def test_bulk_attendance_and_cadet_stats(admin_headers, cadet_headers):
    client = TestClient(app)
    db = TestingSessionLocal()
    cadet = db.query(Cadet).filter(Cadet.enrollment_number == "TST24SW001").first()
    cadet_id = cadet.id
    db.close()

    # 1. Bulk Save Roll Call (Admin/Mentor)
    bulk_payload = {
        "date": "2026-09-24",
        "parade_type": "Ceremonial Foot Drill",
        "records": [
            {"cadet_id": cadet_id, "status": "PRESENT"}
        ]
    }
    save_res = client.post("/api/v1/ops/attendance/bulk", json=bulk_payload, headers=admin_headers)
    assert save_res.status_code == 200
    assert save_res.json()["count"] == 1

    # 2. List Attendance
    list_res = client.get("/api/v1/ops/attendance?date=2026-09-24", headers=admin_headers)
    assert list_res.status_code == 200
    records = list_res.json()
    assert len(records) >= 1
    assert records[0]["cadet_name"] == "Radha Patel"
    assert records[0]["status"] == "PRESENT"

    # 3. Cadet Checks Personal Attendance Stats
    stats_res = client.get("/api/v1/ops/attendance/cadet/me", headers=cadet_headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_parades"] >= 1
    assert stats["attendance_rate"] == 100.0
    assert stats["is_exam_qualified"] is True

def test_training_tasks_crud(admin_headers, cadet_headers):
    client = TestClient(app)

    # 1. Create Training Task
    new_task = {
        "title": "Combined Annual Training Camp (CATC)",
        "category": "CAMP",
        "target": "All Cadets",
        "date": "Nov 10, 2026",
        "time": "08:00 AM",
        "location": "Battalion Training Area",
        "priority": "MANDATORY",
        "status": "SCHEDULED",
        "desc": "Official 10-day training camp.",
    }
    create_res = client.post("/api/v1/ops/tasks", json=new_task, headers=admin_headers)
    assert create_res.status_code == 201
    created = create_res.json()
    task_id = created["id"]
    assert created["title"] == new_task["title"]

    # 2. List Tasks
    list_res = client.get("/api/v1/ops/tasks?category=CAMP", headers=cadet_headers)
    assert list_res.status_code == 200
    tasks = list_res.json()
    assert any(t["id"] == task_id for t in tasks)

    # 3. Update Task
    update_res = client.put(f"/api/v1/ops/tasks/{task_id}", json={"status": "CONFIRMED"}, headers=admin_headers)
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "CONFIRMED"

    # 4. Delete Task
    del_res = client.delete(f"/api/v1/ops/tasks/{task_id}", headers=admin_headers)
    assert del_res.status_code == 200
