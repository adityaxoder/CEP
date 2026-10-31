# EmotionIQ — Offline Rule-Based Demo Plan

## Goal and scope

Prepare a small classroom demo that runs on the local Mac with no AI service, API key, model download, or paid account. The app will process text, image, and audio inputs with simple, explainable rules and offer a template-based coach. Results must be described as **rule-based cues**, not reliable readings of a person's internal mood.

This is a teaching prototype. It is not a psychological or clinical tool. No input content is sent to an external service. Do not save raw text, images, or recordings. Keep analysis history session-only. Demo account records may be stored in the local development database with passwords hashed; they are only for the local classroom demo.

### What each feature will do

| Feature | Planned behavior | What it cannot claim |
|---|---|---|
| Text | Analyze any valid sentence using a substantial but manageable, documented set of local word and phrase rules for positive, concern, and frustration wording. Show matched evidence and the wording-cue category. If categories conflict, show **Mixed**; if no rule matches (including an ordinary/random sentence), show **No clear cue** and explain that no supported wording was found. | It does not understand context, sarcasm, or the writer's real mood. The output is not a model prediction or calibrated confidence. |
| Image | Let the user choose from five curated images of the same man: sad, smiling, laughing, crying, and angry. Show the selected sample and clearly identify its expression label as a human annotation. | The app does not infer an emotion from the face or classify arbitrary image uploads. The label describes the sample annotation, not the viewer's or uploader's feelings. |
| Audio | Let the user choose from five curated voice recordings, with one sample for each agreed label (sad, smiling/happy, laughing, crying, and angry). Play the selected recording and identify its label as a human annotation. | The app does not infer emotion from voice or classify arbitrary audio uploads. The label describes the sample annotation, not the speaker's true mood. |
| Coach | When the user selects Coach and provides valid text, offer a deterministic template rewrite in the chosen style (friendly, formal, concise, or empathetic). This should also work for neutral or random sentences. Show the original, suggested rewrite, and a short note describing the template used. | It is not generative AI. It may not preserve every nuance; the user should review the suggestion. |
| Combined inputs | Show the text wording cue and selected image/audio sample labels separately. Map smiling/laughing to positive, sad/crying to concern, and angry to frustration for comparison. When comparable categories differ, report a **possible cue mismatch** and show which labels were compared. If text is Mixed or No clear cue, say the cues cannot be compared clearly. | This is a comparison of human-authored sample labels and text rules, not reliable cross-modal emotion detection or evidence of a person's actual feelings. Do not produce a single inferred mood. |

## Required tasks — complete in order

### Task 1 — Freeze the honest demo behavior

- [ ] Keep all analysis local and rule-based; no API calls or model downloads.
- [ ] Use the feature table above as the product contract. Do not promise automatic facial emotion recognition or audio mood recognition.
- [ ] Update the UI notice and demo narration to explain that image and audio gallery labels are human-authored sample annotations, and that text results are rule-based wording cues. None reveal anyone's true feelings.
- [ ] Keep analysis history session-only; account records are handled separately under Task 2.

**Done when:** the task list, UI wording, and walkthrough all make the same limited claims.

### Task 2 — Make local demo login and signup work

- [ ] Add a seeded local demo account with email/username `vedant@gmail.com` and password `123`. Clearly mark these credentials as classroom-demo-only; never use them for a public or deployed service.
- [ ] Make sign-in validate required email and password fields and check credentials against the backend. Blank, unknown, or incorrect credentials must show a clear error and must not enter the app.
- [ ] Make signup validate required fields, email format, matching password confirmation, and duplicate email. Use the email as the username, save new accounts in the local database, and sign the new user in after successful signup.
- [ ] Do not enforce password length, complexity, or composition rules; reject only a missing/blank password and require confirmation to match.
- [ ] Hash passwords with a suitable password-hashing library; never store or return plaintext passwords.
- [ ] Issue a short-lived signed JWT after successful login/signup, keep it in frontend memory only, and clear it on sign-out. Require token validation for analysis, coach, and account endpoints. Do not add refresh tokens or persistent login for this demo.
- [ ] Keep authentication local with no external identity provider. State clearly that this is demo authentication and is not suitable for production as configured.

**Decision:** Use JWT because the frontend and FastAPI backend need a simple way to validate the signed-in user across API requests. The JWT is not stored in localStorage; it is held in memory and lost on refresh. Password hashing and backend credential checks are still required—JWT alone does not authenticate users.

**Done when:** the seeded demo account can sign in; blank or wrong credentials are rejected; a new user can sign up using an email and chosen password, then sign in; passwords are hashed in the database; and sign-out clears the in-memory session.

### Task 3 — Make text analysis explainable

- [ ] Replace the hosted Hugging Face text provider path for this demo with a local keyword and phrase baseline using a substantial but manageable, documented vocabulary across positive, concern, and frustration wording.
- [ ] Return the category, matched evidence words, and a rule-based label; use **Mixed** or **No clear cue** where appropriate.
- [ ] For valid ordinary/random sentences with no matching rules, return **No clear cue** and an understandable explanation, rather than inventing a category.
- [ ] Do not present heuristic scores as model confidence or probability.
- [ ] Keep empty/too-long text validation and the public error response working.

**Done when:** representative positive, concern, frustration, mixed, and unrelated/random sentences produce clear results with matched evidence or **No clear cue**.

### Task 4 — Make image and audio galleries

- [ ] Remove filename-based image/audio predictions from the backend.
- [ ] Build a curated local gallery of five images of the same man, labeled sad, smiling, laughing, crying, and angry. Display the selected image and its human-authored annotation as sample content, not an app prediction.
- [ ] Build a curated local gallery of five voice recordings with corresponding human-authored labels (sad, smiling/happy, laughing, crying, and angry). Let users play a selected recording and display its annotation as sample content, not an app prediction.
- [ ] Keep the gallery assets and annotations local; do not upload user media or claim to analyze arbitrary uploads.

**Done when:** exactly five image samples and five audio samples are available, each displayed or played with its correct human-authored label.

### Task 5 — Finish coach and combined-input presentation

- [ ] Keep the coach deterministic and template-based, with a small documented style list (friendly, formal, concise, empathetic) and input validation. When Coach is selected and valid text is present, show a rewrite suggestion even when the text is neutral or has no text-analysis cue.
- [ ] Show the result inline on the page where the user submitted it, with a clear “rule-based demo” label.
- [ ] For combined inputs, show the text wording cue and the separately selected image/audio sample annotations. Compare their documented broad categories and show a clearly qualified possible cue mismatch when they differ; show the labels and evidence used. Never present this as a reliable reading of a person's feelings or combine it into one inferred mood.
- [ ] Make unavailable, unsupported, empty, and inconclusive states clear; never fill in missing results.

**Done when:** text, image, audio, coach, and combined-input flows can each be demonstrated with truthful output labels.

### Task 6 — Configure and walk through the local demo

- [ ] Create ignored local env files from the examples. In `backend/.env`, use `APP_ENV=development`, `TEXT_MODEL_NAME=baseline`, `ALLOW_DEV_BASELINE=true`, `IMAGE_MODEL_NAME=baseline`, `AUDIO_MODEL_NAME=baseline`, `COACH_PROVIDER=baseline`, and leave `HF_API_TOKEN` empty. Configure a local JWT signing secret through the backend environment; never put it in the frontend or commit it.
- [ ] In `frontend/.env`, use `VITE_USE_MOCK_ANALYSIS=false` and `VITE_API_BASE_URL=http://localhost:8000`.
- [ ] Start backend and frontend with the commands below and confirm `/health` responds.
- [ ] Walk through demo-account sign-in, invalid/blank login rejection, and signup/sign-in for a new account; then show a text example with matched evidence and an unrelated/random sentence showing **No clear cue**, one image gallery sample, one audio gallery sample, one combined example with matching or differing labels, one coach rewrite for supplied text, and one invalid input.
- [ ] Explain the local rules and limitations; do not call outputs AI/model predictions.

**Done when:** a fresh local setup runs the walkthrough without credentials, external APIs, or misleading claims.

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

Automatic facial-expression or speech-emotion recognition; arbitrary image/audio upload classification; video analysis; external AI APIs; cross-modal mood fusion; account-backed history; production deployment; and clinical or other consequential use. Revisit automatic recognition only if the project later adds suitable offline models, evaluation, consent, and time for verification.
