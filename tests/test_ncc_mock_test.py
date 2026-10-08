from datetime import datetime, timedelta
import io
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
from app.models.ncc_mock_test import (
    CertificateLevelEnum,
    NCCQuestion,
    NCCTestAnswer,
    NCCTestModeEnum,
    NCCTestSession,
    NCCTestStatusEnum,
)
from app.services.ncc_seed_data import seed_ncc_topics_and_questions

# Isolated in-memory SQLite database
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
def setup_ncc_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Create cadet user
    cadet = User(
        email="cadet_ncc@test.local",
        hashed_password=hash_password("cadetpass123"),
        role=RoleEnum.cadet,
        is_active=True,
        is_verified=True,
    )
    # Create admin user
    admin = User(
        email="admin_ncc@test.local",
        hashed_password=hash_password("adminpass123"),
        role=RoleEnum.admin,
        is_active=True,
        is_verified=True,
    )
    db.add_all([cadet, admin])
    db.commit()

    # Seed syllabus topics and questions
    seed_ncc_topics_and_questions(db)
    db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def cadet_auth_headers():
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "cadet_ncc@test.local").first()
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    db.close()
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers():
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "admin_ncc@test.local").first()
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    db.close()
    return {"Authorization": f"Bearer {token}"}


def test_get_syllabus_topics(cadet_auth_headers):
    client = TestClient(app)
    res = client.get("/api/v1/ncc-mock-tests/topics", headers=cadet_auth_headers)
    assert res.status_code == 200
    topics = res.json()
    assert len(topics) >= 15
    codes = [t["code"] for t in topics]
    assert "drill_commands" in codes
    assert "weapon_training" in codes
    assert "map_reading" in codes


def test_start_session_zero_leakage(cadet_auth_headers):
    """Verify that start session returns questions without correct_option or explanation."""
    client = TestClient(app)
    payload = {
        "mode": "quick_practice",
        "certificate_level": "B",
    }
    res = client.post("/api/v1/ncc-mock-tests/sessions", json=payload, headers=cadet_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["mode"] == "quick_practice"
    assert data["remaining_seconds"] > 1150
    assert len(data["questions"]) > 0

    first_q = data["questions"][0]
    # Ensure 4 options are present
    assert len(first_q["options"]) == 4
    # Security check: MUST NOT leak correct_option or explanation to client pre-submission
    assert "correct_option" not in first_q
    assert "explanation" not in first_q


def test_progressive_save_answer_and_review(cadet_auth_headers):
    client = TestClient(app)
    # Start session
    start_res = client.post("/api/v1/ncc-mock-tests/sessions", json={"mode": "quick_practice"}, headers=cadet_auth_headers)
    session_id = start_res.json()["id"]
    question_id = start_res.json()["questions"][0]["id"]

    # Save option 2 and mark for review
    save_payload = {
        "question_id": question_id,
        "selected_option": 2,
        "is_marked_for_review": True,
        "time_spent_seconds": 15,
    }
    res = client.put(f"/api/v1/ncc-mock-tests/sessions/{session_id}/answer", json=save_payload, headers=cadet_auth_headers)
    assert res.status_code == 200
    assert res.json()["success"] is True

    # Retrieve session to ensure answer persisted
    get_res = client.get(f"/api/v1/ncc-mock-tests/sessions/{session_id}", headers=cadet_auth_headers)
    saved = get_res.json()["saved_answers"][str(question_id)]
    assert saved["selected_option"] == 2
    assert saved["is_marked_for_review"] is True


def test_submit_and_scoring_calculation(cadet_auth_headers):
    client = TestClient(app)
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "cadet_ncc@test.local").first()

    # Start a quick practice session
    start_res = client.post("/api/v1/ncc-mock-tests/sessions", json={"mode": "quick_practice"}, headers=cadet_auth_headers)
    session_id = start_res.json()["id"]
    questions = start_res.json()["questions"]

    # In database, check the first question and deliberately pick the correct option
    q1 = db.query(NCCQuestion).filter(NCCQuestion.id == questions[0]["id"]).first()
    session = db.query(NCCTestSession).filter(NCCTestSession.id == session_id).first()
    perm = session.option_orders[str(q1.id)]
    shuffled_correct_idx = perm.index(q1.correct_option)

    # Answer Q1 correctly
    client.put(
        f"/api/v1/ncc-mock-tests/sessions/{session_id}/answer",
        json={"question_id": q1.id, "selected_option": shuffled_correct_idx, "time_spent_seconds": 20},
        headers=cadet_auth_headers,
    )

    # Answer Q2 incorrectly
    q2 = db.query(NCCQuestion).filter(NCCQuestion.id == questions[1]["id"]).first()
    wrong_actual_idx = (q2.correct_option + 1) % 4
    perm2 = session.option_orders[str(q2.id)]
    shuffled_wrong_idx = perm2.index(wrong_actual_idx)

    client.put(
        f"/api/v1/ncc-mock-tests/sessions/{session_id}/answer",
        json={"question_id": q2.id, "selected_option": shuffled_wrong_idx, "time_spent_seconds": 25},
        headers=cadet_auth_headers,
    )

    # Submit test
    sub_res = client.post(f"/api/v1/ncc-mock-tests/sessions/{session_id}/submit", headers=cadet_auth_headers)
    assert sub_res.status_code == 200
    res_data = sub_res.json()

    assert res_data["total_correct"] == 1
    assert res_data["total_wrong"] == 1
    # Score calculation: 1.0 (correct) - 0.25 (wrong) = 0.75
    assert res_data["total_score"] == 0.75
    # Accuracy: 1 / (1 + 1) = 50%
    assert res_data["accuracy_percentage"] == 50.0

    # Ensure explanations and correct keys are now revealed in results
    assert len(res_data["questions_review"]) > 0
    assert "explanation" in res_data["questions_review"][0]
    db.close()


def test_timer_expiry_locking(cadet_auth_headers):
    """Verify that answers submitted past end_time are rejected with 403."""
    client = TestClient(app)
    db = TestingSessionLocal()

    # Create an expired session directly in DB
    now = datetime.utcnow()
    expired_sess = NCCTestSession(
        user_id=1,
        mode=NCCTestModeEnum.quick_practice,
        title="Expired Test",
        question_ids=[1, 2],
        option_orders={"1": [0, 1, 2, 3], "2": [0, 1, 2, 3]},
        start_time=now - timedelta(hours=2),
        end_time=now - timedelta(hours=1),  # Expired 1 hour ago
        duration_seconds=3600,
        status=NCCTestStatusEnum.in_progress,
    )
    db.add(expired_sess)
    db.commit()
    db.refresh(expired_sess)

    # Attempt to submit an answer to the expired session
    res = client.put(
        f"/api/v1/ncc-mock-tests/sessions/{expired_sess.id}/answer",
        json={"question_id": 1, "selected_option": 0},
        headers=cadet_auth_headers,
    )
    assert res.status_code == 403
    assert "expired" in res.json()["detail"].lower()
    db.close()


def test_cadet_analytics_dossier(cadet_auth_headers):
    client = TestClient(app)
    res = client.get("/api/v1/ncc-mock-tests/analytics/cadet/me", headers=cadet_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "tests_completed" in data
    assert "radar_data" in data


def test_item_analysis_psychometrics(admin_auth_headers):
    client = TestClient(app)
    res = client.get("/api/v1/ncc-mock-tests/analytics/item-analysis", headers=admin_auth_headers)
    assert res.status_code == 200
    stats = res.json()
    assert len(stats) > 0
    first_stat = stats[0]
    assert "difficulty_index_p" in first_stat
    assert "discrimination_index_d" in first_stat
    assert "distractor_counts" in first_stat
    assert "flag_status" in first_stat


def test_csv_import_validation(admin_auth_headers):
    client = TestClient(app)
    valid_csv = """statement,option_a,option_b,option_c,option_d,correct_option,explanation,topic_code
What is the length of pace in Tez Chal?,24 inches,30 inches,33 inches,40 inches,B,Regulation length is 30 inches.,drill_commands
What is the calibre of .22 Deluxe Rifle?,.22 mm,.22 inches,7.62 mm,5.56 mm,B,Calibre is .22 inches.,weapon_training
"""
    files = {"file": ("questions.csv", io.BytesIO(valid_csv.encode("utf-8")), "text/csv")}
    res = client.post("/api/v1/ncc-mock-tests/questions/import-csv", files=files, headers=admin_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["imported_count"] == 2
    assert data["skipped_count"] == 0


def test_csv_import_rejects_duplicate_options(admin_auth_headers):
    client = TestClient(app)
    invalid_csv = """statement,option_a,option_b,option_c,option_d,correct_option,explanation,topic_code
Sample with duplicates,Same,Same,Different,Another,A,Invalid due to duplicates,drill_commands
"""
    files = {"file": ("invalid.csv", io.BytesIO(invalid_csv.encode("utf-8")), "text/csv")}
    res = client.post("/api/v1/ncc-mock-tests/questions/import-csv", files=files, headers=admin_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["imported_count"] == 0
    assert data["skipped_count"] == 1
    assert "duplicate" in data["errors"][0]["errors"][0].lower()


def test_admin_config_customization(admin_auth_headers, cadet_auth_headers):
    client = TestClient(app)
    # 1. Any user can view test config
    get_res = client.get("/api/v1/ncc-mock-tests/config")
    assert get_res.status_code == 200
    cfg = get_res.json()
    assert "full_mock_duration_minutes" in cfg
    assert "marks_per_correct" in cfg

    # 2. Cadet cannot edit test config (403 Forbidden)
    forbidden_res = client.put(
        "/api/v1/ncc-mock-tests/admin/config",
        json={"marks_per_correct": 2.0},
        headers=cadet_auth_headers,
    )
    assert forbidden_res.status_code == 403

    # 3. Admin can customize all config parameters
    custom_cfg = {
        "full_mock_duration_minutes": 105,
        "full_mock_question_count": 80,
        "marks_per_correct": 2.0,
        "marks_per_wrong": -0.5,
        "pass_percentage": 55.0,
        "shuffle_options": False,
    }
    update_res = client.put(
        "/api/v1/ncc-mock-tests/admin/config",
        json=custom_cfg,
        headers=admin_auth_headers,
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["full_mock_duration_minutes"] == 105
    assert updated["full_mock_question_count"] == 80
    assert updated["marks_per_correct"] == 2.0
    assert updated["marks_per_wrong"] == -0.5
    assert updated["pass_percentage"] == 55.0
    assert updated["shuffle_options"] is False


def test_admin_questions_crud(admin_auth_headers, cadet_auth_headers):
    client = TestClient(app)
    # 1. List questions
    list_res = client.get("/api/v1/ncc-mock-tests/admin/questions?limit=10", headers=admin_auth_headers)
    assert list_res.status_code == 200
    data = list_res.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] > 0

    # 2. Cadet forbidden from admin questions endpoint
    assert client.get("/api/v1/ncc-mock-tests/admin/questions", headers=cadet_auth_headers).status_code == 403

    # 3. Create question
    new_q = {
        "statement": "What is the motto of the National Cadet Corps (Admin Test)?",
        "options": ["Unity and Discipline", "Service Before Self", "Duty, Honour, Country", "Valour and Wisdom"],
        "correct_option": 0,
        "explanation": "The motto of NCC is Unity and Discipline (Ekta aur Anushasan).",
        "topic_code": "ncc_organisation_history",
        "difficulty": "easy",
        "certificate_level": "common",
        "wing": "common",
    }
    create_res = client.post("/api/v1/ncc-mock-tests/admin/questions", json=new_q, headers=admin_auth_headers)
    assert create_res.status_code == 200
    created = create_res.json()
    q_id = created["id"]
    assert created["statement"] == new_q["statement"]
    assert created["correct_option"] == 0

    # 4. Update question
    update_payload = {
        "statement": "What is the official motto of NCC? (Updated)",
        "explanation": "Updated explanation reference.",
    }
    update_res = client.put(f"/api/v1/ncc-mock-tests/admin/questions/{q_id}", json=update_payload, headers=admin_auth_headers)
    assert update_res.status_code == 200
    assert update_res.json()["statement"] == "What is the official motto of NCC? (Updated)"

    # 5. Delete question
    del_res = client.delete(f"/api/v1/ncc-mock-tests/admin/questions/{q_id}", headers=admin_auth_headers)
    assert del_res.status_code == 200


def test_admin_topics_crud(admin_auth_headers, cadet_auth_headers):
    client = TestClient(app)
    # 1. Create topic
    new_topic = {
        "code": "drone_ops",
        "name": "Drone Operations & Aerial Surveillance",
        "default_weightage": 6.5,
        "is_active": True,
    }
    res = client.post("/api/v1/ncc-mock-tests/admin/topics", json=new_topic, headers=admin_auth_headers)
    assert res.status_code == 200
    assert res.json()["code"] == "drone_ops"

    # 2. Update topic weightage
    res = client.put(
        "/api/v1/ncc-mock-tests/admin/topics/drone_ops",
        json={"default_weightage": 8.0, "is_active": False},
        headers=admin_auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["default_weightage"] == 8.0
    assert res.json()["is_active"] is False

    # 3. Delete topic
    res = client.delete("/api/v1/ncc-mock-tests/admin/topics/drone_ops", headers=admin_auth_headers)
    assert res.status_code == 200


def test_admin_sessions_audit_and_reset(admin_auth_headers):
    client = TestClient(app)
    # List sessions
    res = client.get("/api/v1/ncc-mock-tests/admin/sessions", headers=admin_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
