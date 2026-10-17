# EmotionIQ Backend

## Clean local setup

The backend uses Python 3.12 and [uv](https://docs.astral.sh/uv/). From a clean project checkout:

```bash
cd backend
uv sync
cp .env.example .env
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open `http://localhost:8000/docs` for local API documentation and `http://localhost:8000/health` for the readiness response. The frontend runs separately at `http://localhost:5173`.

Copy `.env.example` to `.env` to customize local settings. The example contains non-secret development defaults; keep `.env` local and never commit credentials. Settings are loaded from environment variables, with `.env` used for local development.

Run Python commands in the managed environment with `uv run`, for example:

```bash
uv run python --version
```

After the first setup, start the local API from `backend/` with:

```bash
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In development, CORS accepts only the explicit origins in `CORS_ORIGINS`; its default is the local Vite app at `http://localhost:5173`. CORS middleware is not enabled outside the development environment.

`GET /health` reports whether the API is running and whether text, image, audio, and coach providers are ready. Until provider implementations are registered, these model statuses correctly report `unavailable` while the API itself reports `ok`.

Every response includes an `X-Request-ID` header. Expected API errors use a JSON body with `requestId`, `message`, `code`, and `details`; server stack traces are logged locally and are never returned to clients.

`uv sync` uses `pyproject.toml` and the committed `uv.lock` to install the same resolved dependency versions for each developer. Apply database migrations and start the API using the commands documented as those features are implemented.

The service is intended to run at `http://localhost:8000`; the local Vite frontend runs at `http://localhost:5173`. Keep credentials in a local, untracked `.env` file. Never commit secrets or local SQLite database files.

Configuration is defined in `app/config.py`. CORS origins are comma-separated, and wildcard origins are rejected. The SQLite database directory is created only when application startup or database setup explicitly calls `Settings.ensure_sqlite_database_directory()`.

## Database and migrations

SQLAlchemy models inherit from `app.db.base.Base`. Route code should request a database session through `app.db.session.get_db`; it closes sessions and rolls back an uncommitted transaction when a request fails. The local SQLite file comes from `DATABASE_URL` and remains untracked.

Alembic reads the same typed settings as the API and discovers tables through `Base.metadata`. Run these commands from `backend/`:

```bash
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "describe change"
```

Review every generated migration before committing it. Commit the SQLAlchemy model change and its migration together; teammates then run `uv run alembic upgrade head` after pulling. Migrations synchronize schema versions only, never SQLite data rows.

After pulling backend changes, run:

```bash
uv sync
uv run alembic upgrade head
```

Each developer has a separate local SQLite file at `data/emotioniq.db` by default. Do not commit database files, `.env`, uploaded media, provider keys, or model caches.
