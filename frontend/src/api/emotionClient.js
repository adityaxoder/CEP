/**
 * BrainiacConvo API Client
 *
 * This module is the single point of contact between the frontend and the
 * backend analysis endpoints. All fetch calls live here so UI components
 * stay clean and the contract is easy to update once the backend team
 * provides real endpoint URLs and response schemas.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * BACKEND INTEGRATION CHECKLIST (for the backend teammate)
 * ────────────────────────────────────────────────────────────────────────────
 *  1. BASE_URL  – replace the placeholder below with the real server origin.
 *
 *  2. POST /analyze  – the frontend sends a multipart/form-data body with:
 *       • text   (string, optional)
 *       • image  (File, optional – JPEG/PNG/WEBP, ≤ 5 MB)
 *       • audio  (File, optional – MP3/WAV/OGG/WEBM, ≤ 10 MB)
 *     Expected JSON response shape:
 *     {
 *       "requestId": "uuid",
 *       "modalities": {
 *         "text":  { "label": string, "confidence": number (0-1), "explanation": string } | null,
 *         "image": { "label": string, "confidence": number (0-1), "explanation": string } | null,
 *         "audio": { "label": string, "confidence": number (0-1), "explanation": string } | null
 *       },
 *       "mismatch": { "detected": boolean, "description": string } | null,
 *       "suggestion": string | null
 *     }
 *
 *  3. Authentication – if endpoints require auth headers, add them to the
 *     headers object in `analyzeContent()` below.
 *
 *  4. Rate limiting / quotas – document them here so the UI can surface
 *     friendly messages.
 * ────────────────────────────────────────────────────────────────────────────
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || null;
const USE_MOCK = import.meta.env.VITE_USE_MOCK_ANALYSIS !== 'false';

function createMockResult({ text, image, audio }) {
  const modalities = {
    text: text ? {
      label: 'Calm',
      confidence: 0.82,
      explanation: 'The wording uses measured language with a constructive tone.',
    } : null,
    image: image ? {
      label: 'Positive',
      confidence: 0.68,
      explanation: 'Visible facial cues appear mildly positive in this prototype result.',
    } : null,
    audio: audio ? {
      label: 'Neutral',
      confidence: 0.59,
      explanation: 'The vocal delivery appears steady with limited emphasis.',
    } : null,
  };

  const available = Object.values(modalities).filter(Boolean);
  const mismatch = available.length > 1 && new Set(available.map(({ label }) => label)).size > 1;

  return {
    requestId: `mock-${Date.now()}`,
    modalities,
    mismatch: mismatch ? {
      detected: true,
      description: 'The provided signals suggest slightly different emotional cues.',
    } : { detected: false, description: '' },
    suggestion: mismatch ? 'Consider clarifying the intended tone with a short, direct message.' : null,
  };
}

/**
 * Sends text / image / audio to the backend analysis endpoint.
 *
 * @param {{ text?: string, image?: File, audio?: File }} payload
 * @returns {Promise<AnalysisResult>}
 * @throws {Error} with a user-friendly message
 */
export async function analyzeContent({ text, image, audio }) {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    if (text?.toLowerCase().includes('[error]')) {
      throw new Error('The mock service could not process this sample. Remove [error] and try again.');
    }
    return createMockResult({ text, image, audio });
  }

  if (!BASE_URL) {
    // Backend not connected yet – return a sentinel so the UI shows the
    // "not connected" state rather than a generic error.
    throw new NotConnectedError();
  }

  const form = new FormData();
  if (text)  form.append('text',  text);
  if (image) form.append('image', image);
  if (audio) form.append('audio', audio);

  const response = await fetch(`${BASE_URL}/analyze`, {
    method: 'POST',
    body: form,
    // Add auth headers here once the backend contract is finalised.
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(`Analysis failed (${response.status}): ${detail}`);
  }

  return response.json();
}

/** Sentinel error thrown when BASE_URL is not configured. */
export class NotConnectedError extends Error {
  constructor() {
    super('Analysis endpoint is not connected yet.');
    this.name = 'NotConnectedError';
  }
}
