# EmotionIQ — Vedant’s Remaining Tasks, One Prompt at a Time

Every remaining task in this document is assigned to **Vedant** and numbered sequentially. Each task is intentionally scoped so it can be requested and completed in one prompt, with a concrete completion check. Some tasks involve implementing work that was earlier assigned to Persons 2 or 3; ownership here means Vedant is responsible for getting that remaining work done, either by implementing it or coordinating the required code/information. Complete dependencies in order. A checkbox means the work and its check have actually been completed; a plan or code stub alone does not count.

The goal is a reliable, honest, locally runnable frontend + backend project that can be demonstrated to the teacher. Completing this checklist is the target for a polished local MVP demo, not a guarantee of production deployment or clinical accuracy. Do not describe heuristic/baseline outputs as real emotion detection.

## Starting point and audit notes

The repository audit recorded these completed items: Vedant’s original Person 1 Tasks 1–14 (FastAPI foundation, configuration, CORS, health route, request IDs/errors, SQLite/SQLAlchemy/Alembic foundation and tests); Person 2’s provider interface and text adapter; Person 3’s `/analyze` and `/coach` contracts, validation, client integration code and automated coverage; and the main frontend screens and styling. At that audit, backend checks were 76 passed/1 skipped, frontend checks 35 passed, and frontend lint/build passed. Re-run checks before presenting because subsequent changes can invalidate this snapshot.

Audit gaps that still need resolution or explicit demo decisions:

- Image and audio providers in the FastAPI path were deterministic baselines, not pretrained inference; filename-cued output must not be represented as a real prediction.
- The active FastAPI fusion service did not yet implement confidence-weighted votes and a documented threshold; separate older fusion code was not proof that the live route used it.
- Provider readiness was not reflected accurately by `/health`.
- Processing consent was not yet sent/enforced by the API; the visible checkbox did not clearly explain external processing. History-save consent must be separate.
- Uploads were fully read before their size cap was enforced.
- Vedant’s Tasks 15–22 (real auth and persistent, private history) were still outstanding. Frontend login/history may currently be demo/local-only and must not be described as account-backed until connected.
- `frontend/.env.example` is intended to disable mock mode, but a developer needs a local ignored `frontend/.env`; confirm the running app is actually using the backend before acceptance.

## Vedant’s numbered task list

### Task 1 — Decide and document the demo inference scope

- [ ] Select which modalities the teacher demo will claim to support: text, image, voice, and combinations. For each one, state whether the result is real model inference or a heuristic/demo baseline.
- [ ] Record provider/model name and version, license, current access limits/cost if applicable, input restrictions, data handling, and known accuracy limitations. Verify terms from provider/model primary documentation.
- [ ] Agree with the team how external processing is disclosed and which modes can work without credentials/network access. Keep secrets in backend-only ignored environment files.

**Complete when:** the team can accurately explain every output shown in the demo and its data path.

### Task 2 — Verify the text inference adapter

- [ ] Make one live text inference request through the backend using the selected model and backend-only credentials if required; record the result and provider/model version.
- [ ] Confirm the adapter handles timeout, rate limit, unavailable model, invalid input and malformed provider response with typed, safe errors.
- [ ] State that classifier confidence is a score and may not be a calibrated probability. Avoid diagnostic language or claims of certainty.
- [ ] Keep credentials, submitted content and provider exception details out of frontend bundles, logs and committed files.

**Complete when:** live inference succeeds in the intended demo environment and failure behavior is reproducible with mocked tests.

### Task 3 — Implement or explicitly scope image and audio inference

- [ ] For each modality that will be claimed as model-supported, select an appropriate provider/model and verify licensing, privacy, limits, accepted formats and known limitations.
- [ ] Replace the active baseline provider with a real adapter, or mark the modality clearly as a heuristic/demo-only result and exclude it from real-inference claims.
- [ ] Remove filename-driven predictions. Baselines may use explicit test fixtures, and UI/API output must label them as demo estimates.
- [ ] Give each provider a timeout and safe unavailable/malformed-response behavior. A failed modality must not erase successful results from other modalities.
- [ ] Add isolated tests with mocked provider responses and timeout/unavailable/malformed cases; do not make ordinary tests depend on network access or real credentials.

**Complete when:** every demo modality is either verified real inference or visibly and accurately marked as a baseline.

### Task 4 — Connect actual provider readiness

- [ ] Make `/health` report whether each provider is configured and usable, with no credentials or sensitive details in the response.
- [ ] Distinguish app liveness from provider readiness so an unavailable model does not falsely imply the API process itself is down.
- [ ] Add tests for configured, missing-credential, and unavailable-provider states.

**Complete when:** health output matches the providers available in the current local setup.

### Task 5 — Implement and verify live-route fusion

- [ ] Implement confidence-normalized, confidence-weighted late fusion in the service actually called by FastAPI `/analyze`.
- [ ] Define and document a minimum-confidence threshold; exclude unusable/low-confidence modality outputs without inventing replacements.
- [ ] Report a possible mismatch only when at least two usable modality estimates disagree. Use observational, non-diagnostic wording.
- [ ] Preserve partial successes when one provider fails and keep absent modalities null/absent.
- [ ] Test equal/matching cues, conflicting cues, confidence weighting, below-threshold inputs, one-modality input, and provider partial failure directly against the live service.

**Complete when:** tests prove the `/analyze` route uses this fusion behavior, not a disconnected legacy module.

### Task 6 — Confirm coach behavior

- [ ] Decide whether `/coach` is an intentional deterministic response or uses an external provider. Label and document the chosen behavior.
- [ ] Verify all supported styles, empty/invalid input handling, timeout/unavailable behavior if applicable, and that it preserves user intent without inventing facts.

**Complete when:** the team can describe the coach’s actual implementation and its limits accurately.

### Task 7 — Enforce upload limits before buffering

- [ ] Change `/analyze` upload handling to enforce byte limits while reading/streaming, before loading the full file into memory or decoding it.
- [ ] Validate allowed media type and file signature, empty input, text length and total request rules; return stable error codes and safe messages.
- [ ] Ensure temporary uploads/buffers are cleaned on success, validation failure, provider failure and cancellation.
- [ ] Add tests at just-under, exact-limit and over-limit sizes; malformed/signature-mismatched files; and prove invalid files never reach a provider.

**Complete when:** an oversized or invalid upload is rejected without full buffering/decoding, and cleanup tests pass.

### Task 8 — Stabilize API errors and privacy-safe request handling

- [ ] Align backend errors and frontend mapping to one documented public shape: `requestId`, `message`, `code`, and `details` where safe.
- [ ] Ensure request IDs are present on success and errors, including validation and provider failures.
- [ ] Ensure logs do not contain submitted text/media, tokens, authorization headers, or exception details that can reveal user content.
- [ ] Verify client timeout, network failure, retry, loading, unavailable-provider and validation messages are actionable without exposing internal traces.

**Complete when:** route/client tests cover the public contract and sensitive input is absent from logs.

### Task 9 — Implement clear, enforceable processing consent

- [ ] State which providers receive text/image/audio, whether data leaves the local machine, and any relevant retention limitations in the UI before submission.
- [ ] Add the agreed processing-consent field to the request and enforce it server-side whenever external processing is used. A frontend-only checkbox is insufficient.
- [ ] Keep processing consent distinct from opt-in history-save consent (Vedant Task 19/20). Declining history must not silently block otherwise permitted analysis.
- [ ] Add tests proving absent/false consent prevents external calls and true consent enables only the agreed processing path.

**Complete when:** the UI wording, request contract, backend enforcement and tests all agree.

### Task 10 — Connect and verify the real frontend API path

- [ ] Set up local ignored `frontend/.env` from `.env.example`; confirm mock mode is disabled and the API base URL targets the local FastAPI server. Restart Vite after changes.
- [ ] Confirm `/analyze` sends multipart fields `text`, `image`, `audio` as applicable and `/coach` sends the agreed JSON `{text, style}`.
- [ ] Confirm response types, null modalities, errors, request IDs and provider labels are rendered correctly; the UI must not invent missing results.
- [ ] Confirm login/history UI is not presented as backend-backed until Vedant’s auth/history API is integrated. After those endpoints exist, connect and verify the actual flow with Vedant.

**Complete when:** browser Network tools show requests reaching the local backend and the UI renders the actual response in live mode.

### Task 11 — Run end-to-end flow acceptance and write report

- [ ] Through the real UI/API, exercise text-only, image-only, voice-only and multimodal requests that the team has agreed to claim. Record real inference versus baseline for every flow.
- [ ] Check validation errors, processing consent, loading, success, timeout/network failure, unavailable provider, partial success, retry and reset.
- [ ] Once history is connected, check saved history, delete one/all, no duplicate on retry, and history unavailable/error state.
- [ ] Write a concise acceptance report: date/environment, provider/mode, each flow, expected/actual result, pass/fail, and known limitations.

**Complete when:** the report matches observed behavior and every claimed demo flow has a recorded result.

### Task 12 — Review responsive layout and all frontend interactions

- [ ] Run the app at approximately 1440, 1024, 768 and 390 px widths. Check no horizontal overflow, overlap, clipped controls, or unreadable text on every screen.
- [ ] Visit every screen and operate every visible control: login/register, navigation, inputs, media select/remove, consent, submit, retry, reset, history, deletion, settings and sign-out as implemented.
- [ ] Verify empty, loading, success, error and unavailable states. Confirm retry does not duplicate saved records after persistence is integrated.

### Task 13 — Review keyboard navigation and accessibility

- [ ] Complete the main flow using keyboard only. Confirm logical focus order, visible focus, usable file controls and no keyboard trap.
- [ ] Inspect accessible labels, landmarks and announcements for loading/errors with browser accessibility tools; screen reader check when available.
- [ ] Fix issues discovered and document any remaining limitation in the acceptance report.

### Task 14 — Run frontend quality checks

- [ ] Run frontend automated tests, lint and production build after the final integration changes; fix all failures.

### Task 15 — Agree and document user/history schema

- [ ] Agree identifier (email or username), normalization/uniqueness, account timestamps, history fields, request ID, owner user ID and consent representation with Ayush.
- [ ] Define precisely what is retained: only the approved structured result, timestamp, request ID and owner. Do not persist raw image/audio. Avoid persisting raw text unless the team has a specific approved need.
- [ ] Define retention/deletion semantics, user-scoped query requirements, cascade behavior, migration naming, and which routes require authentication.
- [ ] Record the agreed schema/API contract in this task plan before coding.

**Done when:** frontend and backend owners agree on one written schema and privacy contract.

### Task 16 — Add auth schemas and security utilities

- [ ] Add registration/login request and response schemas with bounds and validation; never return password or password hash.
- [ ] Add a maintained password hashing library and verify hashes rather than storing or comparing plaintext passwords.
- [ ] Add backend-only JWT signing key, algorithm and expiry configuration; fail safely if required secrets are missing outside an explicit development/test setup.
- [ ] Implement token create/verify helpers and a reusable bearer dependency (planned location `app/auth/dependencies.py`) that loads the active user.
- [ ] Add unit tests for correct/wrong password, valid/malformed/expired token, missing bearer token, and nonexistent/inactive user.

**Done when:** auth primitives pass tests and secrets/passwords never appear in response bodies or logs.

### Task 17 — Implement registration and login routes

- [ ] Add register/login routes using the Task 15 identifier rules and Task 16 utilities.
- [ ] Handle invalid input, duplicate identifier, wrong credentials and safe error responses without leaking whether sensitive account details exist beyond the agreed UX.
- [ ] Return only the minimum user profile and usable access token; keep anonymous analysis available if that remains the agreed product behavior.
- [ ] Coordinate frontend token storage and session behavior with Ayush. Decide whether refresh/logout endpoints are required by the demo and implement the agreed flow.
- [ ] Add route tests for successful registration/login and all rejection cases.

**Done when:** a new user can register, sign in, and be identified by a protected backend route; no plaintext password is stored or returned.

### Task 18 — Complete authentication/security tests

- [ ] Cover registration, login, duplicate account, invalid credentials, password hashing, malformed/expired/missing JWT and protected route access.
- [ ] Verify responses and logs do not disclose password, hash, signing key, token or unnecessary account details.
- [ ] Use generated test-only secrets and isolated database state; tests must not depend on real accounts or external providers.
- [ ] Run the full backend test suite and address regressions.

**Done when:** auth success and denial paths are covered in repeatable backend tests.

### Task 19 — Implement opt-in history model and migration

- [ ] Agree the save-consent request/UI contract with Ayush, separate from processing consent.
- [ ] Add a history model containing only approved structured result data, timestamp, request ID and user foreign key; do not include raw image/audio columns.
- [ ] Add Alembic migration and verify upgrade from an empty database and migration consistency (`alembic check`).
- [ ] Add model/schema tests for required ownership, consent, and stored fields.

**Done when:** migration creates the reviewed schema and persistence is structurally limited to approved data.

### Task 20 — Implement authenticated, consent-gated history operations

- [ ] Implement the agreed save/list/get/delete-one/delete-all routes or service operations; all history access requires authentication.
- [ ] Save only when the user explicitly opted in. Do not store a record on declined/missing consent.
- [ ] Scope every database read/update/delete to the authenticated owner in the query itself, not just in frontend filtering.
- [ ] Connect frontend History to these endpoints with Ayush; support loading, empty, error, delete confirmation/result and sign-out behavior.
- [ ] Decide whether an idempotency key is required; if so, prevent retry from creating duplicate rows and test it.

**Done when:** a user can create/view/delete only their own consented records from the actual UI and API.

### Task 21 — Add safe demo seed/reset commands and setup instructions

- [ ] Add `python -m app.db.seed` with deterministic fake data only; make repeated seed behavior clear and safe.
- [ ] Add `python -m app.db.reset` scoped to the configured local database with an explicit destructive confirmation or equally clear guard.
- [ ] Ensure database files, tokens and `.env` secrets are ignored and not staged/committed.
- [ ] Document exact migration, seed, reset, backend, frontend and test commands here in this consolidated plan.

**Done when:** demo data can be recreated locally and reset cannot accidentally target a shared/production database.

### Task 22 — Finish history/privacy tests and handoff

- [ ] Test two-user isolation for list/get/delete-one/delete-all; test consent-required save and no raw media persistence.
- [ ] Test deletion behavior, retry/idempotency if agreed, temporary upload cleanup on success/failure, and migration from an empty DB.
- [ ] Update this consolidated doc with actual modules, route paths, environment variable names, migration commands, demo account instructions and known limitations.
- [ ] Run all backend and frontend checks and fix failures before marking the task complete.

**Done when:** privacy/ownership tests pass, the frontend uses real auth/history APIs, and another teammate can follow this document to run the full demo.

### Task 23 — Prepare a clean local setup

- [ ] From a clean checkout, install backend dependencies with `uv sync`, create ignored backend `.env` from `.env.example`, install frontend dependencies, and create ignored frontend `.env` from `.env.example`.
- [ ] Apply migrations from an empty local DB; seed only fake demo data if the teacher walkthrough needs it.
- [ ] Verify frontend mock mode is off for the live demo and required provider settings are present without printing secrets.

### Task 24 — Run the complete teacher-demo walkthrough

- [ ] Start backend and frontend in separate terminals using commands below.
- [ ] Demonstrate registration/login if implemented; submit each claimed modality; explain real provider versus baseline honestly; show coach if in scope.
- [ ] Demonstrate processing consent and separate history-save choice; show saved history, ownership, deletion and sign-out if auth/history are included.
- [ ] Demonstrate at least one validation/error/unavailable state and how the UI recovers. Do not expose secrets or use real private media in the presentation.

### Task 25 — Complete final verification and acceptance report

- [ ] Run backend tests, migration checks, frontend tests, lint and production build from documented commands.
- [ ] Complete manual responsive, keyboard and main-flow checks (F1/F2).
- [ ] Record the final result in a concise teacher-ready acceptance report with actual environment, checks and known limitations; only mark a flow passing if observed working end-to-end.

**Project demo-ready when Vedant has completed Tasks 1–25:** a clean local setup starts both services; the UI uses the live API; every advertised flow works or is explicitly labeled as a baseline; consent and history privacy behave as described; tests/build pass; and the team can explain limitations honestly. This is a local MVP demo criterion, not a production deployment certification.

## Run commands

Run each service in its own terminal. From the repository root:

Backend terminal:

```bash
cd backend
uv sync
cp .env.example .env  # edit local values as required; never commit .env
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend checks, from `backend/`:

```bash
uv run pytest
uv run alembic check
```

Frontend terminal:

```bash
cd frontend
npm install
cp .env.example .env  # confirm mock mode is disabled and API URL is correct
npm run dev
```

Frontend quality checks, from `frontend/`:

```bash
npm test
npm run lint
npm run build
```

Open `http://localhost:5173`; API docs are at `http://127.0.0.1:8000/docs`, and health is at `http://127.0.0.1:8000/health`. Use fake demo accounts/data only. Never commit `.env`, database files, provider credentials, or real user media.
