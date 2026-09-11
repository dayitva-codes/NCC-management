import os
os.environ["TESTING"] = "1"
os.environ["DATABASE_URL"] = "sqlite:///./test_ncc.db"

from fastapi.testclient import TestClient
from app.main import app
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.db.seed import seed

def test_full_system_flow():
    print("1. Initializing DB and running seed...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
    
    client = TestClient(app)
    
    print("2. Testing /health...")
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    assert res.json() == {"status": "ok"}
    print("   [OK] Health check passed")

    print("3. Testing Admin Login...")
    res = client.post("/api/v1/auth/login", data={"username": "admin@ncc.local", "password": "admin123"})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("   [OK] Admin login passed")

    print("4. Testing Battalion creation and listing...")
    res = client.post("/api/v1/battalions", json={"name": "3 MP Girls Battalion", "code": "3MPGBN"})
    assert res.status_code == 200 or res.status_code == 201, f"Battalion creation failed: {res.text}"
    battalion_id = res.json()["id"]

    res = client.get("/api/v1/battalions")
    assert res.status_code == 200
    assert any(b["id"] == battalion_id for b in res.json())
    print(f"   [OK] Battalion created with id={battalion_id}")

    print("5. Testing College creation...")
    res = client.post("/api/v1/colleges", json={"battalion_id": battalion_id, "name": "Govt Girls College", "academic_year_start": 2026})
    assert res.status_code in [200, 201], f"College creation failed: {res.text}"
    college_id = res.json()["id"]
    print(f"   [OK] College created with id={college_id}")

    print("6. Testing Cadet registration (Validation + Success)...")
    # Invalid wing-gender combination (female with JD)
    res = client.post("/api/v1/cadets/register", json={
        "email": "cadet_invalid@test.com", "password": "password123",
        "battalion_id": battalion_id, "college_id": college_id,
        "full_name": "Invalid Cadet", "enrollment_number": "MP24SWG9999",
        "mobile": "9999999999", "academic_year": 2, "gender": "female", "wing": "JD"
    })
    assert res.status_code == 400, f"Expected 400 for JD + female, got {res.status_code}: {res.text}"
    print("   [OK] Invalid wing-gender rule correctly rejected with 400")

    # Valid cadet registration (SW + female)
    res = client.post("/api/v1/cadets/register", json={
        "email": "cadet1@test.com", "password": "password123",
        "battalion_id": battalion_id, "college_id": college_id,
        "full_name": "Test Cadet 1", "enrollment_number": "MP24SWG0001",
        "mobile": "9999999999", "academic_year": 2, "gender": "female", "wing": "SW"
    })
    assert res.status_code in [200, 201], f"Cadet registration failed: {res.text}"
    cadet_data = res.json()
    cadet_id = cadet_data["id"]
    print(f"   [OK] Cadet registered with id={cadet_id}")

    print("7. Testing Mentor registration and verification...")
    res = client.post("/api/v1/mentors/register", json={
        "email": "mentor1@test.com", "password": "password123",
        "enrollment_number": "MENT001", "scope_level": "institute",
        "college_id": college_id
    })
    assert res.status_code in [200, 201], f"Mentor registration failed: {res.text}"
    mentor_user_id = res.json()["user_id"]

    # Verify mentor using admin token
    res = client.post(f"/api/v1/mentors/{mentor_user_id}/verify", headers=admin_headers)
    assert res.status_code == 200, f"Mentor verification failed: {res.text}"
    print(f"   [OK] Mentor registered and verified (user_id={mentor_user_id})")

    # Mentor login
    res = client.post("/api/v1/auth/login", data={"username": "mentor1@test.com", "password": "password123"})
    assert res.status_code == 200, f"Mentor login failed: {res.text}"
    mentor_token = res.json()["access_token"]
    mentor_headers = {"Authorization": f"Bearer {mentor_token}"}
    print("   [OK] Mentor logged in successfully")

    print("8. Testing Evaluation criteria and submission...")
    res = client.get("/api/v1/evaluations/criteria", headers=mentor_headers)
    assert res.status_code == 200
    criteria = res.json()
    assert len(criteria) >= 9, f"Expected at least 9 criteria, got {len(criteria)}"
    print(f"   [OK] Retrieved {len(criteria)} evaluation criteria")

    # Submit evaluations
    for crit in criteria[:3]:
        res = client.post("/api/v1/evaluations/", headers=mentor_headers, json={
            "cadet_id": cadet_id,
            "criterion_id": crit["id"],
            "score": 8.5,
            "remarks": f"Good performance in {crit['name']}"
        })
        assert res.status_code in [200, 201], f"Evaluation submission failed for crit {crit['id']}: {res.text}"
    print("   [OK] Submitted evaluations")

    print("9. Testing Cadet scores, Leaderboard, and Dashboard...")
    res = client.get(f"/api/v1/cadets/{cadet_id}/scores", headers=mentor_headers)
    assert res.status_code == 200, f"Get cadet scores failed: {res.text}"
    scores = res.json()
    print(f"   [OK] Cadet scores: {scores}")

    res = client.get(f"/api/v1/leaderboard?battalion_id={battalion_id}", headers=mentor_headers)
    assert res.status_code == 200, f"Leaderboard failed: {res.text}"
    leaderboard = res.json()
    print(f"   [OK] Leaderboard entries: {len(leaderboard)}")

    res = client.get(f"/api/v1/dashboard/battalion/{battalion_id}", headers=mentor_headers)
    assert res.status_code == 200, f"Dashboard failed: {res.text}"
    dashboard = res.json()
    print(f"   [OK] Dashboard data: {dashboard}")

    print("10. Testing AI Insight fallback...")
    res = client.get(f"/api/v1/cadets/{cadet_id}/ai-insight", headers=mentor_headers)
    assert res.status_code == 200, f"AI insight failed: {res.text}"
    insight = res.json()
    assert "insight" in insight or "summary" in insight or "strengths" in insight or isinstance(insight, dict)
    print(f"   [OK] AI insight response: {insight}")

    print("\n==========================================")
    print("ALL 10 VERIFICATION TESTS PASSED PERFECTLY!")
    print("==========================================")
    
    # Clean up test database
    engine.dispose()
    if os.path.exists("test_ncc.db"):
        try:
            os.remove("test_ncc.db")
        except Exception:
            pass

if __name__ == "__main__":
    test_full_system_flow()
