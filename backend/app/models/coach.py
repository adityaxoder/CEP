"""Conversation coach provider implementations."""

from __future__ import annotations

import logging
import re

from app.models.base import CoachProvider, CoachResult
from app.models.exceptions import ProviderValidationError

logger = logging.getLogger(__name__)

ALLOWED_COACH_STYLES = {"light", "strict", "happy", "sad", "formal", "informal"}


def _lower_first(text: str) -> str:
    """Lowercase first character if string is non-empty."""
    if not text:
        return text
    return text[0].lower() + text[1:]


class BaselineCoachProvider(CoachProvider):
    """Deterministic coach provider that reframes text preserving original intent."""

    def __init__(self, max_text_length: int = 10_000) -> None:
        self.max_text_length = max_text_length

    async def reframe(self, text: str, style: str) -> CoachResult:
        normalized_text = text.strip()
        if not normalized_text:
            raise ProviderValidationError("Sentence for coaching must not be empty.")
        if len(normalized_text) > self.max_text_length:
            raise ProviderValidationError(f"Text exceeds limit of {self.max_text_length} characters.")

        normalized_style = style.strip().lower()
        if normalized_style not in ALLOWED_COACH_STYLES:
            raise ProviderValidationError(
                f"Style '{style}' is not recognized. Allowed styles: {', '.join(sorted(ALLOWED_COACH_STYLES))}."
            )

        core = re.sub(r"[.!?]+$", "", normalized_text)
        subject = _lower_first(core)

        reframes = {
            "light": f"Just a quick note: {subject} when you have a moment.",
            "strict": f"Please {subject} promptly.",
            "happy": f"I'd be happy to help with this: {subject}!",
            "sad": f"I'm feeling a little discouraged about this: {subject}.",
            "formal": f"Please be advised that {subject}. Your attention to this matter would be appreciated.",
            "informal": f"Hey, can we {subject}?",
        }

        reframed = reframes.get(normalized_style, reframes["light"])
        explanation = (
            f"The sentence was adjusted toward a {normalized_style} delivery "
            "while keeping the original intent as closely as possible."
        )

        return CoachResult(
            original_text=normalized_text,
            style=normalized_style,
            reframed_text=reframed,
            explanation=explanation,
        )
