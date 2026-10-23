"""Explainable, confidence-aware late fusion and mismatch detection."""

from __future__ import annotations

import re
from typing import NamedTuple

from app.api.schemas import MismatchResult
from app.models.base import ModalityResult


class FusionOutput(NamedTuple):
    summary: str | None
    improvement: str | None
    mismatch: MismatchResult
    suggestion: str | None


MODALITY_DISPLAY_NAMES = {
    "text": "text wording",
    "image": "visible image cues",
    "audio": "voice delivery",
}


def get_cue_category(label: str) -> str:
    """Normalize emotion labels into broad cue categories for mismatch detection."""
    normalized = label.lower()
    if re.search(r"\b(concerned|worried|sad|sadness|fear|disgust|anger|angry|negative|problem|issue|serious|frown)\b", normalized):
        return "concerned"
    if re.search(r"\b(positive|warm|joy|happy|happiness|smile|laugh|appreciate|excited)\b", normalized):
        return "positive"
    return "neutral"


def _get_text_summary(text: str, label: str) -> str:
    words = text.strip().split()
    word_count = len(words)
    return f"This {word_count}-word message is estimated to sound {label.lower()}, based on its observable wording cues."


def _get_text_improvement(label: str) -> str:
    category = get_cue_category(label)
    if category == "concerned":
        return "Name the specific issue and the next action you need so the concern is easier to respond to."
    if category == "positive":
        return "Keep the appreciation, then add a direct request or clear next step if you need action."
    return "For a clearer message, add the intended outcome or deadline while keeping the measured tone."


def fuse_modalities(
    text_result: ModalityResult | None,
    image_result: ModalityResult | None,
    audio_result: ModalityResult | None,
    text_raw: str | None = None,
) -> FusionOutput:
    """Combine available modality cues, detect conflicting signals, and produce summary/improvements.

    Rules:
    - Never diagnose internal emotions; describe observable cues only.
    - Mismatch detected only when 2 or more valid modalities disagree in cue category.
    - If 1 modality or aligned modalities, detected = False, description = "", suggestion = None.
    """
    available_modalities: list[tuple[str, ModalityResult]] = []
    if text_result is not None:
        available_modalities.append(("text", text_result))
    if image_result is not None:
        available_modalities.append(("image", image_result))
    if audio_result is not None:
        available_modalities.append(("audio", audio_result))

    # Determine mismatch
    if len(available_modalities) > 1:
        categories = {get_cue_category(res.label) for _, res in available_modalities}
        if len(categories) > 1:
            cue_descriptions = [
                f"{MODALITY_DISPLAY_NAMES[mod]} appears {get_cue_category(res.label)}"
                for mod, res in available_modalities
            ]
            mismatch_desc = (
                f"The available estimates are not aligned: {', '.join(cue_descriptions)}. "
                "This can reflect different observable signals and is not evidence of deception or hidden emotion."
            )
            mismatch = MismatchResult(detected=True, description=mismatch_desc)
            suggestion = "Consider checking the surrounding context or asking a clarifying question rather than relying on this estimate alone."
        else:
            mismatch = MismatchResult(detected=False, description="")
            suggestion = None
    else:
        mismatch = MismatchResult(detected=False, description="")
        suggestion = None

    # Summary and Improvement
    summary: str | None = None
    improvement: str | None = None

    if text_result is not None and text_raw:
        summary = _get_text_summary(text_raw, text_result.label)
        improvement = _get_text_improvement(text_result.label)
    elif text_result is not None:
        summary = f"This message is estimated to sound {text_result.label.lower()}, based on its observable wording cues."
        improvement = _get_text_improvement(text_result.label)
    elif image_result is not None and audio_result is not None:
        summary = f"Combined observable visual and vocal cues were estimated as {image_result.label.lower()} and {audio_result.label.lower()}."
    elif image_result is not None:
        summary = f"Observable visual cues were estimated as {image_result.label.lower()}."
    elif audio_result is not None:
        summary = f"Observable vocal delivery cues were estimated as {audio_result.label.lower()}."

    return FusionOutput(
        summary=summary,
        improvement=improvement,
        mismatch=mismatch,
        suggestion=suggestion,
    )
