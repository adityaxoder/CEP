"""Conversation coach provider implementations."""

from __future__ import annotations

import logging
import re

from app.models.base import CoachProvider, CoachResult
from app.models.exceptions import ProviderValidationError

logger = logging.getLogger(__name__)

ALLOWED_COACH_STYLES = {
    "friendly", "formal", "concise", "empathetic",
    "professional", "assertive", "diplomatic", "casual",
}


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

        core = re.sub(r"[.!?]+$", "", normalized_text).strip()
        terminal = normalized_text[-1] if normalized_text[-1:] in {".", "?", "!"} else "."
        sentence = f"{core}{terminal}"

        if normalized_style == "friendly":
            request = re.match(r"^(?:please\s+)?(can|could|would) you\s+(.+)$", core, flags=re.IGNORECASE)
            if request:
                requested_action = re.sub(r"^please\s+", "", request.group(2), flags=re.IGNORECASE)
                reframed = f"When you have a moment, could you {_lower_first(requested_action)}? Thanks!"
            elif core.lower().startswith("please "):
                reframed = f"When you have a moment, {_lower_first(core[7:])}. Thanks!"
            else:
                reframed = f"Just sharing: {sentence}"
        elif normalized_style == "formal":
            request = re.match(r"^(?:please\s+)?(can|could|would) you\s+(.+)$", core, flags=re.IGNORECASE)
            if request:
                requested_action = re.sub(r"^please\s+", "", request.group(2), flags=re.IGNORECASE)
                reframed = f"Would you please {_lower_first(requested_action)}?"
            elif core.lower().startswith("please "):
                reframed = f"I would appreciate it if you could {_lower_first(core[7:])}."
            else:
                reframed = f"Please note: {sentence}"
        elif normalized_style == "concise":
            concise = core
            for filler in (
                r"\bI just wanted to\s+", r"\bI was wondering if\s+", r"\bbasically\s+",
                r"\bactually\s+", r"\bjust\s+", r"\bkind of\s+", r"\bsort of\s+",
            ):
                concise = re.sub(filler, "", concise, flags=re.IGNORECASE)
            concise = re.sub(r"\s+", " ", concise).strip()
            reframed = f"{concise}{terminal}"
        elif normalized_style == "empathetic":
            reframed = f"I hear you. {sentence}"
        elif normalized_style == "professional":
            reframed = f"For your attention: {sentence}"
        elif normalized_style == "assertive":
            reframed = f"To be clear: {sentence}"
        elif normalized_style == "diplomatic":
            reframed = f"I would like to raise this constructively: {sentence}"
        else:  # casual
            reframed = f"Just a quick note: {sentence}"

        explanation = (
            f"A deterministic {normalized_style} template was applied. Review the suggestion to make sure it preserves your intended meaning."
        )

        return CoachResult(
            original_text=normalized_text,
            style=normalized_style,
            reframed_text=reframed,
            explanation=explanation,
        )
