"""Conversation coach service orchestration and provider factory."""

from __future__ import annotations

from app.api.schemas import ReadinessState
from app.config import Settings, get_settings
from app.models.base import CoachProvider, CoachResult
from app.models.coach import BaselineCoachProvider


def get_coach_provider(settings: Settings | None = None) -> CoachProvider:
    """Return the configured coach provider based on application settings."""
    resolved_settings = settings or get_settings()
    return BaselineCoachProvider(max_text_length=resolved_settings.max_text_length)


def get_coach_readiness(settings: Settings | None = None) -> ReadinessState:
    """Check coach provider configuration readiness."""
    return "ready"


async def reframe_text(
    text: str,
    style: str,
    provider: CoachProvider | None = None,
    settings: Settings | None = None,
) -> CoachResult:
    """Validate and reframe sentence using the active coach provider."""
    active_provider = provider or get_coach_provider(settings)
    return await active_provider.reframe(text, style)
