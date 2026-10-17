"""Provider-neutral model adapter interfaces and shared schemas."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from pydantic import BaseModel, ConfigDict, Field


class ModalityResult(BaseModel):
    """Normalized estimate from a single modality provider.

    Adheres to the agreed API and frontend contract:
    {
        "label": str,
        "confidence": float,
        "explanation": str
    }
    """

    model_config = ConfigDict(extra="ignore")

    label: str = Field(
        ...,
        description="The estimated emotion cue label returned by the model.",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="The model's actual uncalibrated prediction score clamped between 0.0 and 1.0.",
    )
    explanation: str = Field(
        ...,
        description="A brief, non-diagnostic explanation based strictly on observable wording cues.",
    )
    all_scores: dict[str, float] | None = Field(
        default=None,
        description="Optional full score distribution across all evaluated labels for downstream fusion.",
    )


@runtime_checkable
class TextEmotionProvider(Protocol):
    """Protocol for text emotion analysis providers."""

    async def analyze_text(self, text: str) -> ModalityResult:
        """Analyze input text and return a normalized ModalityResult.

        Raises:
            ProviderValidationError: If text is invalid, empty, or exceeds length limit.
            ProviderTimeoutError: If the provider call times out.
            ProviderRateLimitError: If rate limited by the provider.
            ProviderUnavailableError: If the service or model is unavailable / loading.
            ProviderMalformedResponseError: If the provider returns an unexpected response payload.
        """
        ...
