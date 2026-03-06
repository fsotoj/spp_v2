"""
api/routers/system.py
─────────────────────
System utility endpoints (health checks).
"""

from typing import Any

from fastapi import APIRouter

router = APIRouter()

@router.get("/health", response_model=dict[str, Any])
def health_check() -> dict[str, Any]:
    """Simple health check endpoint."""
    return {"status": "ok", "message": "SPP V2 API is running"}
