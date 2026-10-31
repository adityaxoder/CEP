# EmotionIQ — User & History Schema and Privacy Contract (Task 2)

Status: **approved by Vedant (sole owner of backend and frontend)**. Implementation proceeds in Tasks 11–17.
Based on the current repo: `backend/app/db/base.py` (empty `Base`), Alembic revision `32fb52418b52` (no tables yet), `DATABASE_URL=sqlite:///./data/emotioniq.db`, `AUTH_ENABLED=true`.

## 1. Decisions at a glance

| Topic | Decision |
|---|---|
| Account identifier | **Email address** only (no separate username) |
| Normalization | Strip whitespace, Unicode NFKC, lowercase; max 254 chars; basic format check |
| Uniqueness | Unique index on the normalized email |
| Password | 8–128 characters; stored only as an **argon2id** hash; never returned or logged |
| Session | `Authorization: Bearer <JWT>`, 60-minute expiry, no refresh token; logout = frontend discards the token |
| Anonymous use | `/analyze`, `/coach`, `/health` work without login. Saving history requires login |
| IDs | Random UUID4 strings (TEXT in SQLite) for users and history rows |
| Timestamps | UTC, timezone-aware, ISO-8601 in the API (`2026-10-31T15:30:00Z`) |
| History ordering | **Newest first** (highest display number first) |
| Display number | Per-user, starts at 1, monotonic, **never reused or renumbered** |
| Raw data | Raw image/audio **never** persisted. Raw submitted text **not** persisted |

## 2. Tables

### `users`

| Column | Type | Rules |
|---|---|---|
| `id` | TEXT (UUID4) | PK |
| `email` | TEXT | NOT NULL, UNIQUE, stored normalized |
| `password_hash` | TEXT | NOT NULL, argon2id |
| `is_active` | BOOLEAN | NOT NULL, default true |
| `next_history_number` | INTEGER | NOT NULL, default 1. Counter used to allocate display numbers |
| `created_at` | DATETIME (UTC) | NOT NULL, server-set |

### `history`

| Column | Type | Rules |
|---|---|---|
| `id` | TEXT (UUID4) | PK |
| `user_id` | TEXT | NOT NULL, FK → `users.id`, `ON DELETE CASCADE`, indexed |
| `request_id` | TEXT | NOT NULL. The technical `requestId` returned by `/analyze` |
| `display_number` | INTEGER | NOT NULL, ≥ 1 |
| `source_label` | TEXT | NOT NULL, CHECK in (`Text`,`Image`,`Audio`,`Multimodal`) |
| `status` | TEXT | NOT NULL, CHECK in (`ok`,`partial`) — only successful analyses are saved |
| `result_json` | JSON/TEXT | NOT NULL. Structured result only (see §4) |
| `history_consent` | BOOLEAN | NOT NULL, CHECK = true (a row cannot exist without consent) |
| `schema_version` | INTEGER | NOT NULL, default 1 (lets the result shape evolve) |
| `created_at` | DATETIME (UTC) | NOT NULL. Also the consent timestamp |

Constraints and indexes:

- `UNIQUE (user_id, display_number)` — numbering is scoped per user.
- `UNIQUE (user_id, request_id)` — makes a save retry idempotent (no duplicate row, no extra number).
- Index `(user_id, display_number DESC)` for the list query.
- **No columns** for raw text, image bytes, audio bytes, filenames or IPs.

### Display-number allocation

Inside one transaction: `UPDATE users SET next_history_number = next_history_number + 1 WHERE id = :uid RETURNING next_history_number - 1`, then insert the history row with that value. Because the counter lives on the user row and only increases, deleting records never frees or reuses a number, and concurrent saves cannot get the same number (the unique constraint is the safety net). A failed analysis never reaches this code, so it never consumes a number. Unsaved session results use a front-end session counter (**"Session #n"**, may reset on refresh) and are visibly distinct from saved numbers.

## 3. Consent representation

Two **separate** booleans, never merged:

| Field | Where | Meaning | Server behavior |
|---|---|---|---|
| `processingConsent` | `/analyze` multipart form field | User agrees data may be sent to an external provider | Missing/false → no external call; request rejected with `CONSENT_REQUIRED` (422) for external-processed modalities |
| `saveToHistory` | `/analyze` multipart form field | User opts in to saving this result | Missing/false → analysis returned, nothing stored |

Stored consent: only `history.history_consent = true` plus `created_at`. Declined consent leaves no row. Declining history never blocks analysis.

## 4. What is retained (and what is not)

**Retained per saved analysis** (`result_json`, schema_version 1):

- `requestId`, `sourceLabel`, `submittedModalities` (e.g. `["text","image"]`), `status`, `createdAt`
- per modality: `modality`, `tone`, `mood`, `confidence`, `evidence` (generated rationale), `providerMode` (`real`/`baseline`), `providerName`, `status` (`ok`/`inconclusive`/`unavailable`)
- `consistency`: `verdict` (`Consistent`/`Possible contradiction`/`Inconclusive`), `modalities`, `explanation`
- `unavailableModalities` with a safe reason code

**Never retained:** raw image, raw audio, filenames, transcripts, passwords (only hash), tokens, provider API keys, provider exception text.
**Raw submitted text:** not stored. The `evidence` field must be generated rationale and **must not copy the submitted text verbatim**. Storing text would need a separate, explicit team approval and a new schema version.

## 5. Retention, deletion and cascade

- Records are kept until the owner deletes them. There is no automatic expiry in the MVP.
- Delete one: `DELETE /history/{id}`. Delete all: `DELETE /history`. Both are owner-scoped inside the SQL `WHERE user_id = :current_user`.
- Deleting a record never changes other records' numbers.
- Deleting a user row cascades to all of that user's history (`ON DELETE CASCADE`; SQLite needs `PRAGMA foreign_keys=ON`, set in the session factory in Task 14). There is no account-deletion route in the demo; cascade is defined and tested at the DB level.
- Access to another user's record returns `404 HISTORY_NOT_FOUND` (not 403) so IDs cannot be probed.

## 6. Routes and authentication

| Route | Auth | Purpose |
|---|---|---|
| `GET /health` | none | Liveness + provider readiness |
| `POST /analyze` | optional | Anonymous allowed. With a valid token and `saveToHistory=true`, the result is saved in the same call |
| `POST /coach` | none | `{text, style}` |
| `POST /auth/register` | none | `{email, password}` → `{user:{id,email,createdAt}, accessToken, tokenType:"bearer", expiresIn}` |
| `POST /auth/login` | none | `{email, password}` → same shape |
| `GET /auth/me` | **required** | Returns `{id,email,createdAt}` |
| `POST /history` | **required** | Retry-save: `{requestId, result}`. Idempotent per `(user, requestId)`. Validates `result` against the schema; does not re-run inference |
| `GET /history` | **required** | List summaries |
| `GET /history/{id}` | **required** | Full saved detail |
| `DELETE /history/{id}` | **required** | Delete one |
| `DELETE /history` | **required** | Delete all of the caller's records |

If `AUTH_ENABLED=false` (dev only), history routes are disabled (`503 HISTORY_DISABLED`) rather than running unscoped.

### `/analyze` response additions

```json
{
  "requestId": "…",
  "sourceLabel": "Multimodal",
  "…": "per-modality results and consistency as in the output contract",
  "historySave": { "status": "saved|not_requested|failed", "historyId": "…", "displayNumber": 4 }
}
```
A save failure never removes the inline result: the analysis returns HTTP 200 with `historySave.status="failed"` and a safe `code`; the UI offers retry via `POST /history`. Anonymous + `saveToHistory=true` returns `historySave.status="failed"`, `code="AUTH_REQUIRED"`.

### List item (summary)

```json
{ "id":"…", "displayNumber":4, "label":"Analysis #4 · Image", "sourceLabel":"Image",
  "status":"ok", "createdAt":"2026-10-31T15:30:00Z" }
```

### Pagination

`GET /history?limit=20&before=<displayNumber>` — `limit` default 20, max 100; ordered newest first; response `{items:[…], nextBefore:<number|null>}`.

## 7. Error codes (shared public shape `{requestId, message, code, details}`)

`VALIDATION_ERROR` 422 · `EMAIL_TAKEN` 409 · `INVALID_CREDENTIALS` 401 (same message for unknown email and wrong password) · `AUTH_REQUIRED` 401 · `TOKEN_EXPIRED` 401 · `TOKEN_INVALID` 401 · `CONSENT_REQUIRED` 422 · `HISTORY_NOT_FOUND` 404 · `HISTORY_DISABLED` 503 · `SAVE_FAILED` (reported inside `historySave`).

## 8. Migrations

Naming: Alembic `--autogenerate -m "<verb_object>"`, one concern per revision, chained after `32fb52418b52`:

1. `add_users_table` (Task 11/12)
2. `add_history_table` (Task 14)

Each must upgrade from an empty DB and pass `uv run alembic check`. Models live in `backend/app/db/models.py` (imported by `alembic/env.py` for metadata discovery).

## 9. Frontend responsibilities

- Store the access token in `sessionStorage` (cleared when the tab closes); send as `Authorization: Bearer`. On 401 `TOKEN_EXPIRED`, return to login.
- Always send `processingConsent` and `saveToHistory` as separate fields from two separate UI controls.
- Render the inline result from the `/analyze` response; show `historySave` status separately with a retry button that calls `POST /history`.
- Label unsaved results "Session #n (not saved)"; label saved results from `label` in the list.
- Never present local/mock state as backend-backed history.

## 10. Sign-off

- [x] Vedant approved (owner of both backend and frontend).
- [ ] Changes after approval are recorded here with a date.
