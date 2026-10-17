"""Alembic migration checks using a fresh local SQLite database."""

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from app.config import get_settings

BACKEND_ROOT = Path(__file__).resolve().parents[1]
INITIAL_REVISION = "32fb52418b52"


def test_initial_migration_upgrades_and_downgrades_a_clean_database(
    monkeypatch, tmp_path: Path
) -> None:
    database_url = f"sqlite:///{tmp_path / 'clean.db'}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    get_settings.cache_clear()
    config = Config(str(BACKEND_ROOT / "alembic.ini"))

    try:
        command.upgrade(config, "head")
        engine = create_engine(database_url)
        assert "alembic_version" in inspect(engine).get_table_names()
        with engine.connect() as connection:
            assert (
                connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
                == INITIAL_REVISION
            )

        command.downgrade(config, "base")
        with engine.connect() as connection:
            assert connection.execute(text("SELECT COUNT(*) FROM alembic_version")).scalar_one() == 0
    finally:
        get_settings.cache_clear()
