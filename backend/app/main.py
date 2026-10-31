"""FastAPI application entry point and HTTP middleware."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import DEFAULT_MODEL_READINESS, router as foundation_router
from app.api.auth import router as auth_router
from app.config import Settings, get_settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.infrastructure.errors import RequestIdMiddleware, register_error_handlers
from app.models.user import User
from app.models.analysis_history import AnalysisHistory
from app.services.auth_service import hash_password
from app.services.text_service import get_text_readiness
from app.services.coach_service import get_coach_readiness
from sqlalchemy import inspect, select, text, update


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
    application.state.model_readiness = {
        **DEFAULT_MODEL_READINESS,
        "text": get_text_readiness(resolved_settings),
        "coach": get_coach_readiness(resolved_settings),
    }

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
    application.include_router(auth_router)

    @application.on_event("startup")
    def initialize_local_accounts() -> None:
        """Create local schema and migrate existing email logins to usernames."""
        resolved_settings.ensure_sqlite_database_directory()
        Base.metadata.create_all(bind=engine)
        history_columns = {column["name"] for column in inspect(engine).get_columns("analysis_history")}
        if "inputs" not in history_columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE analysis_history ADD COLUMN inputs JSON"))
        with SessionLocal() as session:
            for old_login, username in (("vedant@gmail.com", "vedant"), ("aditya@gmail.com", "aditya")):
                session.execute(
                    update(User).where(User.username == old_login).values(username=username)
                )
            if session.scalar(select(User).where(User.username == "vedant")) is None:
                session.add(User(username="vedant", password_hash=hash_password("123")))
            session.commit()

    return application


app = create_app()

