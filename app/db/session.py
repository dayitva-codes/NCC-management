import logging
import os
import shutil
import tempfile
import threading
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

logger = logging.getLogger("ncc.db")

# Normalize Postgres connection string if using Supabase / Heroku format
db_url = settings.database_url or "sqlite:///./ncc.db"
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)


def is_serverless_env() -> bool:
    """Detect if running under Vercel, AWS Lambda, or a serverless container."""
    return bool(
        os.environ.get("VERCEL")
        or os.environ.get("AWS_LAMBDA_FUNCTION_NAME")
        or os.environ.get("NOW_REGION")
    )


def is_path_writable(path: str) -> bool:
    """Check if the given directory path is writable."""
    try:
        test_file = os.path.join(path, f".write_test_{os.getpid()}")
        with open(test_file, "w") as f:
            f.write("1")
        os.remove(test_file)
        return True
    except Exception:
        return False


def resolve_sqlite_url(requested_url: str = "sqlite:///./ncc.db") -> str:
    """
    Resolve SQLite database URL safely.
    In serverless environments (e.g. Vercel), current working directory is read-only.
    Redirect to /tmp/ncc.db (the only writable directory in serverless) and copy existing
    seed db if present.
    """
    if "/tmp/" in requested_url or ":memory:" in requested_url:
        return requested_url

    if is_serverless_env() or not is_path_writable(os.getcwd()):
        tmp_dir = tempfile.gettempdir()
        tmp_db = os.path.join(tmp_dir, "ncc.db")

        # Copy existing bundled ncc.db if present so we keep pre-existing seed data
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        local_db = os.path.join(root_dir, "ncc.db")
        if os.path.exists(local_db) and not os.path.exists(tmp_db):
            try:
                shutil.copyfile(local_db, tmp_db)
            except Exception as e:
                logger.warning(f"Could not copy bundled ncc.db to tmp: {e}")

        clean_path = tmp_db.replace("\\", "/")
        if not clean_path.startswith("/") and not (len(clean_path) > 1 and clean_path[1] == ":"):
            clean_path = "/" + clean_path
        logger.info(f"Using serverless writable SQLite path: sqlite:///{clean_path}")
        return f"sqlite:///{clean_path}"

    return requested_url


def init_engine(url: str):
    """
    Initializes a resilient SQLAlchemy engine.
    - If PostgreSQL is requested, tests connectivity with a fast timeout (3s).
    - Uses NullPool in serverless environments to prevent exhausting connection limits.
    - If remote PostgreSQL is unreachable or tenant is not found, automatically falls back
      to safe writable SQLite so the application never hangs or crashes with 500.
    """
    if "postgresql" in url:
        try:
            connect_args = {"connect_timeout": 3}
            pool_kwargs = {}
            if is_serverless_env():
                from sqlalchemy.pool import NullPool
                pool_kwargs["poolclass"] = NullPool
            else:
                pool_kwargs["pool_size"] = 10
                pool_kwargs["max_overflow"] = 20

            test_engine = create_engine(
                url,
                connect_args=connect_args,
                pool_pre_ping=True,
                **pool_kwargs,
            )
            # Fast verification ping
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Successfully connected to PostgreSQL database.")
            return test_engine
        except Exception as exc:
            print(f"\n[DATABASE WARNING] Could not reach remote PostgreSQL database: {exc}")
            print("[DATABASE NOTICE] Activating safe writable SQLite engine to keep operations instant & uninterrupted.\n")
            url = resolve_sqlite_url("sqlite:///./ncc.db")
    else:
        url = resolve_sqlite_url(url)

    # SQLite configuration with thread sharing
    connect_args = {"check_same_thread": False, "timeout": 30}
    sqlite_engine = create_engine(url, connect_args=connect_args, pool_pre_ping=True)

    @event.listens_for(sqlite_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        try:
            cursor = dbapi_connection.cursor()
            try:
                cursor.execute("PRAGMA journal_mode=WAL;")
            except Exception:
                cursor.execute("PRAGMA journal_mode=DELETE;")
            cursor.execute("PRAGMA synchronous=NORMAL;")
            cursor.execute("PRAGMA busy_timeout=5000;")
            cursor.close()
        except Exception:
            pass

    return sqlite_engine


engine = init_engine(db_url)

# SessionLocal is the factory for creating database sessions per API request
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

_db_initialized = False
_db_init_lock = threading.Lock()


def ensure_db_ready():
    """
    Guarantees that database tables exist, missing schema columns are migrated,
    and baseline seed data is populated.
    Called on cold-start import, on get_db dependency, and on app startup.
    Thread-safe and idempotent.
    """
    global _db_initialized
    if _db_initialized:
        return
    with _db_init_lock:
        if _db_initialized:
            return
        try:
            from app.db.base import Base
            import app.models  # noqa: F401
            Base.metadata.create_all(bind=engine)

            # Idempotent Column Auto-Migration for Cadets Dossier
            try:
                from sqlalchemy import inspect
                inspector = inspect(engine)
                if "cadets" in inspector.get_table_names():
                    existing_cols = {col["name"] for col in inspector.get_columns("cadets")}
                    is_pg = "postgresql" in str(engine.url)
                    new_columns = [
                        ("rank", "VARCHAR DEFAULT 'CDT'"),
                        ("blood_group", "VARCHAR"),
                        ("dob", "VARCHAR"),
                        ("guardian_name", "VARCHAR"),
                        ("identification_mark", "VARCHAR"),
                        ("company_platoon", "VARCHAR"),
                        ("camps_attended", "JSON" if is_pg else "TEXT"),
                        ("weapon_grouping", "VARCHAR"),
                        ("firing_classification", "VARCHAR"),
                        ("pft_score", "VARCHAR"),
                        ("certificate_status", "VARCHAR"),
                        ("awards", "JSON" if is_pg else "TEXT"),
                    ]
                    with engine.connect() as conn:
                        for col_name, col_type in new_columns:
                            if col_name not in existing_cols:
                                try:
                                    conn.execute(text(f"ALTER TABLE cadets ADD COLUMN {col_name} {col_type}"))
                                    conn.commit()
                                except Exception as alter_err:
                                    logger.debug(f"Column {col_name} migration note: {alter_err}")

                # Auto-Migration for 9-Pillar Evaluation Criteria Custom Parameters & Priorities
                if "evaluation_criteria" in inspector.get_table_names():
                    crit_cols = {col["name"] for col in inspector.get_columns("evaluation_criteria")}
                    new_crit_columns = [
                        ("label", "VARCHAR"),
                        ("priority", "VARCHAR DEFAULT 'normal'"),
                        ("description", "TEXT"),
                        ("icon", "VARCHAR DEFAULT '🎯'"),
                        ("category", "VARCHAR DEFAULT 'core'"),
                        ("created_by_role", "VARCHAR DEFAULT 'admin'"),
                        ("is_active", "INTEGER DEFAULT 1"),
                    ]
                    with engine.connect() as conn:
                        for col_name, col_type in new_crit_columns:
                            if col_name not in crit_cols:
                                try:
                                    conn.execute(text(f"ALTER TABLE evaluation_criteria ADD COLUMN {col_name} {col_type}"))
                                    conn.commit()
                                except Exception as alter_err:
                                    logger.debug(f"EvaluationCriterion column {col_name} migration note: {alter_err}")
            except Exception as mig_err:
                logger.warning(f"Schema migration warning: {mig_err}")

            from app.db.seed import seed
            db = SessionLocal()
            try:
                seed(db)
            finally:
                db.close()
            _db_initialized = True
            logger.info("Database schema and seed readiness confirmed.")
        except Exception as e:
            logger.error(f"Error ensuring DB readiness: {e}")


