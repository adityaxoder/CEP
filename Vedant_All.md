# EmotionIQ — Gemini Text and Local Sample Demo Plan

## Goal and scope

Prepare a small classroom demo whose frontend and backend run on the local Mac. Text wording analysis uses the Google Gemini API and therefore needs internet access and a backend-only API key. The coach uses local deterministic templates. Image and audio are curated local sample galleries with human-written annotations, not automatic recognition. Results must not be described as reliable readings of a person's internal mood.

This is a teaching prototype, not a psychological or clinical tool. Text submitted for analysis is sent to Google's AI service; disclose this before submission and do not use sensitive or private text. Keep submitted text, media filenames, and completed analysis outputs in local history scoped to the account that created them and deletable from the UI. Do not save uploaded image or audio file contents. Demo account records may be stored in the local development database with passwords hashed; they are only for the local classroom demo.

### What each feature will do

| Feature | Planned behavior | What it cannot claim |
|---|---|---|
| Text | Send text to Gemini for a structured wording-cue category: positive, concern, frustration, mixed, or no clear cue. Show short evidence spans copied from the input and a plain-language description of what the sentence says. Do not show a confidence or probability score. | Gemini can misunderstand context, sarcasm, or the writer's real mood. The description is an AI-generated wording estimate, not a reliable reading of feelings. Text is sent to Google for processing. |
| Image | Let the user choose from five curated images of the same man: sad, smiling, laughing, crying, and angry. Show the selected sample and clearly identify its expression label as a human annotation. | The app does not infer an emotion from the face or classify arbitrary image uploads. The label describes the sample annotation, not the viewer's or uploader's feelings. |
| Audio | Let the user choose from five curated voice recordings, with one sample for each agreed label (sad, smiling/happy, laughing, crying, and angry). Play the selected recording and identify its label as a human annotation. | The app does not infer emotion from voice or classify arbitrary audio uploads. The label describes the sample annotation, not the speaker's true mood. |
| Coach | When the user selects Coach and provides valid text, offer local deterministic template rewrites in four styles (friendly, formal, concise, and empathetic), including for neutral or random sentences. Show the original, each suggested rewrite, and a note describing the templates. | It is not generative AI. It may not preserve every nuance; the user should review the suggestions. |
| Combined inputs | Show the text wording cue and selected image/audio sample labels separately. Map smiling/laughing to positive, sad/crying to concern, and angry to frustration for comparison. When comparable categories differ, report a **possible cue mismatch** and show which labels were compared. If text is Mixed or No clear cue, say the cues cannot be compared clearly. | This is a comparison of human-authored sample labels and text rules, not reliable cross-modal emotion detection or evidence of a person's actual feelings. Do not produce a single inferred mood. |

## Required tasks — complete in order

### Task 1 — Disclose the Gemini text flow and freeze demo claims

- [ ] Keep the Gemini key on the backend and never expose it to the frontend.
- [ ] Use the feature table above as the product contract. Do not promise automatic facial emotion recognition or audio mood recognition.
- [ ] Disclose before text submission that the text is sent to Google Gemini. Do not claim `store=false` means Google never processes or retains data; explain that service terms apply.
- [ ] Update the UI notice and demo narration to explain Gemini wording estimates, local coach templates, and human-authored image/audio sample labels. None reveal anyone's true feelings.
- [ ] Save each completed analysis result plus its submitted text and media filenames in local SQLite history scoped to the signed-in account. Support loading history after sign-in, showing input beside output, deleting individual entries, and clearing that account's full history. Do not persist uploaded image or audio file contents.

**Done when:** the task list, UI wording, and walkthrough all make the same limited claims.

### Task 2 — Make local demo username login and signup work

- [ ] Add a seeded local demo account with username `vedant` and password `123`. Convert existing `vedant@gmail.com` and `aditya@gmail.com` account IDs to `vedant` and `aditya` while preserving their password hashes. Clearly mark demo credentials as classroom-only.
- [ ] Make sign-in validate required username and password fields and check credentials against the backend. Blank, unknown, or incorrect credentials must show a clear error and must not enter the app.
- [ ] Make signup ask for a username and password confirmation, reject duplicate usernames, save new accounts in the local database, and sign the new user in after successful signup.
- [ ] Do not enforce password length, complexity, or composition rules; reject only a missing/blank password and require confirmation to match.
- [ ] Hash passwords with a suitable password-hashing library; never store or return plaintext passwords.
- [ ] Issue a short-lived signed JWT after successful login/signup, keep it in frontend memory only, and clear it on sign-out. Require token validation for analysis, coach, and account endpoints. Do not add refresh tokens or persistent login for this demo.
- [ ] Keep authentication local with no external identity provider. State clearly that this is demo authentication and is not suitable for production as configured.

**Decision:** Use JWT because the frontend and FastAPI backend need a simple way to validate the signed-in user across API requests. The JWT is not stored in localStorage; it is held in memory and lost on refresh. Password hashing and backend credential checks are still required—JWT alone does not authenticate users.

**Done when:** the seeded demo account can sign in as `vedant`; existing Aditya can sign in as `aditya`; blank or wrong credentials are rejected; a new user can sign up with a username and chosen password, then sign in; passwords are hashed in the database; and sign-out clears the in-memory session.

### Task 3 — Use Gemini for text analysis

- [ ] Replace the hosted Hugging Face path with the Gemini API using a backend-only `GEMINI_API_KEY` and configurable model name.
- [ ] Request a structured response with a category (positive, concern, frustration, mixed, or no clear cue) and short evidence spans. Validate the category and verify every displayed evidence span occurs in the submitted text.
- [ ] Ask Gemini for a short plain-language description of the sentence; constrain it to the text and prohibit invented context or claims about the author's true feelings.
- [ ] Request stateless interactions (`store=false`); never log raw text or the API key. Do not promise the service has no other data processing or retention.
- [ ] Do not present model output as a calibrated confidence or probability. Do not invent a category if the response is invalid or unavailable.
- [ ] Keep empty/too-long text validation and the public error response working.

**Done when:** representative positive, concern, frustration, mixed, and unrelated/random sentences return validated categories and accurate evidence, and unavailable/invalid API responses show a clear error.

### Task 4 — Make image and audio galleries

- [ ] Remove filename-based image/audio predictions from the backend.
- [ ] Build a curated local gallery of five images of the same man, labeled sad, smiling, laughing, crying, and angry. Display the selected image and its human-authored annotation as sample content, not an app prediction.
- [ ] Build a curated local gallery of five voice recordings with corresponding human-authored labels (sad, smiling/happy, laughing, crying, and angry). Let users play a selected recording and display its annotation as sample content, not an app prediction.
- [ ] Keep the gallery assets and annotations local; do not upload user media or claim to analyze arbitrary uploads.

**Done when:** exactly five image samples and five audio samples are available, each displayed or played with its correct human-authored label.

### Task 5 — Finish coach and combined-input presentation

- [ ] Coach: let the user select one rewrite style before submission (friendly, formal, concise, empathetic, professional, assertive, diplomatic, or casual). Send the sentence and selected style to the backend Gemini provider, preserve meaning, validate input, and display one clearly labeled rewrite. Require consent before sending text.
- [ ] Show Gemini analysis inline with a clear “AI wording estimate” label, and coach results inline with a “Gemini suggestion” label.
- [ ] For combined inputs, show the text wording cue and the separately selected image/audio sample annotations. Compare their documented broad categories and show a clearly qualified possible cue mismatch when they differ; show the labels and evidence used. Never present this as a reliable reading of a person's feelings or combine it into one inferred mood.
- [ ] Make unavailable, unsupported, empty, and inconclusive states clear; never fill in missing results.

**Done when:** text, image, audio, coach, and combined-input flows can each be demonstrated with truthful output labels.

### Task 6 — Configure and walk through the local demo

- [ ] Create ignored local env files from the examples. In `backend/.env`, set `APP_ENV=development`, `TEXT_MODEL_NAME=gemini-3.1-flash-lite`, `GEMINI_API_KEY` to your private key, `IMAGE_MODEL_NAME=baseline`, `AUDIO_MODEL_NAME=baseline`, and `COACH_PROVIDER=gemini`. Leave `HF_API_TOKEN` empty. Keep Gemini and JWT secrets in backend env only; never put them in the frontend or commit them.
- [ ] In `frontend/.env`, use `VITE_USE_MOCK_ANALYSIS=false` and `VITE_API_BASE_URL=http://localhost:8000`.
- [ ] Start backend and frontend with the commands below and confirm `/health` responds.
- [ ] Walk through demo-account sign-in, invalid/blank login rejection, and signup/sign-in for a new account; then show a text example with matched evidence and an unrelated/random sentence showing **No clear cue**, one image gallery sample, one audio gallery sample, one combined example with matching or differing labels, one coach rewrite for supplied text, and one invalid input.
- [ ] Explain that text analysis and coach rewrites are sent to Gemini; image/audio labels are human-authored samples. Do not describe any output as someone's true mood.

**Done when:** a fresh local setup runs the walkthrough with a Gemini API key and internet access, without model downloads or misleading claims.

## Run locally

One-time setup from the repository root:

```bash
cd backend
uv sync
cp .env.example .env
```

Edit `backend/.env` with the values listed in Task 6, including a local JWT signing secret. Do not commit `.env` files.

Backend terminal:

```bash
cd backend
uv run uvicorn app.main:app --reload
```

In another terminal, from the repository root:

```bash
cd frontend
npm ci
cp .env.example .env
npm run dev
```

Open the local URL Vite prints (normally `http://localhost:5173`). Backend status is at `http://localhost:8000/health`; API docs are at `http://localhost:8000/docs`.

## Out of scope for this quick demo

Automatic facial-expression or speech-emotion recognition; arbitrary image/audio upload classification; video analysis; combining text with human-authored sample labels as if they were simultaneous real-world signals; account-backed history; production deployment; and clinical or other consequential use. Revisit automatic recognition only if the project later adds suitable models, evaluation, consent, and time for verification.
