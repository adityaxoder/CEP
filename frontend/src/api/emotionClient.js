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
 *         "text":  { "label": string, "confidence": number|null, "method": string, "evidence": string[], "explanation": string } | null,
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

export const DEFAULT_API_BASE_URL = 'http://localhost:8000';
export const DEFAULT_REQUEST_TIMEOUT_MS = 15000;
export const ANALYSIS_REQUEST_TIMEOUT_MS = 100000;
export const COACH_REQUEST_TIMEOUT_MS = 100000;

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.VITE_USE_MOCK_ANALYSIS === 'false' ? DEFAULT_API_BASE_URL : null);
export const USE_MOCK = import.meta.env.VITE_USE_MOCK_ANALYSIS !== 'false';
export const MOCK_DELAY_MS = 900;


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

function getTextSummary(text, result) {
  const wordCount = text.trim().split(/\s+/).length;
  return `This ${wordCount}-word message is estimated to sound ${result.label.toLowerCase()}, based on its observable wording cues.`;
}

function getTextImprovement(text, result) {
  if (result.label === 'Concerned') {
    return 'Name the specific issue and the next action you need so the concern is easier to respond to.';
  }

  if (result.label === 'Warm') {
    return 'Keep the appreciation, then add a direct request or clear next step if you need action.';
  }

  return 'For a clearer message, add the intended outcome or deadline while keeping the measured tone.';
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
    summary: data?.summary || null,
    improvement: data?.improvement || null,
  };
}

function createMockResult({ text, image, audio }) {
  const textResult = text ? getTextResult(text) : null;
  const modalities = {
    text: textResult,
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
    summary: textResult ? getTextSummary(text, textResult) : null,
    improvement: textResult ? getTextImprovement(text, textResult) : null,
  };
}

function normalizeCoachResult(data) {
  return {
    requestId: data?.requestId || createRequestId('coach'),
    originalText: data?.originalText || '',
    style: data?.style || 'friendly',
    reframedText: data?.reframedText || '',
    explanation: data?.explanation || 'This is an optional wording estimate. Review it before sending.',
  };
}

function createMockCoachResult({ text, style }) {
  const originalText = text.trim();
  const core = originalText.replace(/[.!?]+$/, '');
  const sentence = `${core}${/[.!?]$/.test(originalText) ? originalText.slice(-1) : '.'}`;
  const reframes = {
    friendly: `Just sharing: ${sentence}`,
    formal: `Please note: ${sentence}`,
    concise: `${core.replace(/\b(I just wanted to|I was wondering if|basically|actually|just|kind of|sort of)\s+/gi, '').replace(/\s+/g, ' ').trim()}.`,
    empathetic: `I hear you. ${sentence}`,
  };

  return normalizeCoachResult({
    requestId: createRequestId('mock-coach'),
    originalText,
    style,
    reframedText: reframes[style] || reframes.friendly,
    explanation: `A deterministic ${style} template was applied. Review the suggestion to make sure it preserves your intended meaning.`,
  });
}

/**
 * Sends text / image / audio to the backend analysis endpoint.
 *
 * @param {{ text?: string, image?: File, audio?: File }} payload
 * @returns {Promise<AnalysisResult>}
 * @throws {Error} with a user-friendly message
 */
export class NotConnectedError extends Error {
  constructor() {
    super('Analysis endpoint is not connected yet.');
    this.name = 'NotConnectedError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network connection failed. Please verify the backend is running and check your connection.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message = 'Request timed out. The server took too long to respond. Please try again.') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Maps HTTP status codes and structured backend errors to clear, friendly user messages.
 *
 * @param {number} status
 * @param {object|null} errorBody
 * @returns {string}
 */
export function mapBackendError(status, errorBody) {
  if (typeof errorBody === 'object' && errorBody !== null) {
    const { code, message } = errorBody;
    const errorMap = {
      EMPTY_REQUEST: 'Add at least one signal before requesting an analysis.',
      INVALID_INPUT: message || 'Invalid input. Please check your submission and try again.',
      INVALID_STYLE: message || 'The requested coaching style is not recognized.',
      TEXT_TOO_LONG: 'Your text message exceeds the maximum allowed length of 10,000 characters. Please shorten it.',
      UPLOAD_TOO_LARGE: 'The uploaded file is too large. Images must be 5 MB or less, and audio must be 10 MB or less.',
      UNSUPPORTED_MEDIA_TYPE: 'Unsupported file format. Please upload a valid image (JPEG/PNG/WEBP) or audio (MP3/WAV/OGG/WEBM).',
      MALFORMED_IMAGE: 'The selected image could not be processed. Please try another image file.',
      MALFORMED_AUDIO: 'The selected audio file could not be processed. Please try another recording.',
      MODEL_UNAVAILABLE: 'The emotion analysis service is currently unavailable. Please try again later.',
      MODEL_TIMEOUT: 'The analysis service took too long to respond. Please try again.',
      RATE_LIMITED: 'You have sent too many requests. Please wait a moment and try again.',
      INTERNAL_ERROR: 'The server encountered an unexpected error processing your request. Please try again.',
    };

    if (code && errorMap[code]) {
      return errorMap[code];
    }
    if (message && typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }

  switch (status) {
    case 400:
      return 'Invalid request. Please verify your input and try again.';
    case 413:
      return 'The uploaded file exceeds the maximum allowed size.';
    case 415:
      return 'Unsupported file format. Please upload a supported image or audio file.';
    case 422:
      return 'Validation failed. Please ensure at least one valid input signal is provided.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 502:
      return 'The model provider returned an invalid response. Please try again.';
    case 503:
      return 'The emotion analysis service is currently unavailable. Please try again later.';
    case 504:
      return 'The analysis request timed out. Please check your connection and try again.';
    default:
      return `Server error (${status}). Please try again later.`;
  }
}

/**
 * Fetch wrapper that attaches a timeout signal and maps network/timeout failures.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new TimeoutError('The request timed out. The server took too long to respond. Please try again.');
    }
    if (err instanceof TypeError || err.message?.includes('fetch') || err.message?.includes('NetworkError')) {
      throw new NetworkError(
        `Unable to reach the backend server at ${BASE_URL || DEFAULT_API_BASE_URL}. Please ensure the server is running.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Sends text / image / audio to the backend analysis endpoint.
 *
 * @param {{ text?: string, image?: File, audio?: File }} payload
 * @param {{ useMock?: boolean, baseUrl?: string, timeoutMs?: number }} [options]
 * @returns {Promise<AnalysisResult>}
 * @throws {Error} with a user-friendly message
 */
export async function analyzeContent({ text, image, audio }, options = {}) {
  if (!text && !image && !audio) {
    throw new Error('Add at least one signal before requesting an analysis.');
  }

  const useMock = options.useMock !== undefined ? options.useMock : USE_MOCK;
  const baseUrl = options.baseUrl || BASE_URL;

  if (useMock) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
    if (text?.toLowerCase().includes('[error]')) {
      throw new Error('The mock service could not process this sample. Remove [error] and try again.');
    }
    return normalizeAnalysisResult(createMockResult({ text, image, audio }));
  }

  if (!baseUrl) {
    throw new NotConnectedError();
  }

  const form = new FormData();
  if (text) form.append('text', text);
  if (image) form.append('image', image);
  if (audio) form.append('audio', audio);

  const response = await fetchWithTimeout(
    `${baseUrl}/analyze`,
    {
      method: 'POST',
      body: form,
      headers: options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {},
    },
    options.timeoutMs ?? ANALYSIS_REQUEST_TIMEOUT_MS
  );

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch {
      // Body was not JSON
    }
    const message = mapBackendError(response.status, errorData);
    throw new Error(message);
  }

  const json = await response.json();
  return normalizeAnalysisResult(json);
}

/**
 * Sends text to the conversation coach endpoint to reframe delivery.
 *
 * @param {{ text: string, style: string }} payload
 * @param {{ useMock?: boolean, baseUrl?: string, timeoutMs?: number }} [options]
 * @returns {Promise<CoachResult>}
 * @throws {Error} with a user-friendly message
 */
export async function coachText({ text, style }, options = {}) {
  if (!text?.trim()) {
    throw new Error('Enter a sentence before using the conversation coach.');
  }

  const useMock = options.useMock !== undefined ? options.useMock : USE_MOCK;
  const baseUrl = options.baseUrl || BASE_URL;

  if (useMock) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
    if (text.toLowerCase().includes('[error]')) {
      throw new Error('The mock coach could not process this sentence. Remove [error] and try again.');
    }
    return createMockCoachResult({ text, style });
  }

  if (!baseUrl) {
    throw new NotConnectedError();
  }

  const response = await fetchWithTimeout(
    `${baseUrl}/coach`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      },
      body: JSON.stringify({ text: text.trim(), style }),
    },
    options.timeoutMs ?? COACH_REQUEST_TIMEOUT_MS
  );

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch {
      // Body was not JSON
    }
    const message = mapBackendError(response.status, errorData);
    throw new Error(message);
  }

  const json = await response.json();
  return normalizeCoachResult(json);
}

