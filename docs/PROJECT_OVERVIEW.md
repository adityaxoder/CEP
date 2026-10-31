# EmotionIQ — Project Overview (for Report & PPT)

---

## 1. One-line summary

**EmotionIQ** is a web application that reads the *tone and mood* of a person's **text, face photo, or voice recording** (or all three together), explains *why*, and checks whether the signals **agree or contradict**. It also includes a **Coach** that rewrites a message in a style the user chooses.

## 2. Problem and goal

- Messages lose emotional context. The words can say "I'm fine" while the voice sounds sad.
- EmotionIQ gives users an **estimate** of the tone and mood in their communication, with evidence and honest uncertainty, and flags mismatches between text, face and voice.
- It gives **estimates, not diagnoses**. It never claims to know a person's real feelings.

## 3. Features

| Feature | What the user does | What they get |
|---|---|---|
| **Text analysis** | Types or pastes a message | Tone, mood, confidence, short evidence |
| **Image analysis** | Uploads a face photo | Apparent expression cues and a tone/mood estimate (demo estimate) |
| **Voice analysis** | Uploads an audio clip | Vocal tone/mood estimate (demo estimate) |
| **Multimodal analysis** | Gives text + image + voice together | Each result separately, plus a **cross-modal consistency** check |
| **Coach** | Gives text and a desired style (professional, friendly, concise, empathetic) | Rewritten text with short tips on what changed |
| **Analysis history** | Opts in to save results | Numbered list ("Analysis #4 · Image"); any item opens in full detail |
| **Accounts** | Registers and signs in | Private history that only the owner can see |
| **Settings / New Analysis / Reset** | Uses the controls | Easy navigation and clean restarts |

## 4. How a user uses it (step by step)

1. Open `http://localhost:5173`, then register or sign in.
2. Pick a tab: **Text, Image, Voice, Multimodal, Coach, Analysis, History, Settings**.
3. Enter the input and tick **processing consent**. The screen states which provider receives the data and whether it leaves the computer.
4. Optionally tick **save to history** (a separate choice).
5. Press **Analyse**. A loading state appears.
6. The result appears **directly below the form** on the same screen and shows:
   - Analysis number and source label (Text / Image / Audio / Multimodal), time and status
   - Per-modality tone and mood, confidence and evidence
   - For multimodal input: **Consistent / Possible contradiction / Inconclusive**, naming the modalities involved
   - Unavailable or failed modalities, shown honestly and never invented
7. Saved results also appear in **Analysis history**. Opening one shows the same saved result and does **not** re-run the analysis.

## 5. What the result looks like

Every modality uses one common shape:

`modality · tone · mood · evidence · confidence/uncertainty · provider/mode label · status`

- **Status** is `ok`, `inconclusive` or `unavailable`.
- **Tone** = how it comes across (warm, formal, sarcastic, frustrated, neutral, mixed).
- **Mood** = the emotional impression (cheerful, worried, sad, and so on).
- **Inconclusive** is shown when evidence is weak: low confidence, tied labels, empty or too-short input, no face, silent audio, or an unusable file.
- Example contradiction: the text says "I'm delighted" but the voice sounds sad. The app reports that the text wording and vocal delivery appear to differ.

## 6. System architecture

```
 Browser (React + Vite, port 5173)
        │  JSON / multipart requests
        ▼
 FastAPI backend (port 8000)
   ├─ Routes: /analyze  /coach  /health  /auth/*  /history/*
   ├─ Validation: size limits, file type + signature, consent check
   ├─ Providers
   │    ├─ Text  → Hugging Face model (real inference)
   │    ├─ Image → baseline (demo estimate)
   │    ├─ Audio → baseline (demo estimate)
   │    └─ Coach → deterministic rewrite
   ├─ Fusion service: confidence-weighted late fusion + consistency check
   └─ SQLite database (SQLAlchemy + Alembic): users, saved history
```

**Request flow for `/analyze`:** the frontend sends `text`, `image`, `audio` and consent. The backend validates the input (streaming size limit, file signature). Each provider runs on its own. The fusion service combines the usable results. The backend returns one structured result with a request ID, the frontend renders it, and if the user consented and is signed in, it is saved.

## 7. Technology used

| Layer | Tools |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, lucide-react icons, Vitest, ESLint |
| Backend | Python 3.12, FastAPI, Uvicorn, Pydantic Settings, python-multipart, Pillow |
| Database | SQLite, SQLAlchemy 2, Alembic migrations |
| Security | Password hashing, JWT bearer tokens, CORS, request IDs |
| AI | Hugging Face Inference Providers via `huggingface_hub` |
| Testing | pytest (backend), Vitest (frontend) |
| Tooling | `uv` (Python), `npm` |

## 8. AI / model details

| Modality | Method | Type |
|---|---|---|
| Text | `j-hartmann/emotion-english-distilroberta-base` (fine-tuned DistilRoBERTa) | Real model inference |
| Image | Heuristic baseline | Demo estimate |
| Voice | Heuristic baseline | Demo estimate |
| Coach | Deterministic template rewrite | Rule-based |

Text model facts:
- Predicts 7 emotions: anger, disgust, fear, joy, neutral, sadness, surprise.
- Trained on 6 datasets (Twitter, Reddit, self-reports, TV dialogue), about 20k balanced examples.
- The model card reports **66% accuracy** (chance is 14%) on its own held-out split.
- English only. Cite: Hartmann, J. (2022), *Emotion English DistilRoBERTa-base*.
- The score is a classifier score, not a calibrated probability.
- It runs on Hugging Face servers using a backend-only token.

**Fusion:** each usable modality's confidence is normalized and used as a vote weight. Results below a minimum-confidence threshold are excluded. A mismatch is reported only when **two or more usable** estimates disagree. With fewer than two usable results, the app says there is not enough evidence to compare.

Image and voice are clearly labeled **demo estimates** in the interface and in every result.

## 9. Privacy, consent and security

- **Processing consent** is enforced by the server, not just a checkbox. It is required before data goes to an external provider.
- **History-save consent** is separate. Declining it does not block analysis.
- **Stored in history:** structured result, timestamp, request ID and owner ID only. **Raw images and audio are never stored.** Raw text is not stored by default.
- **Per-user privacy:** every history query is filtered by the logged-in owner inside the database query itself.
- Users can **delete** one record or all records at any time. Analysis numbers are never reused or renumbered.
- Passwords are stored only as hashes. Tokens, passwords and submitted content are kept out of logs.
- Secrets live only in the ignored backend `.env`.
- Upload limits (default): text 10,000 characters, image 5 MB, audio 10 MB, enforced while the upload is being read.
- Every error includes a `requestId`, `message`, `code` and safe `details`.

## 10. Error and edge-case handling

The app has defined outcomes for: empty input, unsupported or corrupt file, no face, multiple faces, silent audio, noisy audio, low quality, provider timeout, rate limit, provider unavailable, and partial failure (one modality fails and the others still show). It never invents a result for a missing or failed input.

## 11. Database

- **users**: id, identifier (email or username, unique, normalized), password hash, created time, active flag.
- **history**: id, request ID, owner user ID (foreign key), per-user display number (unique per user), source label, timestamp, saved structured result, consent flag.

## 12. API summary

| Route | Purpose |
|---|---|
| `GET /health` | App is alive, plus which providers are configured and usable |
| `POST /analyze` | Multipart: `text`, `image`, `audio`, consent flags → structured result |
| `POST /coach` | JSON `{text, style}` → rewritten text and tips |
| `POST /auth/register`, `POST /auth/login` | Create an account / get a token |
| `GET /history`, `GET /history/{id}`, `DELETE /history/{id}`, `DELETE /history` | List, open, delete (all require login) |
| `/docs` | Auto-generated API docs |

## 13. How to run it

Backend:
```bash
cd backend
uv sync
cp .env.example .env     # add your own Hugging Face token; never commit it
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Frontend:
```bash
cd frontend
npm install
cp .env.example .env     # mock mode OFF, API URL = http://127.0.0.1:8000
npm run dev
```
Open `http://localhost:5173`. API docs: `http://127.0.0.1:8000/docs`. Health: `http://127.0.0.1:8000/health`.
Tests: `uv run pytest`, `uv run alembic check`, `npm test`, `npm run lint`, `npm run build`.

## 14. What the project contains (summary)

- A FastAPI backend with configuration, CORS, request IDs, structured errors and a health route that reports provider readiness.
- SQLite database with Alembic migrations, user accounts and opt-in private history.
- Password hashing and JWT authentication with register and login routes.
- A real text emotion provider and clearly labeled image and voice demo estimators.
- Confidence-weighted fusion with a cross-modal consistency check.
- A Coach that rewrites text in a chosen style.
- Upload validation (streamed size limits, file signatures) and enforced processing consent.
- A React frontend with Text, Image, Voice, Multimodal, Coach, Analysis, History and Settings screens, results shown inline, and a responsive, keyboard-accessible layout.
- Automated backend and frontend tests, seed and reset commands for fake demo data, a clean local setup, and an acceptance report.

## 15. Limitations (put these in the report)

- It is a local MVP demo, not a production deployment.
- It gives estimates only. It is not clinical, not a diagnosis, and not proof of a person's feelings.
- Real model inference covers **English text**. Image and voice results are labeled demo estimates.
- The text model reports about 66% accuracy on its own test set. It is weaker on sarcasm, very short text and mixed emotion.
- The text model's license is not declared on its model card. Text is sent to Hugging Face for analysis.
- Use fake demo data only.

## 16. Suggested PPT outline (10–13 slides)

1. Title: EmotionIQ — Multimodal Tone & Mood Analyser
2. Problem: emotion gets lost in text, voice and faces
3. Goal, and what it does and doesn't claim
4. Features (text, image, voice, multimodal, coach, history)
5. User flow (screenshots: form → inline result)
6. Architecture diagram (section 6)
7. AI models: real text model vs. labeled demo estimates
8. Fusion and cross-modal consistency (use the "delighted but sad voice" example)
9. Privacy and consent (two separate consents, no raw media stored)
10. Tech stack
11. Testing and results
12. Limitations and future work (real image/audio models, more languages, deployment)
13. Demo and Q&A

## 17. Suggested report outline

1. Abstract
2. Introduction and problem statement
3. Objectives
4. Background (DistilRoBERTa, Ekman's 6 emotions, late fusion)
5. System design (architecture, data flow, database, API)
6. Implementation (frontend, backend, providers, fusion, auth, history)
7. Privacy and ethics
8. Testing and verification
9. Results (screenshots, acceptance report)
10. Limitations
11. Future work
12. Conclusion
13. References (Hartmann 2022 model card; Hugging Face Inference Providers docs; FastAPI and React docs)

## 18. Team roles

- **Vedant:** backend and frontend, covering providers, fusion, consent, authentication, history, and quality checks.
- **Person 2:** provider interface and text adapter.
- **Person 3:** `/analyze` and `/coach` contracts and frontend integration.

## 19. Screenshots to include

Text result, image result, voice result, multimodal with a contradiction, partial failure, inconclusive state, consent panel, history list, history detail, login, Coach output, the `/docs` page, and test results in the terminal.
