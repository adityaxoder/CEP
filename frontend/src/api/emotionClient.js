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
const MOCK_DELAY_MS = 900;

function createRequestId(prefix) {
  const randomId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${randomId}`;
}

function getTextResult(text) {
  const normalizedText = text.toLowerCase();
  const concernedCue = /\b(worried|concerned|problem|issue|sorry|difficult|upset)\b/.test(normalizedText);
  const positiveCue = /\b(thanks|thank you|great|happy|appreciate|excellent|love)\b/.test(normalizedText);

  if (concernedCue) {
    return {
      label: 'Concerned',
      confidence: 0.79,
      explanation: 'The wording includes cues of concern or difficulty that may indicate a more serious tone.',
    };
  }

  if (positiveCue) {
    return {
      label: 'Warm',
      confidence: 0.84,
      explanation: 'The wording includes appreciative or positive language with a friendly tone.',
    };
  }

  return {
    label: 'Calm',
    confidence: 0.76,
    explanation: 'The wording appears measured and conversational with no strong emotional cue detected.',
  };
}

function getMockFileCue(file) {
  const fileName = file.name.toLowerCase();

  if (/\b(worried|concerned|sad|frown|serious|issue)\b/.test(fileName)) return 'concerned';
  if (/\b(happy|smile|laugh|joy|positive|excited)\b/.test(fileName)) return 'positive';
  return 'neutral';
}

function getImageResult(image) {
  const cue = getMockFileCue(image);

  if (cue === 'concerned') {
    return {
      label: 'Concerned visible cues',
      confidence: 0.74,
      explanation: 'The image filename suggests a serious or concerned sample; this estimate is not a claim about the person\'s internal state.',
    };
  }

  if (cue === 'positive') {
    return {
      label: 'Positive visible cues',
      confidence: 0.81,
      explanation: 'The image filename suggests a smiling or positive sample; this estimate is based on the provided demo cue only.',
    };
  }

  return {
    label: 'Neutral visible cues',
    confidence: 0.63,
    explanation: 'No strong visible cue is represented by this demo sample, so the estimate is neutral and uncertain.',
  };
}

function getAudioResult(audio) {
  const cue = getMockFileCue(audio);

  if (cue === 'concerned') {
    return {
      label: 'Concerned delivery',
      confidence: 0.71,
      explanation: 'The filename suggests a serious delivery sample; this estimate describes vocal presentation, not inner emotion.',
    };
  }

  if (cue === 'positive') {
    return {
      label: 'Warm delivery',
      confidence: 0.78,
      explanation: 'The filename suggests a warm or upbeat delivery sample; this is an estimate of vocal style.',
    };
  }

  return {
    label: 'Steady delivery',
    confidence: 0.6,
    explanation: 'The vocal delivery appears steady with limited emphasis in this neutral demo sample.',
  };
}

function getCueCategory(label) {
  if (/concerned/i.test(label)) return 'concerned';
  if (/positive|warm/i.test(label)) return 'positive';
  return 'neutral';
}

const MOCK_MODALITY_NAMES = {
  text: 'text wording',
  image: 'visible image cues',
  audio: 'voice delivery',
};

function getMismatchDescription(entries) {
  const cueDescriptions = entries
    .map(({ modality, data }) => `${MOCK_MODALITY_NAMES[modality]} appears ${getCueCategory(data.label)}`)
    .join(', ');

  return `The available estimates are not aligned: ${cueDescriptions}. This can reflect different observable signals and is not evidence of deception or hidden emotion.`;
}

function normalizeAnalysisResult(data) {
  return {
    requestId: data?.requestId || createRequestId('request'),
    modalities: {
      text: data?.modalities?.text || null,
      image: data?.modalities?.image || null,
      audio: data?.modalities?.audio || null,
    },
    mismatch: data?.mismatch || null,
    suggestion: data?.suggestion || null,
  };
}

function createMockResult({ text, image, audio }) {
  const modalities = {
    text: text ? getTextResult(text) : null,
    image: image ? getImageResult(image) : null,
    audio: audio ? getAudioResult(audio) : null,
  };

  const available = Object.entries(modalities)
    .filter(([, data]) => data)
    .map(([modality, data]) => ({ modality, data }));
  const mismatch = available.length > 1
    && new Set(available.map(({ data }) => getCueCategory(data.label))).size > 1;

  return {
    requestId: createRequestId('mock'),
    modalities,
    mismatch: mismatch ? {
      detected: true,
      description: getMismatchDescription(available),
    } : { detected: false, description: '' },
    suggestion: mismatch
      ? 'Consider checking the surrounding context or asking a clarifying question rather than relying on this estimate alone.'
      : null,
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
  if (!text && !image && !audio) {
    throw new Error('Add at least one signal before requesting an analysis.');
  }

  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
    if (text?.toLowerCase().includes('[error]')) {
      throw new Error('The mock service could not process this sample. Remove [error] and try again.');
    }
    return normalizeAnalysisResult(createMockResult({ text, image, audio }));
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

  return normalizeAnalysisResult(await response.json());
}

/** Sentinel error thrown when BASE_URL is not configured. */
export class NotConnectedError extends Error {
  constructor() {
    super('Analysis endpoint is not connected yet.');
    this.name = 'NotConnectedError';
  }
}
