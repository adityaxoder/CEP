"""Text emotion analysis orchestration and provider factory."""

from __future__ import annotations

from app.api.schemas import ReadinessState
from app.config import Settings, get_settings
from app.models.base import ModalityResult, TextEmotionProvider
from app.models.exceptions import ProviderUnavailableError
from app.models.gemini_text import GeminiTextProvider


def get_text_provider(settings: Settings | None = None) -> TextEmotionProvider:
    """Return the configured text emotion provider based on application settings.

    Gemini handles text analysis. The API key is required and remains on the backend.
    """
    resolved_settings = settings or get_settings()
    if not resolved_settings.gemini_api_key:
        raise ProviderUnavailableError("The text service is not configured. Add its API key to backend/.env.")
    return GeminiTextProvider(
        api_key=resolved_settings.gemini_api_key,
        model=resolved_settings.text_model_name,
        timeout=max(45.0, resolved_settings.text_model_timeout_seconds),
        max_text_length=resolved_settings.max_text_length,
    )


def get_text_readiness(settings: Settings | None = None) -> ReadinessState:
    """Check text emotion provider configuration readiness."""
    resolved = settings or get_settings()
    return "ready" if resolved.gemini_api_key else "unavailable"


async def analyze_text_emotion(
    text: str,
    provider: TextEmotionProvider | None = None,
    settings: Settings | None = None,
) -> ModalityResult:
    """Validate and analyze text input using the active text provider.

    Does NOT catch provider errors or fall back to baseline heuristics when real inference fails.
    """
    active_provider = provider or get_text_provider(settings)
    return await active_provider.analyze_text(text)
