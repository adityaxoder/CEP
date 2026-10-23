# EmotionIQ

## Mini Software Requirements Specification

EmotionIQ is a community-centered multimodal emotion recognition system for text, voice, and images. It estimates communication tone and helps users reflect on possible misunderstandings when words, facial expressions, and vocal cues do not match.

EmotionIQ is a communication-support tool, not a diagnostic system. Its outputs are estimates based on observable cues and do not prove what a person truly feels.

**Project type:** Community Engagement / Project-Based Learning mini project

**Department:** Information Technology, MMCOE, Pune

**Guide:** Ms Asharani M. Chadchankar

**Team:** Aditya Pabalkar (SI373), Vedant Chandgude (SI366), Ayush Saigaonkar (SI369)

## Purpose and objectives

The project combines available communication cues to provide understandable, uncertainty-aware feedback. Its objectives are to:

- Estimate emotion and tone separately from text, images, and voice recordings.
- Combine available modality predictions into one overall estimate.
- Flag possible contradictions and changes in conversation tone.
- Explain results with understandable cues and uncertainty indicators.
- Suggest clearer, calmer, or friendlier communication when appropriate.
- Make consent, privacy, and user-controlled deletion visible.

## Problem statement

People can communicate different signals through their words, facial expressions, and voice. A text-only tool may miss these differences and contribute to misunderstandings. EmotionIQ addresses this by analyzing available modalities independently, comparing their results, and presenting possible mismatches with explanations.

## Technology stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + Vite | Pages, forms, dashboard, and interactions |
| Styling | Tailwind CSS + Lucide React | Responsive design, components, and icons |
| Backend | Python 3.12 + FastAPI | API endpoints, validation, model calls, and fusion; managed with `uv` |
| AI | Pretrained models / inference APIs | Text, facial-expression, and speech-emotion estimates |
| Database and auth | SQLite + SQLAlchemy/Alembic; JWT authentication | Developer-local database and optional accounts/history; migrations are shared through Git |
| Charts | Recharts | Emotion history and trends |
| Version control | Git + GitHub | Team source-code management |

## Run the frontend locally

The detailed, numbered UI implementation checklist is available in [UI_IMPLEMENTATION_PLAN.md](UI_IMPLEMENTATION_PLAN.md). The backend roadmap is available in [BACKEND_IMPLEMENTATION_PLAN.md](BACKEND_IMPLEMENTATION_PLAN.md). Each task is scoped to be completed independently. Browser review is manual: the development agent must not automatically open or inspect the running URL; the project owner should follow each task's manual test checklist.

The current repository contains the React + Vite frontend in `frontend/`.

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Other useful commands:

```bash
npm run build
npm run lint
npm test
npm run test:watch
npm run preview
```

The frontend can run either in local mock mode or directly connected to the FastAPI backend service:
- To run with live backend integration (mock mode disabled), set `VITE_USE_MOCK_ANALYSIS=false` and `VITE_API_BASE_URL=http://localhost:8000` in `frontend/.env`.
- Live API integration includes automatic timeout protection, network disconnection handling, and readable translation of backend validation and model errors.

## Run the backend locally

From `backend/`:

```bash
cd backend
uv sync # or create python virtualenv
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Run backend tests:

```bash
uv run pytest
```


## Functional requirements

- **FR-01 Text analysis:** Accept typed text and return estimated emotion/tone labels and confidence information when available.
- **FR-02 Image analysis:** Accept an uploaded image and estimate visible facial-expression categories using a pretrained model.
- **FR-03 Voice analysis:** Accept audio and estimate vocal emotion using a compatible pretrained model or inference API.
- **FR-04 Multimodal analysis:** Combine available modality results using a simple, explainable late-fusion method.
- **FR-05 Contradiction detection:** Flag possible disagreement, such as positive wording with a negative facial or vocal cue.
- **FR-06 Context and conversation:** Analyze multiple messages for possible tone changes, escalation, or misunderstandings.
- **FR-07 Communication coach:** Suggest clearer, calmer, or friendlier wording; suggestions remain optional.
- **FR-08 Explainable results:** Show model outputs, brief cues, and uncertainty.
- **FR-09 History and trends:** Show recent analyses and trends. Persistent history requires database setup and consent.
- **FR-10 Privacy:** Ask for consent before processing uploads, avoid storing raw media by default, and allow deletion of saved history.
- **FR-11 Accounts:** If enabled, users can sign up, log in, and access only their own saved records.

## Non-functional requirements

- **Usability:** Simple navigation, clear labels, responsive interfaces, and understandable results.
- **Performance:** Show loading feedback; response time depends on the model/API and file size.
- **Reliability:** Handle unsupported files, unavailable models, network errors, and missing inputs without inventing predictions.
- **Security:** Keep API secrets on the backend, validate uploads, restrict database access by user, and use HTTPS when deployed.
- **Privacy:** Process voluntarily supplied content, do not retain raw images/audio by default, and support deletion of stored history.

## High-level workflow

1. The user reads the privacy notice and gives consent.
2. The user enters text and/or uploads an image or audio file.
3. The backend validates inputs and calls the relevant pretrained models.
4. Each model returns a modality-level estimate.
5. Confidence-aware late fusion combines available results and contradiction rules compare them.
6. The interface shows estimates, uncertainty, explanations, and optional coaching.
7. If history is enabled and the user agrees, the result is saved and can be deleted.

## AI approach and research basis

The first version uses modular late fusion: separate text, face, and voice models produce individual outputs, then an explainable confidence-aware rule combines available results. A rule-based layer flags possible contradictions. Learned fusion is a possible future upgrade.

Candidate datasets and research foundations include GoEmotions for text, FER2013 for facial expressions, RAVDESS for emotional speech, and CMU-MOSEI for multimodal benchmarking. M3ER, CMU-MOSEI, and MISA are cited as research foundations. Final choices depend on licensing, compatibility, and available compute.

## Phase 1 UI status

The frontend is demonstrable without a backend and includes:

- Local demo login and signup screens. No account is stored remotely.
- Text, Image, Voice, and Multimodal analysis inputs.
- Conversation Coach for reframing one sentence as Light, Strict, Happy, Sad, Formal, or Informal.
- Consent messaging, file validation, previews, loading, error, retry, and reset states.
- Results with modality labels, confidence, explanations, text summaries, improvement guidance, possible cue mismatch, and optional communication suggestions.
- Session-only History with timestamps, modality summaries, mismatch tags, and clear-history controls.
- Privacy & settings with session-data controls and local demo sign-out.
- Responsive layouts, keyboard navigation, and semantic accessibility support.

### Available screens

| Page ID | Screen | Purpose |
|---|---|---|
| `text` | Text analysis | Estimate cues in typed wording. |
| `image` | Image analysis | Estimate visible cues from an uploaded image. |
| `voice` | Voice analysis | Estimate vocal delivery from an uploaded recording. |
| `multimodal` | Multimodal analysis | Combine any available text, image, and voice inputs. |
| `coach` | Conversation Coach | Reframe one sentence for a selected delivery style. |
| `analysis` | Analysis results | Review the latest estimate and modality details. |
| `history` | Observations History | Review successful analyses from the current session. |
| `settings` | Privacy & settings | Review privacy messaging, clear history, or sign out. |

### Mock mode

Mock mode is enabled unless `VITE_USE_MOCK_ANALYSIS` is set to `false`. It waits briefly to make loading visible, returns the documented response shape, and keeps raw image/audio files in memory only while the current UI is using them. It does not upload or persist raw media.

To demonstrate a readable failure, include `[error]` anywhere in the text input. The mock request fails, the submitted payload remains available for retry, and failed requests are not added to History. Remove `[error]` or use Reset before submitting a successful sample.

Mock image and voice estimates use demo filename cues such as `happy`, `smile`, `worried`, or `serious`; they are not real image or audio model predictions.

The Coach mock supports `light`, `strict`, `happy`, `sad`, `formal`, and `informal` styles. Include `[error]` in the Coach sentence to demonstrate its failure and retry state.

### Environment variables

Create a `.env` file in `frontend/` when changing the defaults:

| Variable | Default | Purpose |
|---|---|---|
| `VITE_USE_MOCK_ANALYSIS` | enabled | Set to `false` to call the backend instead of the mock service. |
| `VITE_API_BASE_URL` | empty | Backend origin used for `POST /analyze`, for example `http://localhost:8000`. |

Restart Vite after changing environment variables. To disable mock mode, set both `VITE_USE_MOCK_ANALYSIS=false` and `VITE_API_BASE_URL` to a reachable backend origin. If mock mode is disabled without a base URL, the UI shows the not-connected state.

## Backend handoff

Replace the mock behavior behind `frontend/src/api/emotionClient.js`. Components already consume the response contract below, so the UI should not need to change when the FastAPI endpoint is connected.

### Request

Expose `POST /analyze` with `multipart/form-data`. All fields are optional, but at least one must be supplied by the client:

| Field | Type | Constraints |
|---|---|---|
| `text` | string | Optional text input. |
| `image` | File | Optional JPEG, PNG, or WEBP image up to 5 MB. |
| `audio` | File | Optional MP3, WAV, OGG, or WEBM audio up to 10 MB. |

### Response

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
	"summary": "This 5-word message is estimated to sound calm, based on its observable wording cues.",
	"improvement": "For a clearer message, add the intended outcome or deadline while keeping the measured tone.",
	"mismatch": {
		"detected": false,
		"description": ""
	},
	"suggestion": null
}
```

`confidence` must be a number from `0` to `1`. Always return `modalities.text`, `modalities.image`, and `modalities.audio`; use `null` for an unprovided or unavailable modality. `mismatch` may be `null`, but when present it must include `detected` and a non-diagnostic `description`. `suggestion` is optional and should be `null` when there is no useful communication guidance.

The frontend currently sends requests and handles responses in `frontend/src/api/emotionClient.js`. Add authentication headers and backend-specific error or quota handling there once the API contract is finalized.

### Conversation Coach endpoint

The Coach page sends `POST /coach` with a JSON body:

```json
{
	"text": "Please send the report.",
	"style": "formal"
}
```

The backend should return:

```json
{
	"requestId": "uuid",
	"originalText": "Please send the report.",
	"style": "formal",
	"reframedText": "Please be advised that the report is requested. Your attention to this matter would be appreciated.",
	"explanation": "The sentence was adjusted toward a formal delivery while keeping the original intent as closely as possible."
}
```

`style` should accept `light`, `strict`, `happy`, `sad`, `formal`, or `informal`. Coach output is optional wording guidance, not a replacement for the user's judgment.

## Scope and limitations

The current UI is a mock-backed prototype. Image and voice demo results are filename-driven, authentication is local-only, and History is held in memory for the current browser session and cleared on refresh or sign-out. No trained emotion model or persistent backend is included in this frontend phase. Real model accuracy may vary with datasets, accents, image quality, and recording conditions. Facial and vocal cues do not prove internal emotional states.

Training deep-learning models from scratch, real-time surveillance, diagnosis, analyzing other people without consent, and complex learned multimodal fusion are outside the first prototype.

## Phase 1 UI complete

The frontend is ready for the backend phase. Backend integration can begin by replacing the mock client behind the existing contract in `frontend/src/api/emotionClient.js`; the page components and results layout do not need to be redesigned.

Automated verification completed:

- `npm test` — 14 focused tests pass across login, consent, validation, mock results, Coach rewriting, retry, history, and sign-out flows.
- `npm run lint` — passes with no unused-code findings.
- `npm run build` — production build passes.
- Editor diagnostics and `git diff --check` — clean.

Before handoff, the project owner should manually review the running UI at desktop and mobile sizes, visit every page destination, inspect one-modality and multimodal results, exercise unavailable/error/retry states, and check the browser console. The documented mock mode remains the default demonstration path until the FastAPI service is available.

## Acceptance criteria

The prototype is demonstrable when:

1. Text, image, and audio inputs are accepted.
2. Models return real predictions or clear errors.
3. Fusion works when one or more modalities are missing.
4. Possible contradictions are shown.
5. Results include uncertainty and explanations.
6. Consent and history-deletion controls are understandable.

## Implementation plan

1. **UI prototype:** React pages, navigation, uploads, loading/error states, and results layout.
2. **AI integration:** Integrate and test text, image, and audio models independently.
3. **Fusion:** Combine available predictions and flag possible contradictions.
4. **Supporting features:** Communication coach, explanations, and basic conversation analysis.
5. **Data and privacy:** Session history first; add Supabase Auth/database if time permits, with deletion support.
6. **Final review:** Test sample cases, document limitations, and prepare the demonstration.

## Disclaimer

These are estimates based on observable cues, not a diagnosis or proof of what someone truly feels.
