/**
 * useAnalysis – custom hook that owns the analysis lifecycle.
 *
 * State machine:
 *   idle → loading → success
 *                 ↘ error (generic)
 *                 ↘ not-connected
 */
import { useState, useCallback } from 'react';
import { analyzeContent, NotConnectedError } from '../api/emotionClient';

export function useAnalysis(accessToken) {
  const [status, setStatus]   = useState('idle');   // idle | loading | success | error | not-connected
  const [result, setResult]   = useState(null);
  const [errorMsg, setError]  = useState('');

  const analyze = useCallback(async (payload) => {
    setStatus('loading');
    setResult(null);
    setError('');
    try {
      const data = await analyzeContent(payload, { accessToken });
      setResult(data);
      setStatus('success');
      return data;
    } catch (err) {
      if (err instanceof NotConnectedError) {
        setStatus('not-connected');
      } else {
        setError(err.message || 'An unexpected error occurred.');
        setStatus('error');
      }
    }
  }, [accessToken]);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError('');
  }, []);

  return { status, result, errorMsg, analyze, reset };
}
