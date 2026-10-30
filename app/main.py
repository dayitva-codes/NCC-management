from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import engine, ensure_db_ready

logger = logging.getLogger("ncc.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI Lifespan Context Manager:
    Initializes database schema, auto-migrations, and baseline seeds on application startup.
    """
    try:
        ensure_db_ready()
    except Exception as e:
        logger.warning(f"Startup DB readiness note: {e}")
    yield


app = FastAPI(
    title="CADET-360: National Cadet Corps Command Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Robust, Standards-Compliant CORS Configuration
raw_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
allowed_origins = [o for o in raw_origins if o != "*"]
if not allowed_origins:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$|^https://.*\.vercel\.app$|^https://.*\.onrender\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """
    Active health check probe: verifies API liveness and database connectivity.
    """
    db_status = "connected"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"degraded: {str(e)[:60]}"

    return {
        "status": "ok" if "degraded" not in db_status else "degraded",
        "database": db_status,
        "engine": "postgresql" if "postgresql" in str(engine.url) else "sqlite",
    }


# Mount routers for both /api/v1 and /v1 paths for flexible serverless rewrites
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router, prefix="/v1")
