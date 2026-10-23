# EmotionIQ — Frontend

A React + Vite frontend for the EmotionIQ communication-support app.

---

## Tech stack

| Tool | Version |
|---|---|
| React | 19 |
| Vite | 8 |
| Tailwind CSS | 4 (via `@tailwindcss/vite`) |
| Lucide React | latest |

---

## Running locally

```bash
cd frontend
npm install
npm run dev
```

The app is available at **http://localhost:5173**.

Run the focused frontend tests with `npm test`, or use `npm run test:watch` while developing.

---

## Project structure

```
frontend/
├── index.html                     # Entry HTML (title, meta, font preconnect)
├── vite.config.js                 # Vite + Tailwind plugin config
└── src/
    ├── main.jsx                   # React root mount
    ├── index.css                  # Global design system (all styles live here)
    ├── App.jsx                    # Root component – page routing + session history
    │
    ├── api/
    │   └── emotionClient.js       # ← BACKEND INTEGRATION POINT
    │
    ├── hooks/
    │   └── useAnalysis.js         # Analysis state machine (idle/loading/success/error)
    │
    ├── components/
    │   ├── Header.jsx             # Sticky nav header
    │   ├── ConsentNotice.jsx      # Disclaimer + consent checkbox
    │   ├── TextInput.jsx          # Text modality input + char counter
    │   ├── ImageInput.jsx         # Image modality picker (JPEG/PNG/WEBP ≤ 5 MB)
    │   ├── VoiceInput.jsx         # Audio modality picker (MP3/WAV/OGG/WEBM ≤ 10 MB)
    │   ├── ModalityCard.jsx       # Per-modality result card (label + confidence + explanation)
    │   └── ResultsPanel.jsx       # Full results view (cards + mismatch + suggestion)
    │
    └── pages/
        ├── AnalyzePage.jsx        # Main analysis page
      ├── CoachPage.jsx          # Sentence reframing by selected delivery style
        └── HistoryPage.jsx        # Session-only history (no persistence)
```

---

## Backend integration (Person 3 Implementation)

**The analysis and Coach endpoints are fully integrated with the FastAPI backend.**

All integration logic lives in **`src/api/emotionClient.js`**.

### Connecting to the live backend (Mock Mode Disabled)

Create a local `.env` or set environment variables in `frontend/.env`:

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCK_ANALYSIS=false
```

When `VITE_USE_MOCK_ANALYSIS=false`, `analyzeContent()` and `coachText()` transmit live requests to the backend with:
- `AbortController` timeout protection (default 15 seconds)
- Automatic detection of network disconnection (`NetworkError`) and server timeouts (`TimeoutError`)
- Automatic translation of structured backend error codes (`EMPTY_REQUEST`, `UPLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `MALFORMED_IMAGE`, `MALFORMED_AUDIO`, `MODEL_UNAVAILABLE`, `RATE_LIMITED`, `INTERNAL_ERROR`) into friendly, readable user messages.

### Integrated Endpoints

1. **`POST /analyze`** (multipart/form-data):
   - `text` (string, max 10,000 characters)
   - `image` (file: JPEG, PNG, or WEBP, max 5 MB)
   - `audio` (file: MP3, WAV, OGG, or WEBM, max 10 MB)
   - Returns structured `AnalysisResponse` with per-modality results, non-diagnostic cue explanations, contradiction/mismatch detection, and communication suggestions.

2. **`POST /coach`** (application/json):
   - Body: `{ "text": "...", "style": "light" | "strict" | "happy" | "sad" | "formal" | "informal" }`
   - Returns reframed delivery sentence preserving original intent.


---

## Screens implemented

| Screen | Description |
|---|---|
| **Analyse** | Text, Image, Voice inputs; consent notice; all status states |
| **Coach** | Reframe one sentence as Light, Strict, Happy, Sad, Formal, or Informal |
| **History** | Session-only list of analyses (cleared on page refresh) |

### Status states on the Analyse page

| State | When shown |
|---|---|
| **Idle** | No submission yet |
| **Loading** | Waiting for backend response |
| **Not connected** | `BASE_URL` is null in `emotionClient.js` |
| **Error** | Backend returned a non-OK response |
| **Success** | Results panel with per-modality cards |

### Mock loading and failure demo

Mock analysis waits briefly before returning a result so the loading state is visible. To demonstrate the error, include `[error]` anywhere in the text input. The mock service returns a readable failure, keeps the submitted payload available for **Try again**, and does not add the failed request to session history. Remove `[error]` or use **Reset** before submitting a successful sample.

---

## Disclaimer (always visible in results)

> These are **estimates** based on observable cues, not a diagnosis or proof of what someone truly feels.