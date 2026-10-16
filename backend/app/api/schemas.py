"""Shared HTTP response models owned by the backend foundation."""

from typing import Literal

from pydantic import BaseModel


ReadinessState = Literal["ready", "unavailable"]


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
