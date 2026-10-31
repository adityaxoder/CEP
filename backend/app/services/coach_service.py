"""Conversation coach service orchestration and provider factory."""

from __future__ import annotations

from app.api.schemas import ReadinessState
from app.config import Settings, get_settings
from app.models.base import CoachProvider, CoachResult
from app.models.coach import ALLOWED_COACH_STYLES
from app.models.exceptions import ProviderUnavailableError
from app.models.gemini_coach import GeminiCoachProvider


def get_coach_provider(settings: Settings | None = None) -> CoachProvider:
    """Return the configured coach provider based on application settings."""
    resolved_settings = settings or get_settings()
    if not resolved_settings.gemini_api_key:
        raise ProviderUnavailableError("The writing service is not configured. Add its API key to backend/.env.")
    return GeminiCoachProvider(
        api_key=resolved_settings.gemini_api_key,
        model=resolved_settings.text_model_name,
        timeout=max(45.0, resolved_settings.text_model_timeout_seconds),
        max_text_length=resolved_settings.max_text_length,
    )


def get_coach_readiness(settings: Settings | None = None) -> ReadinessState:
    """Check Gemini readiness for the coach."""
    resolved = settings or get_settings()
    return "ready" if resolved.gemini_api_key else "unavailable"


async def reframe_text(
    text: str,
    style: str,
    provider: CoachProvider | None = None,
    settings: Settings | None = None,
) -> CoachResult:
    """Validate and reframe sentence using the active coach provider."""
    active_provider = provider or get_coach_provider(settings)
    return await active_provider.reframe(text, style)
