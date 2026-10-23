"""FastAPI application entry point and HTTP middleware."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import DEFAULT_MODEL_READINESS, router as foundation_router
from app.config import Settings, get_settings
from app.infrastructure.errors import RequestIdMiddleware, register_error_handlers


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the API application with the configured local CORS policy."""
    resolved_settings = settings or get_settings()

    application = FastAPI(
        title="EmotionIQ API",
        version=resolved_settings.app_version,
        description="Local API for EmotionIQ communication-cue estimates.",
        docs_url="/docs",
        redoc_url=None,
    )
    application.state.settings = resolved_settings
    application.state.model_readiness = DEFAULT_MODEL_READINESS.copy()

    if resolved_settings.app_env == "development":
        application.add_middleware(
            CORSMiddleware,
            allow_origins=resolved_settings.cors_origin_list,
            allow_credentials=False,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type"],
        )
    application.add_middleware(RequestIdMiddleware)

    register_error_handlers(application)
    application.include_router(foundation_router)

    return application


app = create_app()

