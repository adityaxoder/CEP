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
| Backend | Python + FastAPI | API endpoints, validation, model calls, and fusion |
| AI | Pretrained models / inference APIs | Text, facial-expression, and speech-emotion estimates |
| Database and auth | Supabase / PostgreSQL + Auth | Optional accounts and persistent history |
| Charts | Recharts | Emotion history and trends |
| Version control | Git + GitHub | Team source-code management |

## Run the frontend locally

The detailed, numbered UI implementation checklist is available in [UI_IMPLEMENTATION_PLAN.md](UI_IMPLEMENTATION_PLAN.md). Each task is scoped to be completed independently. Browser review is manual: the development agent must not automatically open or inspect the running URL; the project owner should follow each task's manual test checklist.

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
npm run preview
```

The backend analysis endpoint is not connected yet. Backend integration is isolated in `frontend/src/api/emotionClient.js`; set its `BASE_URL` to the backend server origin when the FastAPI service is available.

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

## Current screens and backend contract

The frontend currently provides an Analyse screen with text, image, and voice inputs, consent, loading/error states, and results, plus a session-only History screen. History is cleared on page refresh until persistence is implemented.

The backend should expose `POST /analyze` using `multipart/form-data` with optional `text`, `image`, and `audio` fields. A response should contain modality results, mismatch information, and an optional suggestion. Unsupported or unprocessed modalities should be returned as `null`, not omitted.

## Scope and limitations

The mini-project prioritizes a working web prototype with real model/API integration, explainable late fusion, contradiction flags, communication suggestions, and basic history/privacy controls. Accuracy may vary with datasets, accents, image quality, and recording conditions. Facial and vocal cues do not prove internal emotional states.

Training deep-learning models from scratch, real-time surveillance, diagnosis, analyzing other people without consent, and complex learned multimodal fusion are outside the first prototype.

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
