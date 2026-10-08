import os
import sys

# Ensure root directory is on Python path for Vercel Serverless
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from app.main import app  # noqa: E402
from app.db.session import ensure_db_ready  # noqa: E402

try:
    ensure_db_ready()
except Exception as _exc:
    print(f"[Vercel Cold Start] DB readiness note: {_exc}")
