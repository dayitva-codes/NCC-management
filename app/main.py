from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.seed import seed
from app.db.session import SessionLocal, engine

import app.models

app = FastAPI(title="NCC Battalion Management System", version="1.0.0")

# Setup CORS origins
raw_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
if "*" in raw_origins or not raw_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=raw_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.on_event("startup")
def on_startup():
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            seed(db)
        finally:
            db.close()
    except Exception as e:
        print(f"Startup DB init warning: {e}")


@app.get("/health")
def health():
    return {"status": "ok"}


# Mount routers for both /api/v1 and /v1 paths for flexible serverless rewrites
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router, prefix="/v1")
