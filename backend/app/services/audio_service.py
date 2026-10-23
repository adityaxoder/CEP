"""Audio emotion analysis orchestration and provider factory."""

from __future__ import annotations

from app.api.schemas import ReadinessState
from app.config import Settings, get_settings
from app.models.audio import BaselineAudioProvider
from app.models.base import AudioEmotionProvider, ModalityResult


def get_audio_provider(settings: Settings | None = None) -> AudioEmotionProvider:
    """Return the configured audio emotion provider based on application settings."""
    resolved_settings = settings or get_settings()
    return BaselineAudioProvider(max_audio_bytes=resolved_settings.max_audio_bytes)


def get_audio_readiness(settings: Settings | None = None) -> ReadinessState:
    """Check audio emotion provider configuration readiness."""
    return "ready"


async def analyze_audio_emotion(
    audio_bytes: bytes,
    filename: str | None = None,
    provider: AudioEmotionProvider | None = None,
    settings: Settings | None = None,
) -> ModalityResult:
    """Validate and analyze audio input using the active audio provider."""
    active_provider = provider or get_audio_provider(settings)
    return await active_provider.analyze_audio(audio_bytes, filename=filename)
