"""API routes for system health, emotion analysis, and conversation coaching."""

from __future__ import annotations

import io
import logging
from typing import cast

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from PIL import Image
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.schemas import (
    AnalysisResponse,
    CoachRequest,
    CoachResponse,
    HealthResponse,
    ModalitiesResult,
    ModelReadiness,
    ReadinessState,
)
from app.api.auth import require_user
from app.config import Settings
from app.db.session import get_db
from app.infrastructure.errors import ApiError, request_id_for
from app.models.analysis_history import AnalysisHistory
from app.models.audio import is_valid_audio_signature
from app.models.base import ModalityResult
from app.models.coach import ALLOWED_COACH_STYLES
from app.models.exceptions import ProviderError
from app.models.user import User
from app.services.audio_service import analyze_audio_emotion
from app.services.coach_service import reframe_text
from app.services.fusion_service import fuse_modalities
from app.services.image_service import analyze_image_emotion
from app.services.text_service import analyze_text_emotion

logger = logging.getLogger(__name__)

router = APIRouter()

DEFAULT_MODEL_READINESS: dict[str, ReadinessState] = {
    "text": "unavailable",
    "image": "unavailable",
    "audio": "unavailable",
    "coach": "unavailable",
}

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
ALLOWED_AUDIO_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/ogg",
    "audio/webm",
    "video/webm",
    "audio/x-m4a",
    "audio/m4a",
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


@router.post("/analyze", response_model=AnalysisResponse, tags=["analysis"])
async def analyze(
    request: Request,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    text: str | None = Form(None),
    image: UploadFile | None = File(None),
    audio: UploadFile | None = File(None),
) -> AnalysisResponse:
    """Analyze text, image, audio, or multimodal communication signals."""
    settings = cast(Settings, request.app.state.settings)

    has_text = bool(text and text.strip())
    trimmed_text = text.strip() if text else ""

    image_bytes: bytes | None = None
    has_image = False
    if image is not None and image.filename:
        image_bytes = await image.read()
        if len(image_bytes) > 0:
            has_image = True

    audio_bytes: bytes | None = None
    has_audio = False
    if audio is not None and audio.filename:
        audio_bytes = await audio.read()
        if len(audio_bytes) > 0:
            has_audio = True

    # Empty request validation
    if not has_text and not has_image and not has_audio:
        raise ApiError(
            status_code=422,
            code="EMPTY_REQUEST",
            message="Add at least one signal before requesting an analysis.",
        )

    # Text length validation
    if has_text and len(trimmed_text) > settings.max_text_length:
        raise ApiError(
            status_code=422,
            code="TEXT_TOO_LONG",
            message=f"Text input exceeds maximum allowed length of {settings.max_text_length} characters.",
        )

    # Image validation
    if has_image and image_bytes is not None:
        if len(image_bytes) > settings.max_image_bytes:
            raise ApiError(
                status_code=413,
                code="UPLOAD_TOO_LARGE",
                message=f"Image file exceeds maximum allowed size of {settings.max_image_bytes // (1024 * 1024)} MB.",
            )
        content_type = (image.content_type or "").lower().split(";")[0].strip()
        if content_type not in ALLOWED_IMAGE_TYPES:
            raise ApiError(
                status_code=415,
                code="UNSUPPORTED_MEDIA_TYPE",
                message="Unsupported image type. Allowed types are JPEG, PNG, and WEBP.",
            )
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            pil_img.verify()
        except Exception:
            raise ApiError(
                status_code=422,
                code="MALFORMED_IMAGE",
                message="Malformed or unreadable image file.",
            )

    # Audio validation
    if has_audio and audio_bytes is not None:
        if len(audio_bytes) > settings.max_audio_bytes:
            raise ApiError(
                status_code=413,
                code="UPLOAD_TOO_LARGE",
                message=f"Audio file exceeds maximum allowed size of {settings.max_audio_bytes // (1024 * 1024)} MB.",
            )
        content_type = (audio.content_type or "").lower().split(";")[0].strip()
        if content_type not in ALLOWED_AUDIO_TYPES:
            raise ApiError(
                status_code=415,
                code="UNSUPPORTED_MEDIA_TYPE",
                message="Unsupported audio type. Allowed types are MP3, WAV, OGG, and WEBM.",
            )
        if not is_valid_audio_signature(audio_bytes):
            raise ApiError(
                status_code=422,
                code="MALFORMED_AUDIO",
                message="Malformed or unreadable audio format signature.",
            )

    text_res: ModalityResult | None = None
    image_res: ModalityResult | None = None
    audio_res: ModalityResult | None = None

    total_signals = sum([has_text, has_image, has_audio])

    # Run text analysis
    if has_text:
        try:
            text_res = await analyze_text_emotion(trimmed_text, settings=settings)
        except ProviderError:
            if total_signals == 1:
                raise
            logger.warning("Text provider failed during multimodal analysis; omitting text result.")
            text_res = None

    # Run image analysis
    if has_image and image_bytes is not None and image is not None:
        try:
            image_res = await analyze_image_emotion(
                image_bytes,
                filename=image.filename,
                settings=settings,
            )
        except ProviderError:
            if total_signals == 1:
                raise
            logger.warning("Image provider failed during multimodal analysis; omitting image result.")
            image_res = None

    # Run audio analysis
    if has_audio and audio_bytes is not None and audio is not None:
        try:
            audio_res = await analyze_audio_emotion(
                audio_bytes,
                filename=audio.filename,
                settings=settings,
            )
        except ProviderError:
            if total_signals == 1:
                raise
            logger.warning("Audio provider failed during multimodal analysis; omitting audio result.")
            audio_res = None

    if total_signals > 0 and text_res is None and image_res is None and audio_res is None:
        raise ApiError(
            status_code=503,
            code="MODEL_UNAVAILABLE",
            message="The requested emotion analysis providers are currently unavailable.",
        )

    fusion_output = fuse_modalities(
        text_result=text_res,
        image_result=image_res,
        audio_result=audio_res,
        text_raw=trimmed_text if has_text else None,
    )

    response = AnalysisResponse(
        requestId=request_id_for(request),
        modalities=ModalitiesResult(
            text=text_res,
            image=image_res,
            audio=audio_res,
        ),
        summary=fusion_output.summary,
        improvement=fusion_output.improvement,
        mismatch=fusion_output.mismatch,
        suggestion=fusion_output.suggestion,
    )
    db.add(AnalysisHistory(
        user_id=user.id,
        request_id=response.requestId,
        provided={"text": has_text, "image": has_image, "audio": has_audio},
        inputs={
            "text": trimmed_text if has_text else None,
            "imageName": image.filename[:255] if has_image and image and image.filename else None,
            "audioName": audio.filename[:255] if has_audio and audio and audio.filename else None,
        },
        result=response.model_dump(mode="json"),
    ))
    db.commit()
    return response


@router.get("/history", tags=["history"])
def list_analysis_history(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict[str, list[dict[str, object]]]:
    """List only the signed-in user's saved local analysis results."""
    records = db.scalars(
        select(AnalysisHistory)
        .where(AnalysisHistory.user_id == user.id)
        .order_by(AnalysisHistory.created_at.desc(), AnalysisHistory.id.desc())
    ).all()
    return {"items": [
        {
            "id": record.id,
            "requestId": record.request_id,
            "createdAt": record.created_at.isoformat(),
            "provided": record.provided,
            "inputs": record.inputs or {},
            "result": record.result,
        }
        for record in records
    ]}


@router.delete("/history", tags=["history"])
def clear_analysis_history(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    """Delete all saved analysis results belonging to the signed-in user."""
    result = db.execute(delete(AnalysisHistory).where(AnalysisHistory.user_id == user.id))
    db.commit()
    return {"deleted": result.rowcount or 0}


@router.delete("/history/{entry_id}", tags=["history"])
def delete_analysis_history_entry(
    entry_id: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    """Delete one saved result only when it belongs to the signed-in user."""
    result = db.execute(
        delete(AnalysisHistory).where(
            AnalysisHistory.id == entry_id,
            AnalysisHistory.user_id == user.id,
        )
    )
    db.commit()
    if not result.rowcount:
        raise ApiError(status_code=404, code="HISTORY_NOT_FOUND", message="That history item was not found.")
    return {"deleted": True}


@router.post("/coach", response_model=CoachResponse, tags=["coach"])
async def coach(payload: CoachRequest, request: Request, _user=Depends(require_user)) -> CoachResponse:
    """Reframe a single message toward a selected tone while preserving intent."""
    settings = cast(Settings, request.app.state.settings)
    stripped = payload.text.strip()

    if not stripped:
        raise ApiError(
            status_code=422,
            code="INVALID_INPUT",
            message="Enter a sentence before using the conversation coach.",
        )

    if len(stripped) > settings.max_text_length:
        raise ApiError(
            status_code=422,
            code="TEXT_TOO_LONG",
            message=f"Text input exceeds maximum allowed length of {settings.max_text_length} characters.",
        )

    style = payload.style.strip().lower()
    if style not in ALLOWED_COACH_STYLES:
        raise ApiError(
            status_code=422,
            code="INVALID_STYLE",
            message=f"Style '{payload.style}' is not recognized. Allowed styles: {', '.join(sorted(ALLOWED_COACH_STYLES))}.",
        )

    coach_result = await reframe_text(stripped, style, settings=settings)

    return CoachResponse(
        requestId=request_id_for(request),
        originalText=coach_result.original_text,
        style=coach_result.style,
        reframedText=coach_result.reframed_text,
        explanation=coach_result.explanation,
    )
