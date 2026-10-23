"""Foundation routes owned by the backend service layer."""

from typing import cast

from fastapi import APIRouter, Request

from app.api.schemas import HealthResponse, ModelReadiness, ReadinessState
from app.config import Settings


router = APIRouter()

DEFAULT_MODEL_READINESS: dict[str, ReadinessState] = {
    "text": "unavailable",
    "image": "unavailable",
    "audio": "unavailable",
    "coach": "unavailable",
}


@router.get("/health", response_model=HealthResponse, tags=["system"])
async def health(request: Request) -> HealthResponse:
    """Report API availability separately from model-provider availability."""
    settings = cast(Settings, request.app.state.settings)
    readiness = {
        **DEFAULT_MODEL_READINESS,
        **getattr(request.app.state, "model_readiness", {}),
    }

    return HealthResponse(
        status="ok",
        version=settings.app_version,
        models=ModelReadiness.model_validate(readiness),
    )
