"""Provider-neutral model adapter interfaces and shared schemas."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from pydantic import BaseModel, ConfigDict, Field


from app.api.schemas import ModalityResult


@runtime_checkable
class TextEmotionProvider(Protocol):
    """Protocol for text emotion analysis providers."""

    async def analyze_text(self, text: str) -> ModalityResult:
        """Analyze input text and return a normalized ModalityResult."""
        ...


@runtime_checkable
class ImageEmotionProvider(Protocol):
    """Protocol for image emotion analysis providers."""

    async def analyze_image(self, image_bytes: bytes, filename: str | None = None) -> ModalityResult:
        """Analyze image bytes and return a normalized ModalityResult."""
        ...


@runtime_checkable
class AudioEmotionProvider(Protocol):
    """Protocol for audio emotion analysis providers."""

    async def analyze_audio(self, audio_bytes: bytes, filename: str | None = None) -> ModalityResult:
        """Analyze audio bytes and return a normalized ModalityResult."""
        ...


class CoachResult(BaseModel):
    """Reframed sentence result from the Coach provider."""

    model_config = ConfigDict(extra="ignore")

    original_text: str
    style: str
    reframed_text: str
    explanation: str


@runtime_checkable
class CoachProvider(Protocol):
    """Protocol for conversation coach providers."""

    async def reframe(self, text: str, style: str) -> CoachResult:
        """Reframe text according to desired style."""
        ...
