import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  analyzeContent,
  coachText,
  mapBackendError,
  NetworkError,
  NotConnectedError,
  TimeoutError,
} from '../api/emotionClient';

describe('API Routes, Integration & Error Mapping', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('mapBackendError', () => {
    it('maps EMPTY_REQUEST error code to user message', () => {
      const msg = mapBackendError(422, { code: 'EMPTY_REQUEST', message: 'Raw backend msg' });
      expect(msg).toBe('Add at least one signal before requesting an analysis.');
    });

    it('maps UPLOAD_TOO_LARGE error code to user message', () => {
      const msg = mapBackendError(413, { code: 'UPLOAD_TOO_LARGE', message: 'Too large' });
      expect(msg).toContain('uploaded file is too large');
    });

    it('maps UNSUPPORTED_MEDIA_TYPE error code to user message', () => {
      const msg = mapBackendError(415, { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Bad mime' });
      expect(msg).toContain('Unsupported file format');
    });

    it('maps MALFORMED_IMAGE error code to user message', () => {
      const msg = mapBackendError(422, { code: 'MALFORMED_IMAGE', message: 'Corrupt' });
      expect(msg).toContain('image could not be processed');
    });

    it('maps MALFORMED_AUDIO error code to user message', () => {
      const msg = mapBackendError(422, { code: 'MALFORMED_AUDIO', message: 'Corrupt' });
      expect(msg).toContain('audio file could not be processed');
    });

    it('maps MODEL_UNAVAILABLE error code to user message', () => {
      const msg = mapBackendError(503, { code: 'MODEL_UNAVAILABLE', message: 'Unavailable' });
      expect(msg).toContain('currently unavailable');
    });

    it('maps MODEL_TIMEOUT error code to user message', () => {
      const msg = mapBackendError(504, { code: 'MODEL_TIMEOUT', message: 'Timeout' });
      expect(msg).toContain('took too long to respond');
    });

    it('maps RATE_LIMITED error code to user message', () => {
      const msg = mapBackendError(429, { code: 'RATE_LIMITED', message: 'Rate limited' });
      expect(msg).toContain('too many requests');
    });

    it('falls back to HTTP status codes when code is unknown', () => {
      expect(mapBackendError(413, null)).toContain('exceeds the maximum allowed size');
      expect(mapBackendError(415, null)).toContain('Unsupported file format');
      expect(mapBackendError(422, null)).toContain('Validation failed');
      expect(mapBackendError(429, null)).toContain('Too many requests');
      expect(mapBackendError(503, null)).toContain('service is currently unavailable');
      expect(mapBackendError(504, null)).toContain('request timed out');
      expect(mapBackendError(500, null)).toContain('Server error (500)');
    });
  });

  describe('analyzeContent with mock disabled', () => {
    it('throws NotConnectedError when baseUrl is missing in non-mock mode', async () => {
      await expect(
        analyzeContent(
          { text: 'Hello' },
          { useMock: false, baseUrl: null }
        )
      ).rejects.toBeInstanceOf(NotConnectedError);
    });

    it('successfully posts multipart/form-data and normalizes live backend response', async () => {
      const mockBackendResponse = {
        requestId: 'req-12345',
        modalities: {
          text: { label: 'Calm', confidence: 0.85, explanation: 'Measured tone' },
          image: null,
          audio: null,
        },
        summary: 'This message sounds calm.',
        improvement: 'Keep it up.',
        mismatch: { detected: false, description: '' },
        suggestion: null,
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      });

      const result = await analyzeContent(
        { text: 'Meeting is scheduled for tomorrow.' },
        { useMock: false, baseUrl: 'http://localhost:8000' }
      );

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:8000/analyze',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
      expect(result.requestId).toBe('req-12345');
      expect(result.modalities.text.label).toBe('Calm');
      expect(result.modalities.image).toBeNull();
      expect(result.modalities.audio).toBeNull();
      expect(result.summary).toBe('This message sounds calm.');
    });

    it('maps 422 empty request backend error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          code: 'EMPTY_REQUEST',
          message: 'Add at least one signal before requesting an analysis.',
        }),
      });

      await expect(
        analyzeContent(
          { text: 'some text' },
          { useMock: false, baseUrl: 'http://localhost:8000' }
        )
      ).rejects.toThrow('Add at least one signal before requesting an analysis.');
    });

    it('maps 413 oversized file backend error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 413,
        json: async () => ({
          code: 'UPLOAD_TOO_LARGE',
          message: 'Image file exceeds maximum allowed size of 5 MB.',
        }),
      });

      await expect(
        analyzeContent(
          { image: new File(['x'], 'big.png', { type: 'image/png' }) },
          { useMock: false, baseUrl: 'http://localhost:8000' }
        )
      ).rejects.toThrow(/uploaded file is too large/i);
    });

    it('handles network failure gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(
        analyzeContent(
          { text: 'Hello' },
          { useMock: false, baseUrl: 'http://localhost:8000' }
        )
      ).rejects.toBeInstanceOf(NetworkError);
    });

    it('handles request timeout gracefully', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError);

      await expect(
        analyzeContent(
          { text: 'Hello' },
          { useMock: false, baseUrl: 'http://localhost:8000' }
        )
      ).rejects.toBeInstanceOf(TimeoutError);
    });
  });

  describe('coachText with mock disabled', () => {
    it('successfully sends JSON to /coach and normalizes response', async () => {
      const mockCoachResponse = {
        requestId: 'coach-999',
        originalText: 'Please send report.',
        style: 'formal',
        reframedText: 'Please be advised that the report is requested.',
        explanation: 'Reframed formally.',
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockCoachResponse,
      });

      const result = await coachText(
        { text: 'Please send report.', style: 'formal' },
        { useMock: false, baseUrl: 'http://localhost:8000' }
      );

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:8000/coach',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Please send report.', style: 'formal' }),
        })
      );
      expect(result.requestId).toBe('coach-999');
      expect(result.reframedText).toBe('Please be advised that the report is requested.');
      expect(result.style).toBe('formal');
    });

    it('handles coach network error gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(
        coachText(
          { text: 'Please send report.', style: 'formal' },
          { useMock: false, baseUrl: 'http://localhost:8000' }
        )
      ).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
