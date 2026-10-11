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
        └── HistoryPage.jsx        # Session-only history (no persistence)
```

---

## Backend integration

**The analysis endpoint is not connected yet.**

All integration work is isolated to **`src/api/emotionClient.js`**.
Set `BASE_URL` to the server origin to connect.

### Required from the backend teammate

1. **Server origin** (e.g. `http://localhost:8000`)

2. **`POST /analyze`** endpoint accepting `multipart/form-data`:

   | Field | Type | Notes |
   |---|---|---|
   | `text` | string | optional |
   | `image` | File | optional – JPEG/PNG/WEBP |
   | `audio` | File | optional – MP3/WAV/OGG/WEBM |

3. **Response JSON shape:**

   ```json
   {
     "requestId": "uuid",
     "modalities": {
       "text":  { "label": "...", "confidence": 0.87, "explanation": "..." },
       "image": { "label": "...", "confidence": 0.61, "explanation": "..." },
       "audio": null
     },
     "mismatch": { "detected": true, "description": "..." },
     "suggestion": "Optional wording suggestion here."
   }
   ```

   Any modality the backend cannot process should be `null` (not omitted).

4. **Auth headers** (if required) — add them to `analyzeContent()` in `emotionClient.js`.

5. **Rate limit / quota** details — document so the UI can surface a friendly message.

---

## Screens implemented

| Screen | Description |
|---|---|
| **Analyse** | Text, Image, Voice inputs; consent notice; all status states |
| **History** | Session-only list of analyses (cleared on page refresh) |

### Status states on the Analyse page

| State | When shown |
|---|---|
| **Idle** | No submission yet |
| **Loading** | Waiting for backend response |
| **Not connected** | `BASE_URL` is null in `emotionClient.js` |
| **Error** | Backend returned a non-OK response |
| **Success** | Results panel with per-modality cards |

---

## Disclaimer (always visible in results)

> These are **estimates** based on observable cues, not a diagnosis or proof of what someone truly feels.