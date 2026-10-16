# EmotionIQ Backend Implementation Plan

This plan turns the existing React mock contract into a production-shaped FastAPI backend without forcing model, database, or authentication decisions too early.

## Locked local-development decisions

These decisions close the planning questions for the first implementation:

- **Runtime:** FastAPI + Python.
- **Execution:** The API runs on each developer's Mac at `localhost:8000`.
- **Frontend access:** The Vite app runs on the same Mac at `localhost:5173`; LAN access is not required.
- **Inference:** External inference is acceptable, but all providers stay behind provider-neutral adapters.
- **Credentials:** Each developer keeps their own provider keys in an untracked local `.env` file.
- **Database:** SQLite is the local database. Each developer has a separate local database file.
- **Schema workflow:** SQLAlchemy models plus Alembic migrations are the source of truth; SQLite files are generated locally and never committed.
- **Team sync:** Git shares migrations, schema code, seed scripts, and application code, but never the SQLite database file or secrets.
- **Authentication:** Add register and login endpoints with hashed passwords and JWTs.
- **Analysis access:** Analysis can be anonymous. Login is required when saving history.
- **History:** Saving is opt-in and stores structured results only; raw media is never stored.
- **Upload lifecycle:** Keep uploads in memory where possible, use temporary files only when required, and delete them immediately after processing.
- **Model order:** Implement and verify text inference first, then image, then audio.

External inference means submitted content may leave the local machine. The UI and backend must disclose the selected provider and require appropriate processing consent before making an external model request.

## Recommended AI provider: Hugging Face

Hugging Face is a platform for open-source AI models, datasets, and inference tools. It is similar to GitHub, but focused on machine-learning models.

For this student project, Hugging Face is the recommended starting point because it provides existing text, image, and audio models without requiring us to train models from scratch.

### Recommended model candidates

| Modality | Candidate model | Purpose |
|---|---|---|
| Text | `j-hartmann/emotion-english-distilroberta-base` | Estimate emotion-related wording cues. |
| Image | `dima806/facial_emotions_image_detection` | Estimate visible facial-expression categories. |
| Audio | `ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition` | Estimate vocal emotion cues. |

### Provider strategy

- Hide Hugging Face behind `TextProvider`, `ImageProvider`, `AudioProvider`, and `CoachProvider` interfaces.
- Start with Hugging Face hosted inference only if the free quota and model availability are sufficient.
- Keep deterministic local fallback providers for development and provider outages.
- Prefer local model execution later if hosted quotas, cold starts, or privacy requirements become a problem.
- Never expose Hugging Face tokens in the frontend.
- Document that hosted inference may send submitted content outside the local machine.

Free hosted inference is not guaranteed to be unlimited or permanently available. The application must show a useful unavailable state instead of inventing a prediction when a provider fails.

## Three-person work division

The work is divided by ownership area, with shared interfaces agreed before parallel implementation.

### Person 1 - vedant : Backend foundation, database, and security

Owns the FastAPI service and local data layer.

- Create the backend project structure and Python environment.
- Configure FastAPI, Uvicorn, settings, CORS, and error handling.
- Implement `/health`.
- Configure SQLAlchemy and SQLite.
- Configure Alembic migrations.
- Add `.gitignore` rules for `.env`, `*.db`, and `*.sqlite`.
- Implement register, login, JWT, password hashing, and authentication dependencies.
- Add opt-in history tables and ownership rules.
- Add seed and reset commands.
- Write validation and authentication tests.

**Handoff:** Provide stable database models, migration commands, auth dependencies, and configuration names to the other two people.

### Person 2: AI providers, model adapters, and fusion

Owns model integration without changing route contracts.

- Implement the provider interfaces.
- Evaluate Hugging Face model candidates for text, image, and audio.
- Implement text inference first.
- Implement image and audio inference after text is stable.
- Normalize every provider result to label, confidence, and explanation.
- Add provider timeout and unavailable handling.
- Implement confidence-aware late fusion.
- Implement mismatch detection and non-diagnostic explanations.
- Implement coach provider behavior and deterministic fallback.
- Write provider and fusion unit tests.

**Handoff:** Provide tested provider services that accept typed inputs and return the agreed schemas without route-specific logic.

### Person 3: API routes, frontend integration, and acceptance testing

Owns the connection between the backend contract and the React application.

- Implement `POST /analyze` using the agreed multipart field names.
- Implement `POST /coach` using the agreed JSON body.
- Add file type, file size, text length, and empty-request validation.
- Connect the frontend with mock mode disabled.
- Map backend error codes to readable UI messages.
- Add request timeout and network failure handling.
- Test text-only, image-only, voice-only, and multimodal flows.
- Verify login, consent, saved history, deletion, retry, and unavailable states.
- Update setup documentation and local run instructions.
- Run final lint, type checks, backend tests, frontend tests, and manual responsive checks.

**Handoff:** Provide an end-to-end local demo and an acceptance report showing each supported flow.

### Shared rules for all three people

- Do not commit `.env` files, API keys, SQLite files, uploaded media, or model caches.
- Do not change the public API response shape without agreement from all three people.
- Pull the latest branch before creating migrations or changing shared schemas.
- Run `alembic upgrade head` after pulling migration changes.
- Add tests with every behavior change.
- Use Git branches or clearly separated commits per task.
- Review privacy wording before connecting any external AI provider.

### Suggested implementation order

1. Person 1 scaffolds FastAPI, SQLite, Alembic, and `/health`.
2. Person 2 defines provider interfaces and implements the text baseline.
3. Person 3 implements `/analyze` and connects the text-only frontend flow.
4. Merge and test the text path end to end.
5. Add image and audio providers one at a time.
6. Add fusion, coach, JWT history, and final hardening.

## Planning status

The local backend architecture is considered planning-complete. The remaining provider choice is intentionally deferred until the text integration milestone compares cost, privacy terms, supported modalities, quotas, and output quality.

The team database workflow is fixed:

```text
SQLAlchemy model change
  -> Alembic migration
  -> Commit migration text to Git
  -> Teammate pulls the migration
  -> alembic upgrade head
  -> Local SQLite schema reaches the same version
```

Migrations synchronize schema version, not database rows. Each developer keeps independent local users, history, and test data.

## Backend goals

The backend must:

- Accept text, image, audio, or any combination of the three.
- Validate every request before model execution.
- Return a stable response shape that the current frontend already understands.
- Keep model calls behind small adapters so models can be replaced independently.
- Use explainable, confidence-aware late fusion.
- Treat outputs as estimates from observable cues, never as diagnoses or proof of internal emotion.
- Avoid retaining raw media by default.
- Provide useful errors, request IDs, health checks, logs, and tests.
- Make authentication and persistent history optional extensions rather than blockers for the first working API.

## Recommended first architecture

```text
backend/
  app/
    main.py                 # FastAPI application and middleware
    config.py               # environment settings
    api/
      routes.py             # /health, /analyze, /coach
      schemas.py            # request and response models
    services/
      analysis_service.py   # orchestration for one analysis request
      coach_service.py      # conversation coach orchestration
      fusion_service.py     # confidence-aware late fusion
      mismatch_service.py   # non-diagnostic cue comparison
    models/
      base.py               # model adapter protocols
      text.py               # text provider
      image.py              # image provider
      audio.py              # audio provider
      coach.py              # coach provider
    infrastructure/
      storage.py            # temporary-file lifecycle, no persistence by default
      logging.py            # structured request logging
    tests/
      test_health.py
      test_analyze_api.py
      test_coach_api.py
      test_validation.py
      test_fusion.py
  pyproject.toml
  .env.example
  README.md
```

The first implementation may use deterministic or lightweight providers behind the same adapter interfaces. Real pretrained models can then be introduced one modality at a time.

## API contract

### `GET /health`

Returns a small readiness response for local development and deployment checks:

```json
{
  "status": "ok",
  "version": "0.1.0",
  "models": {
    "text": "ready",
    "image": "ready",
    "audio": "ready",
    "coach": "ready"
  }
}
```

A model that is unavailable should be reported as `unavailable`, while the process itself remains healthy if the API can still serve partial requests.

### `POST /analyze`

Content type: `multipart/form-data`.

| Field | Type | Required | Constraints |
|---|---|---:|---|
| `text` | string | No | Trimmed; define a maximum, recommended 10,000 characters. |
| `image` | file | No | JPEG, PNG, or WEBP; maximum 5 MB. |
| `audio` | file | No | MP3, WAV, OGG, or WEBM; maximum 10 MB. |

At least one field must be supplied. Empty strings and zero-byte files do not count as input.

Success response:

```json
{
  "requestId": "uuid",
  "modalities": {
    "text": {
      "label": "Calm",
      "confidence": 0.76,
      "explanation": "Brief explanation based on observable wording cues."
    },
    "image": null,
    "audio": null
  },
  "summary": "This message is estimated to sound calm based on observable wording cues.",
  "improvement": "Add the intended outcome or next step if a response is needed.",
  "mismatch": {
    "detected": false,
    "description": ""
  },
  "suggestion": null
}
```

Contract rules:

- Always return `text`, `image`, and `audio` keys under `modalities`.
- Use `null` when a modality was not supplied or could not be processed.
- Keep every confidence in the inclusive range `0.0` to `1.0`.
- Do not return a result for a modality that failed validation.
- Keep mismatch descriptions observational and non-diagnostic.
- `requestId` is generated by the backend and is safe to expose to the user.

### `POST /coach`

Content type: `application/json`.

```json
{
  "text": "Please send the report.",
  "style": "formal"
}
```

Allowed styles: `light`, `strict`, `happy`, `sad`, `formal`, and `informal`.

Success response:

```json
{
  "requestId": "uuid",
  "originalText": "Please send the report.",
  "style": "formal",
  "reframedText": "Please be advised that the report is requested. Your attention to this matter would be appreciated.",
  "explanation": "The sentence was adjusted toward a formal delivery while keeping the original intent as closely as possible."
}
```

The coach must not invent facts, change the requested intent, or present generated wording as objectively better.

## Delivery phases

### Phase 0: Confirm the local backend boundary

- Pin the Python version and package manager used by all three developers.
- Confirm the external providers and review their data-processing terms.
- Choose one configuration source using environment variables.
- Confirm model licensing and provider limits.
- Freeze the response schemas above before connecting the frontend.

**Done when:** the team has recorded decisions for runtime, model execution, auth, storage, and deployment target.

### Phase 1: Scaffold a runnable FastAPI service

- Create the `backend/` structure.
- Add FastAPI, Uvicorn, Pydantic Settings, SQLAlchemy, Alembic, `python-multipart`, Pillow, and test dependencies.
- Add the initial SQLAlchemy database configuration and SQLite session lifecycle.
- Add an initial Alembic revision and verify it can create the local database from an empty directory.
- Add `GET /health`.
- Add CORS for the local Vite origin only in development.
- Add a global exception format with `requestId` and a readable `message`.
- Add `/docs` for local API inspection.
- Add `.env.example` without secrets.

**Tests:** health response, CORS behavior, startup, migration from an empty database, and a smoke request through Uvicorn.

**Done when:** the service starts with one documented command, a clean developer can create the SQLite schema with Alembic, and the frontend can reach `/health` locally.

### Phase 2: Implement schemas and strict request validation

- Define Pydantic response models for modality results, mismatch, analysis response, and coach response.
- Validate text length after trimming.
- Validate multipart file size before decoding.
- Validate declared MIME type and inspect file signatures where practical; never trust the filename alone.
- Decode images with Pillow and reject malformed images.
- Add an audio validation strategy that does not require storing uploads permanently.
- Reject empty requests with HTTP 422.
- Return consistent 413 errors for oversized uploads and 415 errors for unsupported types.
- Ensure temporary files are deleted in `finally` blocks.

**Tests:** missing input, whitespace text, oversized files, invalid MIME types, malformed image bytes, and valid boundary values.

**Done when:** invalid requests fail before model execution and no upload remains after the request completes.

### Phase 3: Add provider interfaces and deterministic baseline models

Define one interface per provider:

```text
analyze_text(text) -> ModalityResult
analyze_image(image_bytes) -> ModalityResult
analyze_audio(audio_bytes) -> ModalityResult
rewrite_text(text, style) -> CoachResult
```

- Start with deterministic baseline providers or small local models.
- Keep provider output normalized to `label`, `confidence`, and `explanation`.
- Return a typed unavailable result when a model is not installed or cannot process a sample.
- Do not let provider-specific exceptions leak into the API.
- Record provider name and model version in internal logs, not necessarily in the public response.

Suggested sequence:

1. Text provider first, because it has the lowest infrastructure cost.
2. Image provider with explicit image quality and face-detection handling.
3. Audio provider after deciding on FFmpeg/librosa/torchaudio requirements.
4. Coach provider last, with a deterministic fallback for development.

**Done when:** each provider can be tested in isolation and can be swapped without changing route code.

### Phase 4: Orchestrate analysis and implement fusion

- Run only the providers for modalities supplied by the client.
- Keep independent modality results even when fusion is unavailable.
- Implement explainable late fusion using normalized confidence-weighted votes.
- Define a minimum confidence threshold for calling cues meaningfully aligned.
- Detect possible mismatch only when at least two usable modalities disagree.
- Return `detected: false` with an empty description when there is no mismatch.
- Generate summary, improvement, and suggestion text from observable cues.
- Ensure one provider failure does not erase successful results from other modalities.
- Do not label a mismatch as deception, lying, diagnosis, or proof of hidden emotion.

**Tests:** text-only, image-only, audio-only, all combinations, matching cues, conflicting cues, unavailable provider, and low-confidence results.

**Done when:** the response is deterministic for test fixtures, preserves partial success, and matches the frontend contract exactly.

### Phase 5: Connect the frontend and test the real request path

- Set `VITE_USE_MOCK_ANALYSIS=false` and `VITE_API_BASE_URL=http://localhost:8000` locally.
- Verify multipart field names match `text`, `image`, and `audio`.
- Verify the frontend renders `null` modalities as missing rather than inventing output.
- Map backend errors to readable UI states.
- Add timeout and network failure handling in the frontend client.
- Confirm retry does not duplicate successful history entries.
- Add an integration test that submits a real multipart request to the backend test app.

**Done when:** one text, one image, one voice, and one multimodal request work through the real API without mock mode.

### Phase 6: Add the Coach endpoint

- Validate non-empty text and the six allowed styles.
- Keep input length limits consistent with `/analyze`.
- Preserve original intent and return the original text in the response.
- Add deterministic fallback behavior if an external generation provider is unavailable.
- Add provider timeout, output length, and unsafe-output checks.

**Done when:** every supported style returns a valid response and invalid styles produce a clear 422 response.

### Phase 7: Add local accounts and opt-in history

Do this only after anonymous analysis is reliable. SQLite is appropriate for this local-only phase, but the database file must remain developer-local.

- Add SQLite migrations and a seed/reset command.
- Add register, login, refresh, and logout behavior as appropriate for the frontend flow.
- Store structured results, timestamps, request IDs, and user IDs.
- Do not store raw image/audio bytes by default.
- Require explicit consent before saving a result.
- Enforce user ownership at the database query layer, not only in route code.
- Add delete-one and delete-all history operations.
- Add retention policy documentation.
- Never place service-role keys in the frontend.

SQLite team workflow:

1. Change the SQLAlchemy model and generate or write an Alembic migration.
2. Review the migration before committing it.
3. Commit migration files and schema changes to Git.
4. Keep `*.db`, `*.sqlite`, and local `.env` files in `.gitignore`.
5. Run `alembic upgrade head` after pulling changes.
6. Use a documented seed/reset command for reproducible development fixtures, never real credentials.
7. Do not place the SQLite file on a shared drive or expect Git merges to synchronize its rows.

Required local commands:

```bash
alembic upgrade head                 # Apply all pending schema changes
alembic revision --autogenerate -m "describe change"  # Create a migration
python -m app.db.seed                 # Optional reproducible demo data
python -m app.db.reset                # Delete and recreate local data
```

**Done when:** two local users cannot read each other's records, deletion is test-covered, migrations can recreate the database, and raw media is absent from stored records.

### Phase 8: Local hardening and optional future deployment

- Pin dependencies and scan them regularly.
- Add structured logs with request ID, latency, provider status, and error category.
- Exclude text content, raw media, tokens, and secrets from logs.
- Add request timeouts, concurrency limits, upload limits, and rate limiting.
- Configure development CORS for `http://localhost:5173` only.
- Add readiness checks that distinguish API health from model readiness.
- Add monitoring for error rate, latency, model availability, and request volume.
- Document model licenses, dataset licenses, known limitations, and deletion behavior.
- Add a CI workflow for formatting, type checking, tests, and a production container build.
- Keep hosted deployment, HTTPS termination, and shared PostgreSQL as future work unless the project scope changes.

**Done when:** each developer can recreate the local service from a clean checkout, provider failures are visible, and no local secret or database file is committed.

## Error response standard

Use one shape for expected API errors:

```json
{
  "requestId": "uuid",
  "message": "The audio file is larger than the 10 MB limit.",
  "code": "FILE_TOO_LARGE",
  "details": null
}
```

Recommended codes:

- `INVALID_INPUT`
- `NO_MODALITY_PROVIDED`
- `UNSUPPORTED_MEDIA_TYPE`
- `FILE_TOO_LARGE`
- `MALFORMED_MEDIA`
- `MODEL_UNAVAILABLE`
- `MODEL_TIMEOUT`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

Public messages should be actionable. Internal stack traces belong in server logs only.

## Security and privacy rules

- Treat uploaded files and text as untrusted input.
- Validate both size and content before model calls.
- Never execute, render, or persist uploaded content unnecessarily.
- Keep raw media in memory or a short-lived temporary location, then delete it.
- Do not log raw text, filenames, image bytes, audio bytes, authorization headers, or secrets.
- Keep model/API/database credentials in backend environment variables.
- Restrict CORS to known frontend origins.
- Require JWT authentication before enabling persistent user history.
- Make consent specific to processing and, separately, to saving history.
- Document that emotion estimates can be inaccurate across cultures, accents, image quality, disability, and context.

## Testing strategy

### Unit tests

- Request and response schema validation.
- File signature and size validation.
- Text, image, audio, and coach providers.
- Confidence normalization.
- Fusion and mismatch rules.
- Error mapping and request ID generation.

### API tests

- Health endpoint.
- All valid modality combinations.
- Invalid and oversized uploads.
- Partial model failure.
- Coach styles and invalid styles.
- CORS and error response shape.

### Integration tests

- Real FastAPI test client with provider dependencies overridden by fixtures.
- Frontend client against the backend test app.
- No raw media retained after analysis.
- Retry and timeout behavior.

### Manual acceptance checklist

- Start backend and frontend with documented commands.
- Run text-only, image-only, voice-only, and multimodal requests.
- Confirm loading, success, unavailable, validation, timeout, and retry states.
- Confirm request IDs appear in results and logs without exposing private content.
- Confirm backend shutdown or model failure produces a useful frontend message.
- Confirm mobile and desktop results remain readable.

## Environment variables

Start with:

```text
APP_ENV=development
APP_VERSION=0.1.0
CORS_ORIGINS=http://localhost:5173
MAX_TEXT_LENGTH=10000
MAX_IMAGE_BYTES=5242880
MAX_AUDIO_BYTES=10485760
MODEL_DEVICE=cpu
TEXT_MODEL_NAME=baseline
IMAGE_MODEL_NAME=baseline
AUDIO_MODEL_NAME=baseline
COACH_PROVIDER=baseline
DATABASE_URL=sqlite:///./data/emotioniq.db
AUTH_ENABLED=true
```

Add provider API keys only when a real provider is selected. Keep `.env` untracked and commit only `.env.example`.

## Definition of backend MVP complete

The first backend milestone is complete when:

- FastAPI starts from a clean checkout.
- `/health`, `/analyze`, and `/coach` are documented and tested.
- The frontend works with mock mode disabled.
- All input combinations produce the documented response shape.
- Invalid media is rejected before model execution.
- Partial modality failure remains understandable.
- Results use estimate language and non-diagnostic mismatch wording.
- Raw uploads are not retained by default.
- Automated tests cover validation, providers, fusion, and routes.
- Configuration, local setup, migration commands, and known model limitations are documented.

External model APIs are part of this local development plan, but their credentials and network calls remain backend-only. Shared hosting, HTTPS deployment, and PostgreSQL are future milestones, not prerequisites for proving the core local backend flow.
