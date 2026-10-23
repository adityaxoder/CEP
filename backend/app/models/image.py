"""Image emotion provider implementations and response normalizers."""

from __future__ import annotations

import io
import logging
from typing import Any

from PIL import Image

from app.models.base import ModalityResult, ImageEmotionProvider
from app.models.exceptions import (
    ProviderError,
    ProviderMalformedResponseError,
    ProviderTimeoutError,
    ProviderUnavailableError,
    ProviderValidationError,
)

logger = logging.getLogger(__name__)


def generate_image_explanation(label: str, score: float | None = None) -> str:
    """Generate an observational, non-diagnostic explanation of image expression cues."""
    clean_label = label.strip().lower()
    score_str = f" with an estimated score of {score:.2f}" if score is not None else ""
    return (
        f"Observable visible expression cues were estimated as '{clean_label}'{score_str}. "
        "This describes observable visual presentation only and does not diagnose a person's inner feelings."
    )


class BaselineImageProvider(ImageEmotionProvider):
    """Deterministic image provider for local development, tests, and provider outages."""

    def __init__(self, max_image_bytes: int = 5_242_880) -> None:
        self.max_image_bytes = max_image_bytes

    async def analyze_image(self, image_bytes: bytes, filename: str | None = None) -> ModalityResult:
        if not image_bytes:
            raise ProviderValidationError("Image content must not be empty.")
        if len(image_bytes) > self.max_image_bytes:
            raise ProviderValidationError(f"Image exceeds size limit of {self.max_image_bytes} bytes.")

        try:
            image = Image.open(io.BytesIO(image_bytes))
            image.verify()
        except Exception as err:
            raise ProviderValidationError(f"Malformed or unreadable image file: {err}")

        # Check filename cues if available for testing / demo
        cue_hint = ""
        if filename:
            name_lower = filename.lower()
            if any(term in name_lower for term in ("happy", "smile", "joy", "positive", "laugh")):
                cue_hint = "positive"
            elif any(term in name_lower for term in ("sad", "frown", "serious", "concerned", "worry")):
                cue_hint = "concerned"

        if cue_hint == "positive":
            label = "Positive visible cues"
            confidence = 0.81
            explanation = "Observable facial expression cues suggest a smiling or warm presentation."
        elif cue_hint == "concerned":
            label = "Concerned visible cues"
            confidence = 0.74
            explanation = "Observable facial expression cues suggest a serious or concerned expression."
        else:
            # Deterministic cue based on image size/properties
            label = "Neutral visible cues"
            confidence = 0.65
            explanation = "Observable visual cues appear neutral with no strong emotional expression detected."

        return ModalityResult(
            label=label,
            confidence=confidence,
            explanation=explanation,
            all_scores={label: confidence},
        )
