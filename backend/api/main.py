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

# Get the environment (default to 'development' if not set)
ENV = os.getenv("RAILWAY_ENVIRONMENT_NAME", "development")

# If we are in a production-like environment, we can be more specific
# If not, we allow everything for easier testing
if ENV == "production":
    origins = [
        "http://localhost:5173", # Local dev
        "https://sppv2-eeghvcm71-fsotojs-projects.vercel.app", # Your Vercel staging URL
    ]
    # You can also add your HostGator domain here later
else:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, # Set to True if you plan to use cookies/auth later
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
