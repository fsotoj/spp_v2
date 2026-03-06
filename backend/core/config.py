"""
core/config.py
──────────────
Centralised application settings loaded from environment variables / .env file.

Uses pydantic-settings so every value is validated at startup.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-wide configuration.

    Values are read (in order of priority) from:
    1. Environment variables
    2. A ``.env`` file in the project root
    3. The defaults defined here
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── General ──────────────────────────────────────────────────────
    app_name: str = "spp_v2"
    debug: bool = False

    # ── Database ─────────────────────────────────────────────────────
    # For local dev    → sqlite:///./data/db/spp_dev.db (from project root)
    # For Railway      → sqlite:////app/data/db/spp_dev.db (Volume mount)
    database_url: str = "sqlite:///./data/db/spp_dev.db"

    # ── Data paths ───────────────────────────────────────────────────
    data_dir: Path = Path("data/raw")

    @property
    def db_path(self) -> Path:
        """Helper to get the actual file path from the database_url."""
        if self.database_url.startswith("sqlite:///"):
            path_str = self.database_url.replace("sqlite:///", "")
            path = Path(path_str)
            if path.is_absolute():
                return path
            
            # If relative, check if it exists from the current CWD
            # If not, try to find it relative to the project root (one level up if in backend/)
            if path.exists():
                return path.resolve()
            
            # Fallback for when running from within the backend/ folder
            alt_path = Path("..") / path
            if alt_path.exists():
                return alt_path.resolve()

            return path.resolve()
        return Path("./data/db/spp_dev.db").resolve()

    # ── API ──────────────────────────────────────────────────────────
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_key: str = "dev-key-123"  # Change in production (.env)

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


    @property
    def sqlalchemy_url(self) -> str:
        """Helper to get the SQLAlchemy connection string."""
        if self.is_sqlite:
            return f"sqlite:///{self.db_path}"
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton of the settings object."""
    return Settings()
