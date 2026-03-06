"""
db/session.py
─────────────
Database engine and session factory.

- **Dev (SQLite)**  : Synchronous engine with check_same_thread=False.
- **Prod (PostgreSQL)**: Standard connection pool.

Usage
-----
    from db.session import get_session

    with get_session() as session:
        results = session.exec(select(State))
"""

from __future__ import annotations

from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from core.config import get_settings

_settings = get_settings()

# ── Engine setup ─────────────────────────────────────────────────────
_connect_args: dict = {}
if _settings.is_sqlite:
    # SQLite-specific: allow multi-thread access in dev
    _connect_args["check_same_thread"] = False

engine = create_engine(
    _settings.sqlalchemy_url,
    echo=_settings.debug,
    connect_args=_connect_args,
)


# ── Table creation helper ────────────────────────────────────────────
def create_db_and_tables() -> None:
    """Create all tables registered with SQLModel.metadata.

    Safe to call multiple times – existing tables are not recreated.
    """
    SQLModel.metadata.create_all(engine)


# ── Session dependency ───────────────────────────────────────────────
def get_session() -> Generator[Session, None, None]:
    """Yield a transactional session; commits on success, rolls back on error.

    This is designed to be used as a FastAPI ``Depends()`` callable
    or as a plain context manager::

        with get_session() as session:
            ...
    """
    with Session(engine) as session:
        yield session
