import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeContent } from '../api/emotionClient';

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
});
