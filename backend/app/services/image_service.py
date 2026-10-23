"""Image emotion analysis orchestration and provider factory."""

from __future__ import annotations

from app.api.schemas import ReadinessState
from app.config import Settings, get_settings
from app.models.base import ImageEmotionProvider, ModalityResult
from app.models.image import BaselineImageProvider


def get_image_provider(settings: Settings | None = None) -> ImageEmotionProvider:
    """Return the configured image emotion provider based on application settings."""
    resolved_settings = settings or get_settings()
    return BaselineImageProvider(max_image_bytes=resolved_settings.max_image_bytes)


def get_image_readiness(settings: Settings | None = None) -> ReadinessState:
    """Check image emotion provider configuration readiness."""
    return "ready"


async def analyze_image_emotion(
    image_bytes: bytes,
    filename: str | None = None,
    provider: ImageEmotionProvider | None = None,
    settings: Settings | None = None,
) -> ModalityResult:
    """Validate and analyze image input using the active image provider."""
    active_provider = provider or get_image_provider(settings)
    return await active_provider.analyze_image(image_bytes, filename=filename)
