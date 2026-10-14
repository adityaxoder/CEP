import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeContent, coachText } from '../api/emotionClient';

async function resolveMock(payload) {
  const resultPromise = analyzeContent(payload);
  await vi.advanceTimersByTimeAsync(900);
  return resultPromise;
}

describe('analyzeContent mock service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects an empty request', async () => {
    await expect(analyzeContent({})).rejects.toThrow('Add at least one signal');
  });

  it('returns the expected shape and null for missing modalities', async () => {
    const result = await resolveMock({ text: 'Thanks for your help.' });

    expect(result.requestId).toMatch(/^mock-/);
    expect(result.modalities.text).toMatchObject({
      label: 'Warm',
      confidence: expect.any(Number),
      explanation: expect.any(String),
    });
    expect(result.modalities.image).toBeNull();
    expect(result.modalities.audio).toBeNull();
    expect(result.mismatch.detected).toBe(false);
    expect(result.suggestion).toBeNull();
    expect(result.summary).toMatch(/word message is estimated to sound warm/i);
    expect(result.improvement).toMatch(/direct request/i);
  });

  it('returns a mismatch and suggestion for conflicting demo cues', async () => {
    const result = await resolveMock({
      text: 'I am worried about this issue.',
      image: new File(['image'], 'happy-smile.png', { type: 'image/png' }),
    });

    expect(result.mismatch.detected).toBe(true);
    expect(result.mismatch.description).toMatch(/not aligned/i);
    expect(result.mismatch.description).toMatch(/not evidence of deception/i);
    expect(result.suggestion).toMatch(/clarifying question/i);
  });

  it('exposes the documented mock failure trigger', async () => {
    const rejection = expect(
      analyzeContent({ text: 'Use [error] for the failure demo.' }),
    ).rejects.toThrow('Remove [error] and try again');
    await vi.advanceTimersByTimeAsync(900);

    await rejection;
  });

  it('reframes coach text for the requested style', async () => {
    const resultPromise = coachText({ text: 'Please send the report.', style: 'formal' });
    await vi.advanceTimersByTimeAsync(900);
    const result = await resultPromise;

    expect(result.requestId).toMatch(/^mock-coach-/);
    expect(result.originalText).toBe('Please send the report.');
    expect(result.style).toBe('formal');
    expect(result.reframedText).toMatch(/please be advised/i);
    expect(result.explanation).toMatch(/formal delivery/i);
  });

  it('rejects empty coach text and supports the coach failure trigger', async () => {
    await expect(coachText({ text: ' ', style: 'light' })).rejects.toThrow('Enter a sentence');

    const rejection = expect(
      coachText({ text: '[error] coach failure', style: 'light' }),
    ).rejects.toThrow('Remove [error] and try again');
    await vi.advanceTimersByTimeAsync(900);
    await rejection;
  });
});
