from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ReadinessState = Literal["ready", "unavailable"]


class ModalityResult(BaseModel):
    """Normalized estimate from a single modality provider."""

    model_config = ConfigDict(extra="ignore")

    label: str = Field(
        ...,
        description="The observable cue label returned by the configured rule or model provider.",
    )
    confidence: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="An actual model score when available. Rule-based results leave this unset.",
    )
    explanation: str = Field(
        ...,
        description="A brief, non-diagnostic explanation of the observable cue or matching rule.",
    )
    all_scores: dict[str, float] | None = Field(
        default=None,
        description="Optional full score distribution across all evaluated labels for downstream fusion.",
    )
    method: str | None = Field(default=None, description="How this cue was produced, such as rule-based.")
    evidence: list[str] | None = Field(default=None, description="Matched wording evidence for explainable text rules.")
    description: str | None = Field(default=None, description="Plain-language summary of the submitted text and observable wording cues.")




class ModelReadiness(BaseModel):
    """Readiness of each provider-backed capability."""

    text: ReadinessState
    image: ReadinessState
    audio: ReadinessState
    coach: ReadinessState


class HealthResponse(BaseModel):
    """Small readiness response for local development checks."""

    status: Literal["ok"]
    version: str
    models: ModelReadiness


class ErrorResponse(BaseModel):
    """Safe, consistent body for expected API errors."""

    requestId: str
    message: str
    code: str
    details: dict[str, object] | None = None


class ModalitiesResult(BaseModel):

    """Container for modality analysis results."""

    model_config = ConfigDict(extra="ignore")

    text: ModalityResult | None = None
    image: ModalityResult | None = None
    audio: ModalityResult | None = None


class MismatchResult(BaseModel):
    """Observational cue alignment report across multiple modalities."""

    model_config = ConfigDict(extra="ignore")

    detected: bool = False
    description: str = ""


class AnalysisResponse(BaseModel):
    """Full analysis response matching the agreed API contract."""

    model_config = ConfigDict(extra="ignore")

    requestId: str
    modalities: ModalitiesResult
    summary: str | None = None
    improvement: str | None = None
    mismatch: MismatchResult = Field(default_factory=MismatchResult)
    suggestion: str | None = None


class CoachRequest(BaseModel):
    """Request payload for POST /coach."""

    model_config = ConfigDict(extra="ignore")

    text: str = Field(..., min_length=1, max_length=10_000)
    style: Literal["friendly", "formal", "concise", "empathetic", "professional", "assertive", "diplomatic", "casual"]


class CoachResponse(BaseModel):
    """Response payload for POST /coach."""

    model_config = ConfigDict(extra="ignore")

    requestId: str
    originalText: str
    style: str
    reframedText: str
    explanation: str

