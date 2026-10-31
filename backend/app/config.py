"""Typed application settings loaded from environment variables and `.env`."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


class Settings(BaseSettings):
    """Runtime configuration shared by the API and its infrastructure."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    app_env: Literal["development", "test", "production"] = "development"
    app_version: str = "0.1.0"
    cors_origins: str = "http://localhost:5173"

    max_text_length: int = Field(default=10_000, gt=0)
    max_image_bytes: int = Field(default=5_242_880, gt=0)
    max_audio_bytes: int = Field(default=10_485_760, gt=0)

    model_device: str = "cpu"
    text_model_name: str = "j-hartmann/emotion-english-distilroberta-base"
    image_model_name: str = "baseline"
    audio_model_name: str = "baseline"
    coach_provider: str = "baseline"

    hf_api_token: str | None = Field(
        default=None,
        validation_alias=AliasChoices("hf_api_token", "hf_token", "huggingface_api_token", "huggingface_hub_token"),
    )
    hf_inference_provider: str = Field(
        default="hf-inference",
        validation_alias=AliasChoices("hf_inference_provider", "hf_provider"),
    )
    hf_inference_api_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("hf_inference_api_url", "hf_api_base_url"),
    )
    text_model_timeout_seconds: float = Field(
        default=10.0,
        gt=0,
        validation_alias=AliasChoices("text_model_timeout_seconds", "text_provider_timeout", "model_timeout"),
    )
    allow_dev_baseline: bool = Field(
        default=False,
        validation_alias=AliasChoices("allow_dev_baseline", "enable_dev_baseline"),
    )

    database_url: str = "sqlite:///./data/emotioniq.db"
    auth_enabled: bool = True
    jwt_signing_secret: str = "local-demo-only-change-before-deployment"

    @field_validator("hf_api_token", mode="before")
    @classmethod
    def normalize_token(cls, value: str | None) -> str | None:
        """Strip whitespace from optional token and convert empty string to None."""
        if value is None:
            return None
        stripped = str(value).strip()
        return stripped if stripped else None

    @field_validator(
        "app_version",
        "model_device",
        "text_model_name",
        "image_model_name",
        "audio_model_name",
        "coach_provider",
        "database_url",
        "hf_inference_provider",
    )
    @classmethod
    def reject_blank_values(cls, value: str) -> str:
        """Reject blank configuration values instead of silently accepting them."""
        normalized = value.strip()
        if not normalized:
            raise ValueError("Value must not be blank")
        return normalized

    @field_validator("hf_inference_api_url", mode="before")
    @classmethod
    def normalize_api_url(cls, value: str | None) -> str | None:
        """Strip whitespace from optional URL and convert empty string to None."""
        if value is None:
            return None
        stripped = str(value).strip()
        return stripped if stripped else None

    @field_validator("cors_origins")
    @classmethod
    def validate_cors_origins(cls, value: str) -> str:
        """Require one or more explicit origins; wildcard CORS is not accepted."""
        origins = [origin.strip() for origin in value.split(",") if origin.strip()]
        if not origins:
            raise ValueError("At least one CORS origin must be configured")
        if "*" in origins:
            raise ValueError("Wildcard CORS origins are not allowed")
        return ",".join(origins)

    @property
    def cors_origin_list(self) -> list[str]:
        """Return configured comma-separated origins as a normalized list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    def ensure_sqlite_database_directory(self) -> Path | None:
        """Create the local SQLite file's parent directory on explicit request.

        This has no effect for non-SQLite databases or in-memory SQLite URLs.
        It does not create the database file itself.
        """
        database_url = make_url(self.database_url)
        database_path = database_url.database
        if database_url.get_backend_name() != "sqlite" or not database_path or database_path == ":memory:":
            return None

        path = Path(database_path).expanduser()
        path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        return path.parent


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide settings instance."""
    return Settings()
