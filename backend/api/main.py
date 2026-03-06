"""
api/main.py
───────────
FastAPI application entry point.
"""

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import data, metadata, system
from core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="SPP V2 API",
    description="EAV data serving API for the Subnational Politics Project.",
    version="0.2.0",
)

# CORS Configuration
# We specify origins explicitly to be more robust than '*' for some browsers.
origins = [
    "http://localhost:5173",
    "https://sppv2-puce.vercel.app",
    "https://sppv2.vercel.app",
    "https://sppv2-eeghvcm71-fsotojs-projects.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def dbg_middleware(request, call_next):
    """Logs incoming requests for CORS debugging."""
    origin = request.headers.get("origin")
    method = request.method
    path = request.url.path
    logger.info(f"REQ: {method} {path} | Origin: {origin}")
    response = await call_next(request)
    return response

@app.get("/api/v1/version")
def get_version():
    return {"version": "0.2.1-cors-debug", "status": "active"}

# ── Include Routers ────────────────────────────────────────────────────────
app.include_router(system.router, tags=["System"])
app.include_router(metadata.router, prefix="/api/v1/metadata", tags=["Metadata"])
app.include_router(data.router, prefix="/api/v1/data", tags=["Data"])

@app.on_event("startup")
def on_startup() -> None:
    logger.info("Starting SPP V2 API...")
    if settings.is_sqlite:
        logger.info("Using SQLite database for local dev.")
    else:
        logger.info("Using remote database.")
