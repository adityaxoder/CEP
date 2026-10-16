# Vedant's Backend Tasks

This document turns the **Person 1 – Vedant** responsibility in `BACKEND_IMPLEMENTATION_PLAN.md` into 22 small steps. We can work through them one prompt at a time. Each task lists its goal, work, and a completion check. The tasks follow the project's shared backend decisions and keep Person 2's provider work and Person 3's route/frontend work within their agreed boundaries.

## Shared decisions and constraints to follow

- The backend uses **FastAPI and Python**, running on each developer's Mac at `localhost:8000`. The Vite frontend runs at `localhost:5173`; LAN access is not needed.
- Each developer uses a separate **SQLite** database file. SQLAlchemy models and Alembic migration files are shared through Git; database files and rows are local only.
- Keep local credentials in an untracked backend `.env`. Commit `.env.example`, never real keys. Never expose provider keys in the frontend.
- Analysis is available anonymously. Authentication is required for saving history, and saving is opt-in. Store structured results only; do not store raw images, audio, or other uploads.
- Keep uploaded content in memory where possible. If temporary files are needed, remove them immediately after processing, including on errors.
- Validate untrusted input before model calls. Do not log raw text, filenames, media bytes, authorization headers, or secrets.
- External inference may send submitted content off the local machine. The selected provider must be disclosed and processing consent obtained before an external request. Provider selection, model adapters, inference, and fusion belong primarily to Person 2.
- Do not change public API response shapes without agreement from all three people. Coordinate schema changes and migrations with the team; after pulling migration changes, run `alembic upgrade head`.
- Emotion outputs are estimates based on observable cues, never diagnoses or proof of internal emotion. Public errors should be actionable and use the shared `requestId`, `message`, `code`, `details` shape; stack traces stay in server logs.
- Use branches or clearly separated commits, and include tests with behavior changes. Do not commit `.env`, API keys, SQLite files, uploaded media, or model caches.

## Tasks

### 1. Confirm the shared Python setup

**Goal:** Make sure all three developers can use the same runtime and dependency workflow.

- Inspect the repository for existing Python version, package-manager, and backend conventions before adding anything.
- **Project decision:** Python 3.12 with `uv` as the package manager and environment/dependency workflow.
- Record this choice in the backend setup documentation and project metadata when those are added in later tasks.
- Confirm the local service and frontend origins: `http://localhost:8000` and `http://localhost:5173`.
- Keep provider choice and model licensing/quotas as a team decision; the plan intentionally defers the final provider choice until the text integration milestone.

**Complete when:** Python 3.12 + `uv` is recorded as the project setup, the team understands the local service boundary, and the provider decision remains deferred.

### 2. Create the backend project structure

**Goal:** Establish the agreed place for service, database, and tests code.

- Create `backend/` with an `app/` package and the foundation directories from the plan, such as `api/`, `services/`, `models/`, `infrastructure/`, `db/`, and `tests/` as appropriate.
- Establish a clear Python package entry point and keep names compatible with planned modules such as `app.main` and `app.config`.
- Avoid implementing Person 2's inference logic or Person 3's endpoint behavior as part of scaffolding.

**Complete when:** the backend package imports from the documented working directory and its structure can host the planned shared components.

### 3. Set up dependencies and project metadata

**Goal:** Make backend dependencies repeatable on each developer's machine.

- Add project metadata and pinned or appropriately constrained dependencies for FastAPI, Uvicorn, Pydantic Settings, SQLAlchemy, Alembic, `python-multipart`, Pillow, and the agreed test tools.
- Keep optional model libraries out until the provider owner has selected and evaluated them.
- Document environment creation and dependency installation using the Task 1 package-manager decision.

**Complete when:** a clean environment can install the backend dependencies using one documented workflow.

### 4. Add environment configuration and `.env.example`

**Goal:** Centralize runtime configuration without committing secrets.

- Implement typed settings loaded from environment variables.
- Include the plan's defaults where relevant: `APP_ENV`, `APP_VERSION`, `CORS_ORIGINS`, `MAX_TEXT_LENGTH`, `MAX_IMAGE_BYTES`, `MAX_AUDIO_BYTES`, `MODEL_DEVICE`, model/provider names, `DATABASE_URL`, and `AUTH_ENABLED`.
- Use `DATABASE_URL=sqlite:///./data/emotioniq.db` or the agreed equivalent; make sure its parent directory is created safely when needed.
- Add a `.env.example` with placeholder/non-secret values only. Do not add real inference keys before the provider decision.
- Fail clearly for invalid configuration rather than silently using unsafe values.

**Complete when:** the application reads documented environment settings and a developer can copy the example file without receiving any secret.

### 5. Add ignore rules for local data and secrets

**Goal:** Keep private/local artifacts out of Git.

- Add ignore rules for backend `.env` files, `*.db`, `*.sqlite`, temporary uploads, model caches, virtual environments, and Python cache/test artifacts where not already ignored.
- Preserve `.env.example` and migration source files in Git.
- Inspect Git status to ensure no local database or secret file is staged or tracked; do not delete existing user data as part of this task.

**Complete when:** expected local-only files are ignored while source configuration examples and migrations remain trackable.

### 6. Create the FastAPI application and development CORS

**Goal:** Provide a runnable application shell for the team.

- Create the FastAPI app and expose `/docs` for local inspection.
- Configure development CORS for the known local Vite origin (`http://localhost:5173`) only; do not enable wildcard origins with credentials.
- Add startup/shutdown handling only where needed for clean resource lifecycle.
- Keep analysis and coach route implementation within the agreed route ownership, coordinating shared app registration with Person 3.

**Complete when:** the documented command starts the service locally, `/docs` loads, and the local frontend origin is accepted while an unrelated origin is not.

### 7. Implement `GET /health`

**Goal:** Let local developers check API and model readiness.

- Return the planned shape: `status`, `version`, and `models` readiness for text, image, audio, and coach.
- Read the application version from configuration.
- Report unavailable models as `unavailable`; the API process may still be healthy when a model cannot serve requests.
- Coordinate readiness values with Person 2's provider registration so health does not claim a provider is ready when it is unavailable.

**Complete when:** a health request returns the stable documented JSON shape and readiness status reflects configured provider availability.

### 8. Standardize API errors and request IDs

**Goal:** Give the frontend consistent, safe errors to display and correlate.

- Generate a safe request ID for each request and include it in success/error handling as agreed by the API contract.
- Format expected errors as `{requestId, message, code, details}` using codes such as `INVALID_INPUT`, `NO_MODALITY_PROVIDED`, `UNSUPPORTED_MEDIA_TYPE`, `FILE_TOO_LARGE`, `MALFORMED_MEDIA`, `MODEL_UNAVAILABLE`, `MODEL_TIMEOUT`, `RATE_LIMITED`, and `INTERNAL_ERROR`.
- Map framework validation errors to readable messages without exposing tracebacks.
- Log internal exceptions safely; never include submitted content, media, tokens, or authorization headers.
- Coordinate exception handling with Person 3 so route errors keep the same contract.

**Complete when:** representative expected and unexpected errors have the documented response shape, request IDs, and no public stack traces.

### 9. Configure SQLAlchemy and the local SQLite session lifecycle

**Goal:** Establish the local persistence foundation without sharing data files.

- Configure the SQLAlchemy engine and session factory from `DATABASE_URL`.
- Use a per-request/session lifecycle that reliably closes sessions and rolls back failed transactions.
- Ensure the local database directory exists when the app or migration needs it.
- Keep SQLite files outside source control and do not add upload/media persistence.
- Establish the declarative base location used by future user and history models.

**Complete when:** application code can open and close a local SQLite session cleanly and the DB file is generated locally.

### 10. Configure Alembic migrations

**Goal:** Make schema changes reproducible and team-shareable.

- Initialize Alembic under `backend/` and connect it to the app's SQLAlchemy metadata and configured database URL.
- Ensure migrations can import model metadata without starting unrelated services or requiring provider credentials.
- Document commands from the backend working directory, including `alembic upgrade head` and `alembic revision --autogenerate -m "describe change"`.
- Treat migration text and schema code as shared source; never commit generated SQLite files.

**Complete when:** Alembic discovers the intended metadata and uses the configured local database.

### 11. Create and apply the initial migration

**Goal:** Prove the schema can be created from nothing.

- Add the initial revision, even if it creates only the initial baseline tables required at this point.
- Test it against a clean/empty local database path and verify `alembic upgrade head` succeeds.
- Review generated migration content before keeping it; do not rely on autogeneration without inspection.
- Confirm downgrade behavior if the initial migration supports a safe downgrade.

**Complete when:** a developer can create a fresh local schema entirely from committed migration files.

### 12. Document clean backend setup and run instructions

**Goal:** Let a teammate start the service without tribal knowledge.

- Add `backend/README.md` or the agreed documentation section with Python setup, dependency installation, `.env` setup, migration, and server startup instructions.
- Include the health URL and local frontend origin.
- Explain that `.env` and SQLite data are developer-local and should not be committed.
- Describe the initial migration workflow and how to apply migrations after pulling.

**Complete when:** a teammate can follow the instructions from a clean checkout to a running API and initialized local database.

### 13. Add and run foundation checks

**Goal:** Catch regressions in the backend shell and database workflow.

- Add tests for application startup, health response, CORS behavior, error shape/request IDs, and migration from an empty database, as applicable to current implementation.
- Add a smoke check through the running app/Uvicorn if the project test setup supports it.
- Run the relevant checks and fix failures before handing off the foundation.
- Keep tests isolated from real provider calls and real developer data.

**Complete when:** the foundation checks pass in the documented local environment and demonstrate clean database creation.

### 14. Send the foundation handoff to the team

**Goal:** Give Persons 2 and 3 stable integration points.

- Document database base/session imports, current models, migration commands, settings names, app entry point, and authentication dependency location (to be added later).
- Communicate the agreed API error and request ID mechanism and any current limitations.
- Ask the team to coordinate before modifying shared response contracts or schemas.

**Complete when:** teammates can integrate provider/routes code without guessing where configuration, sessions, or shared contracts live.

### 15. Agree on user and history table design

**Goal:** Settle the data contract before adding account persistence.

- Wait until anonymous analysis is reliable, as required by Phase 7, before making history a blocker for the core API.
- Agree with the team on user fields, unique login identifier, password hash field, timestamps, history result fields, request ID, owner/user ID, and consent representation.
- Store structured analysis output only; exclude raw text/media unless the team explicitly defines and approves a separate privacy-safe requirement. The current plan says structured results only and no raw media.
- Define ownership-safe query behavior, deletion behavior, retention documentation, and migration naming before implementation.

**Complete when:** table fields, ownership, consent, and retention expectations are agreed and recorded.

### 16. Add authentication schemas and security utilities

**Goal:** Build reusable, safe authentication primitives before endpoint integration.

- Define validated request/response schemas for registration and login without returning password data.
- Implement password hashing and verification using a suitable maintained password-hashing library.
- Implement JWT creation and validation using secrets/configuration held only by the backend.
- Add a reusable authentication dependency that reads and validates bearer tokens and resolves the user safely.
- Never store plaintext passwords or expose JWT signing secrets to the frontend/logs.

**Complete when:** unit-level checks prove password hashes verify correctly, plaintext is not stored, and valid/invalid/expired tokens are handled safely.

### 17. Implement registration and login

**Goal:** Provide the planned local account endpoints.

- Add registration and login routes with clear validation and actionable errors.
- Prevent duplicate account identifiers and avoid revealing sensitive account details unnecessarily.
- Return a JWT and the minimum user information the agreed frontend needs.
- Keep anonymous `/analyze` access intact; require authentication only for account/history operations.
- The plan mentions refresh/logout as appropriate for the frontend flow; agree whether these are needed before adding them rather than silently expanding the contract.

**Complete when:** a user can register and log in, receive a usable token, and anonymous analysis remains available.

### 18. Add authentication tests

**Goal:** Verify account security behavior and errors.

- Cover successful registration/login, duplicate registration, invalid credentials, password hashing, missing/malformed/expired token, and protected-route access.
- Verify auth errors use the common error response and do not expose password or token details.
- Keep test credentials and signing keys ephemeral and test-only.

**Complete when:** authentication tests cover both normal and rejected flows and pass without real credentials.

### 19. Design opt-in history persistence

**Goal:** Make the user explicitly choose whether a structured result is saved.

- Agree with Person 3 on where save consent enters the request flow and how the UI distinguishes processing consent from history-saving consent.
- Define a history record containing only agreed structured analysis fields, timestamp, request ID, and user ownership.
- Do not persist image/audio bytes, filenames, or temporary upload references. Avoid retaining raw text unless the approved structured-result definition requires it.
- Add the required SQLAlchemy model and Alembic migration, reviewing the migration before sharing it.

**Complete when:** the schema supports only consented structured records with a clear owning user and no raw media columns.

### 20. Implement history operations and ownership enforcement

**Goal:** Ensure users can access and remove only their own saved records.

- Add the agreed save/list/get/delete-one/delete-all behavior in coordination with Person 3's routes.
- Require a valid authenticated user and explicit save consent before insertion.
- Put ownership filters in database queries themselves; never fetch another user's row and rely only on a later route check.
- Ensure deletion removes the selected user's record(s), with no cross-user effect.
- Ensure retries do not create duplicate successful history entries where request identity/idempotency is part of the agreed contract.

**Complete when:** operations are consent-gated, authenticated, and user-scoped at query time.

### 21. Add seed and reset commands

**Goal:** Make local development fixtures repeatable and safe.

- Implement `python -m app.db.seed` for optional deterministic demo data that uses no real credentials.
- Implement `python -m app.db.reset` according to a clearly documented local-only behavior; make its destructive effect explicit in command help and ensure it targets only the configured developer-local database.
- Document `alembic upgrade head` after pulls and the seed/reset commands.
- Never put shared database rows or real user credentials into Git.

**Complete when:** a developer can create reproducible demo fixtures and intentionally reset only their local database using documented commands.

### 22. Add history/privacy tests and final Person 1 handoff

**Goal:** Verify the data layer meets the ownership, consent, and privacy commitments.

- Test that two users cannot list, read, or delete each other's records.
- Test that history is not written without explicit consent and that delete-one/delete-all are scoped correctly.
- Test that raw media is absent from stored records and analysis processing leaves no temporary upload behind.
- Verify migrations can recreate the schema and ignored local files remain untracked.
- Update retention/deletion and local setup documentation, then hand off stable models, migrations, auth dependencies, and configuration names.

**Complete when:** ownership, consent, deletion, migration recreation, and no-raw-media behavior have passing coverage and teammates have the final integration notes.

## Suggested order for working through the tasks

Work through Tasks 1–14 to deliver the foundation handoff. Tasks 15–22 are the later authentication and opt-in history milestone and should wait until the anonymous analysis path is reliable. The implementation order still needs to coordinate with Persons 2 and 3: text inference and the text-only API path are scheduled before image/audio, fusion, coach, and persistent history are fully integrated.
