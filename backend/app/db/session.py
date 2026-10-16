"""SQLAlchemy engine and request-scoped session lifecycle helpers."""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings, get_settings


def _connect_args(database_url: str) -> dict[str, bool]:
    """Return SQLAlchemy connection settings required by SQLite."""
    if make_url(database_url).get_backend_name() == "sqlite":
        return {"check_same_thread": False}
    return {}


def create_database_engine(settings: Settings) -> Engine:
    """Create an engine without opening a connection or creating a database file."""
    return create_engine(
        settings.database_url,
        connect_args=_connect_args(settings.database_url),
        pool_pre_ping=True,
    )


def create_session_factory(settings: Settings) -> sessionmaker[Session]:
    """Create a session factory from the configured database URL."""
    return sessionmaker(
        bind=create_database_engine(settings),
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )


settings = get_settings()
engine = create_database_engine(settings)
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """Yield one request-scoped session, rolling back failures and always closing."""
    session = SessionLocal()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
