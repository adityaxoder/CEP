# Backend Foundation Handoff

## Ready integration points

- **App entry point:** `app.main:app`; app factory: `app.main.create_app(settings)`.
- **Settings:** `app.config.Settings` and `app.config.get_settings()`.
- **Environment names:** `APP_ENV`, `APP_VERSION`, `CORS_ORIGINS`, `MAX_TEXT_LENGTH`, `MAX_IMAGE_BYTES`, `MAX_AUDIO_BYTES`, `MODEL_DEVICE`, `TEXT_MODEL_NAME`, `IMAGE_MODEL_NAME`, `AUDIO_MODEL_NAME`, `COACH_PROVIDER`, `DATABASE_URL`, and `AUTH_ENABLED`.
- **Database base:** `app.db.base.Base`.
- **Database dependency:** `app.db.session.get_db` yields a request-scoped SQLAlchemy session, rolls back failures, and always closes the session.
- **Migration configuration:** `alembic.ini` and `alembic/env.py`; migrations are in `alembic/versions/`.
- **Error support:** `app.infrastructure.errors.ApiError` for safe expected errors. Every response has `X-Request-ID`; error bodies use `requestId`, `message`, `code`, and `details`.
- **Future authentication dependency:** create it under `app/auth/dependencies.py` during the later account phase. This module does not exist yet; analysis stays anonymous until that phase is agreed and implemented.

## Commands

Run from `backend/`:

```bash
uv sync
uv run alembic upgrade head
uv run pytest
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Before changing a database model, pull the latest branch. Commit the model change and reviewed Alembic migration together. After pulling a migration, run `uv run alembic upgrade head`.

## Person 2: provider integration

- Do not change public HTTP response shapes in provider code.
- Update `app.state.model_readiness` with `ready` or `unavailable` for `text`, `image`, `audio`, and `coach` after provider setup changes. `/health` already reads this state.
- Keep provider credentials in local `.env`; do not log submitted text, media, tokens, or secrets.

## Person 3: HTTP route integration

- Keep `GET /health` in `app.api.routes`.
- Add `/analyze` and `/coach` through a separate router, then register it in `app.main.create_app`.
- Use `ApiError` or the shared exception handling so frontend errors retain the agreed JSON shape.
- Preserve the documented multipart field names: `text`, `image`, and `audio`.

## Current limits

- The initial migration is `32fb52418b52`; it establishes version history only because user/history tables are scheduled for the later authentication phase.
- Authentication dependencies and persistent history models are not present yet.
- The API exposes `/docs` and `/health`; analysis and coach routes remain Person 3's work.
- Provider readiness defaults to `unavailable`. Person 2 should update the four `app.state.model_readiness` entries during provider initialization.
- SQLite files, `.env`, uploads, and model caches stay local and untracked.
