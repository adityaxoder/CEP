import { useState } from 'react';
import { AlertCircle, Info, Loader2, RotateCcw, WandSparkles, WifiOff } from 'lucide-react';
import { coachText, NotConnectedError } from '../api/emotionClient';

const STYLE_OPTIONS = [
  { value: 'light', label: 'Light', description: 'Relaxed and easygoing' },
  { value: 'strict', label: 'Strict', description: 'Direct and firm' },
  { value: 'happy', label: 'Happy', description: 'Warm and upbeat' },
  { value: 'sad', label: 'Sad', description: 'Gentle and concerned' },
  { value: 'formal', label: 'Formal', description: 'Professional and polished' },
  { value: 'informal', label: 'Informal', description: 'Natural and casual' },
];

export function CoachPage() {
  const [text, setText] = useState('');
  const [style, setStyle] = useState('light');
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastPayload, setLastPayload] = useState(null);

  const canSubmit = Boolean(text.trim()) && status !== 'loading';
  const selectedStyle = STYLE_OPTIONS.find((option) => option.value === style);

  function reset() {
    setText('');
    setStyle('light');
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
    setLastPayload(null);
  }

  async function submit(payload = { text: text.trim(), style }) {
    if (!payload.text || status === 'loading') return;
    setLastPayload(payload);
    setResult(null);
    setErrorMsg('');
    setStatus('loading');

    try {
      const nextResult = await coachText(payload);
      setResult(nextResult);
      setStatus('success');
    } catch (error) {
      if (error instanceof NotConnectedError) {
        setStatus('not-connected');
        return;
      }
      setErrorMsg(error.message || 'The coach could not reframe this sentence.');
      setStatus('error');
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    submit();
  }

  return (
    <main id="main-content" className="workspace-page coach-page">
      <div className="workspace-heading">
        <div>
          <span className="workspace-kicker">BRAINIACCONVO COACH</span>
          <h1>Conversation Coach</h1>
          <p>Rewrite one sentence in a tone that fits the moment without changing what you mean.</p>
        </div>
        <div className="workspace-count">06 / 06</div>
      </div>

      <section className="coach-workspace section-card" aria-busy={status === 'loading'}>
        <div className="analysis-workspace-header">
          <div className="analysis-mode-icon"><WandSparkles size={20} aria-hidden="true" /></div>
          <div>
            <h2>Choose how it should sound</h2>
            <p>Type a sentence, choose a style, and review the suggested reframe.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="coach-form">
          <div className="coach-field">
            <label className="coach-field-label" htmlFor="coach-text-input">Your sentence</label>
            <textarea
              id="coach-text-input"
              className="text-textarea coach-textarea"
              rows={5}
              maxLength={1000}
              placeholder="Example: Please send me the report today."
              value={text}
              onChange={(event) => setText(event.target.value)}
              aria-describedby="coach-input-hint coach-char-count"
            />
            <span id="coach-input-hint" className="coach-field-hint">The mock coach keeps your intent and changes the delivery.</span>
            <span id="coach-char-count" className="char-count">{text.length} / 1000 characters</span>
          </div>

          <fieldset className="coach-style-fieldset">
            <legend>Desired style</legend>
            <div className="coach-style-grid">
              {STYLE_OPTIONS.map((option) => (
                <label key={option.value} className={`coach-style-option ${style === option.value ? 'coach-style-option--selected' : ''}`}>
                  <input
                    type="radio"
                    name="coach-style"
                    value={option.value}
                    checked={style === option.value}
                    onChange={(event) => setStyle(event.target.value)}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {!text.trim() && status === 'idle' && (
            <div className="empty-input-guidance" role="status" aria-live="polite">
              <Info size={14} aria-hidden="true" />
              <span>Enter a sentence to see a {selectedStyle.label.toLowerCase()} reframe here.</span>
            </div>
          )}

          <div className="coach-actions">
            <button type="submit" className="analyze-btn" disabled={!canSubmit}>
              {status === 'loading' ? <><Loader2 size={16} className="spin" /> Reframing...</> : <><WandSparkles size={16} /> Reframe sentence</>}
            </button>
            {(text || result || status !== 'idle') && (
              <button type="button" className="reset-btn" onClick={reset}>
                <RotateCcw size={14} aria-hidden="true" /> Reset
              </button>
            )}
          </div>
        </form>

        {status === 'success' && result && (
          <section className="coach-result" aria-labelledby="coach-result-heading">
            <div className="coach-result-header">
              <div>
                <span className="workspace-kicker">{selectedStyle.label.toUpperCase()} REFRAME</span>
                <h2 id="coach-result-heading">Suggested wording</h2>
              </div>
              <span className="coach-result-badge">Estimate</span>
            </div>
            <blockquote>{result.reframedText}</blockquote>
            <p className="coach-result-note">{result.explanation}</p>
            <p className="coach-result-original"><strong>Original:</strong> {result.originalText}</p>
          </section>
        )}
      </section>

      {status === 'not-connected' && (
        <div className="status-panel status-panel--warn" role="status" aria-live="polite">
          <WifiOff size={27} aria-hidden="true" />
          <p className="status-title">Conversation Coach is not connected yet</p>
          <p className="status-body">Set the backend API base URL or keep mock mode enabled to generate reframes.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="status-panel status-panel--error" role="alert">
          <AlertCircle size={27} aria-hidden="true" />
          <p className="status-title">Coach request failed</p>
          <p className="status-body">{errorMsg} Edit the sentence or reset it before trying again.</p>
          <button type="button" className="btn-ghost" onClick={() => lastPayload && submit(lastPayload)} disabled={!lastPayload}>Try again</button>
        </div>
      )}
    </main>
  );
}
