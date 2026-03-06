"""
api/main.py
───────────
FastAPI application entry point.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routers import data, metadata, system
from backend.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="SPP V2 API",
    description="EAV data serving API for the Subnational Politics Project.",
    version="0.2.0",
)

# CORS configuration — allow frontend to query the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to the shiny app domain
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
