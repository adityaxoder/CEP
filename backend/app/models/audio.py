"""Audio emotion provider implementations and response normalizers."""

from __future__ import annotations

import logging
from typing import Any

from app.models.base import ModalityResult, AudioEmotionProvider
from app.models.exceptions import (
    ProviderError,
    ProviderMalformedResponseError,
    ProviderTimeoutError,
    ProviderUnavailableError,
    ProviderValidationError,
)

logger = logging.getLogger(__name__)


def is_valid_audio_signature(audio_bytes: bytes) -> bool:
    """Check magic bytes signature for common audio formats (WAV, MP3, OGG, WEBM)."""
    if len(audio_bytes) < 4:
        return False
    # WAV starts with RIFF
    if audio_bytes[:4] == b"RIFF":
        return True
    # MP3 starts with ID3 or sync frame (0xFF 0xFB/FA/F3/F2)
    if audio_bytes[:3] == b"ID3" or (audio_bytes[0] == 0xFF and (audio_bytes[1] & 0xE0) == 0xE0):
        return True
    # Ogg starts with OggS
    if audio_bytes[:4] == b"OggS":
        return True
    # WEBM starts with EBML header \x1a\x45\xdf\xa3
    if audio_bytes[:4] == b"\x1a\x45\xdf\xa3":
        return True
    return False


def generate_audio_explanation(label: str, score: float | None = None) -> str:
    """Generate an observational, non-diagnostic explanation of vocal delivery cues."""
    clean_label = label.strip().lower()
    score_str = f" with an estimated score of {score:.2f}" if score is not None else ""
    return (
        f"Acoustic vocal delivery cues were estimated as '{clean_label}'{score_str}. "
        "This describes vocal acoustic properties only and does not diagnose a person's inner feelings."
    )


class BaselineAudioProvider(AudioEmotionProvider):
    """Deterministic audio provider for local development, tests, and provider outages."""

    def __init__(self, max_audio_bytes: int = 10_485_760) -> None:
        self.max_audio_bytes = max_audio_bytes

    async def analyze_audio(self, audio_bytes: bytes, filename: str | None = None) -> ModalityResult:
        if not audio_bytes:
            raise ProviderValidationError("Audio content must not be empty.")
        if len(audio_bytes) > self.max_audio_bytes:
            raise ProviderValidationError(f"Audio exceeds size limit of {self.max_audio_bytes} bytes.")

        if not is_valid_audio_signature(audio_bytes):
            raise ProviderValidationError("Malformed or unreadable audio format signature.")

        cue_hint = ""
        if filename:
            name_lower = filename.lower()
            if any(term in name_lower for term in ("happy", "smile", "warm", "joy", "positive", "laugh")):
                cue_hint = "positive"
            elif any(term in name_lower for term in ("sad", "frown", "serious", "concerned", "worry")):
                cue_hint = "concerned"

        if cue_hint == "positive":
            label = "Warm delivery"
            confidence = 0.78
            explanation = "Observable vocal delivery cues suggest a warm or upbeat acoustic style."
        elif cue_hint == "concerned":
            label = "Concerned delivery"
            confidence = 0.71
            explanation = "Observable vocal delivery cues suggest a serious or concerned acoustic tone."
        else:
            label = "Steady delivery"
            confidence = 0.62
            explanation = "Observable vocal delivery appears steady with limited emotional emphasis detected."

        return ModalityResult(
            label=label,
            confidence=confidence,
            explanation=explanation,
            all_scores={label: confidence},
        )
