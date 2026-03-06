"""
api/dependencies.py
───────────────────
FastAPI dependencies injected into route handlers.
Handles database sessions and API key authentication.
"""

from typing import Annotated, Generator

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from sqlmodel import Session

from core.config import get_settings
from db.session import engine

# API Key security scheme
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)

def get_db_session() -> Generator[Session, None, None]:
    """Yields a database session."""
    with Session(engine) as session:
        yield session

DbSession = Annotated[Session, Depends(get_db_session)]

def verify_api_key(api_key: Annotated[str, Security(api_key_header)]) -> str:
    """Validates the API key from the request header against the configured key."""
    settings = get_settings()
    if api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
        )
    return api_key

# Dependency to use on secure routes
SecureRoute = Annotated[str, Depends(verify_api_key)]
