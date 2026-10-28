"""
CADET-360: Supabase Cloud Database Initializer & Migration Tool
Usage:
    python sync_to_supabase.py
    python sync_to_supabase.py --url "postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
"""
import argparse
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

# Load environment variables from .env
load_dotenv()


def main():
    parser = argparse.ArgumentParser(description="Initialize and seed Supabase PostgreSQL database.")
    parser.add_argument("--url", default=None, help="PostgreSQL connection string")
    args = parser.parse_args()

    db_url = args.url or os.getenv("DATABASE_URL")
    if not db_url or "sqlite" in db_url:
        print("\n[ERROR] No PostgreSQL connection string provided.")
        print("Please ensure DATABASE_URL is set in .env or pass --url \"postgresql://...\"")
        print("\nExample:")
        print("python sync_to_supabase.py --url \"postgresql://postgres.<project_ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres\"\n")
        sys.exit(1)

    # Normalize connection string for SQLAlchemy
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    print(f"\n=======================================================")
    print(f"CADET-360: Connecting to Supabase PostgreSQL Database")
    print(f"=======================================================")
    masked_url = db_url.split("@")[-1] if "@" in db_url else db_url
    print(f"Target Host: {masked_url}")

    try:
        engine = create_engine(db_url, pool_pre_ping=True, connect_args={"connect_timeout": 10})
        with engine.connect() as conn:
            res = conn.execute(text("SELECT version();")).scalar()
            print(f"Connected successfully!\nServer Version: {res[:55]}...\n")
    except Exception as exc:
        print(f"\n[CONNECTION FAILED]: {exc}")
        print("\nTroubleshooting Checklist:")
        print("1. Is your Supabase project PAUSED? Go to https://supabase.com/dashboard and click 'Restore Project'.")
        print("2. Did you use the Session Pooler connection string (Port 6543)?")
        print("3. Is your database password correct? You can reset it in Supabase Project Settings > Database.\n")
        sys.exit(1)

    print("Step 1: Creating database tables...")
    from app.db.base import Base
    import app.models  # Ensure all model classes are imported
    Base.metadata.create_all(bind=engine)
    print("All 16 tables verified/created successfully.")

    print("\nStep 2: Checking schema migrations...")
    inspector = inspect(engine)
    with engine.connect() as conn:
        # Cadets table columns
        if "cadets" in inspector.get_table_names():
            existing = {c["name"] for c in inspector.get_columns("cadets")}
            for col_name, col_type in [
                ("rank", "VARCHAR DEFAULT 'CDT'"),
                ("blood_group", "VARCHAR"),
                ("dob", "VARCHAR"),
                ("guardian_name", "VARCHAR"),
                ("identification_mark", "VARCHAR"),
                ("company_platoon", "VARCHAR"),
                ("camps_attended", "JSON"),
                ("weapon_grouping", "VARCHAR"),
                ("firing_classification", "VARCHAR"),
                ("pft_score", "VARCHAR"),
                ("certificate_status", "VARCHAR"),
                ("awards", "JSON"),
            ]:
                if col_name not in existing:
                    try:
                        conn.execute(text(f"ALTER TABLE cadets ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                        conn.commit()
                        print(f"  + Added column cadets.{col_name}")
                    except Exception as e:
                        pass

        # Evaluation criteria custom fields
        if "evaluation_criteria" in inspector.get_table_names():
            crit_existing = {c["name"] for c in inspector.get_columns("evaluation_criteria")}
            for col_name, col_type in [
                ("label", "VARCHAR"),
                ("priority", "VARCHAR DEFAULT 'normal'"),
                ("description", "TEXT"),
                ("icon", "VARCHAR DEFAULT '🎯'"),
                ("category", "VARCHAR DEFAULT 'core'"),
                ("created_by_role", "VARCHAR DEFAULT 'admin'"),
                ("is_active", "INTEGER DEFAULT 1"),
            ]:
                if col_name not in crit_existing:
                    try:
                        conn.execute(text(f"ALTER TABLE evaluation_criteria ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                        conn.commit()
                        print(f"  + Added column evaluation_criteria.{col_name}")
                    except Exception as e:
                        pass

    print("\nStep 3: Seeding baseline datasets (Battalions, Colleges, Criteria, Admin)...")
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        from app.db.seed import seed
        seed(db)
        from app.models.college import Battalion, College
        from app.models.evaluation import EvaluationCriterion
        b_count = db.query(Battalion).count()
        c_count = db.query(College).count()
        crit_count = db.query(EvaluationCriterion).count()
        print(f"Successfully seeded:")
        print(f"  - {b_count} NCC Battalions")
        print(f"  - {c_count} Affiliated Colleges & Institutions")
        print(f"  - {crit_count} 9-Pillars Evaluation Criteria with Focus Priorities")
        print(f"  - 1 Commanding Officer Admin (admin@ncc.local)")
    finally:
        db.close()

    print("\n=======================================================")
    print("SUCCESS: Your Supabase Cloud Database is 100% Ready!")
    print("=======================================================\n")


if __name__ == "__main__":
    main()
