import { useState } from 'react';
import { AlertCircle, Info, Loader2, RotateCcw, WandSparkles, WifiOff } from 'lucide-react';
import { coachText, NotConnectedError } from '../api/emotionClient';
import { ConsentNotice } from '../components/ConsentNotice';

const STYLE_OPTIONS = [
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'formal', label: 'Formal', description: 'Polite and polished' },
  { value: 'concise', label: 'Concise', description: 'Brief and direct' },
  { value: 'empathetic', label: 'Empathetic', description: 'Considerate and understanding' },
  { value: 'professional', label: 'Professional', description: 'Clear for work or school' },
  { value: 'assertive', label: 'Assertive', description: 'Confident but respectful' },
  { value: 'diplomatic', label: 'Diplomatic', description: 'Tactful around disagreement' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
];

export function CoachPage({ accessToken }) {
  const [text, setText] = useState('');
  const [style, setStyle] = useState('');
  const [consented, setConsented] = useState(false);
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastPayload, setLastPayload] = useState(null);

  const canSubmit = Boolean(text.trim() && style && consented) && status !== 'loading';
  function reset() {
    setText('');
    setStyle('');
    setConsented(false);
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
    setLastPayload(null);
  }

  async function submit(payload = { text: text.trim(), style }) {
    if (!payload.text || !payload.style || !consented || status === 'loading') return;
    setLastPayload(payload);
    setResult(null);
    setErrorMsg('');
    setStatus('loading');
    try {
      setResult(await coachText(payload, { accessToken }));
      setStatus('success');
    } catch (error) {
      if (error instanceof NotConnectedError) {
        setStatus('not-connected');
        return;
      }
      setErrorMsg(error.message || 'The coach could not rewrite this sentence.');
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
          <p>Choose how you want your sentence to sound. The writing assistant will rewrite it while keeping your meaning.</p>
        </div>
        <div className="workspace-count">06 / 06</div>
      </div>

      <section className="coach-workspace section-card" aria-busy={status === 'loading'}>
        <div className="analysis-workspace-header">
          <div className="analysis-mode-icon"><WandSparkles size={20} aria-hidden="true" /></div>
          <div>
            <h2>Pick a style, then rewrite</h2>
            <p>Only the style you select is used for the result.</p>
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
            <span id="coach-input-hint" className="coach-field-hint">You can enter a sentence on any topic. Review the rewrite to make sure it still says what you mean.</span>
            <span id="coach-char-count" className="char-count">{text.length} / 1000 characters</span>
          </div>

          <fieldset className="coach-style-fieldset">
            <legend>How should it sound?</legend>
            <div className="coach-style-grid">
              {STYLE_OPTIONS.map((option) => (
                <label key={option.value} className={`coach-style-option${style === option.value ? ' coach-style-option--selected' : ''}`}>
                  <input
                    type="radio"
                    name="coach-style"
                    value={option.value}
                    checked={style === option.value}
                    onChange={() => setStyle(option.value)}
                  />
                  <span><strong>{option.label}</strong><small>{option.description}</small></span>
                </label>
              ))}
            </div>
          </fieldset>

          {(!text.trim() || !style) && status === 'idle' && (
            <div className="empty-input-guidance" role="status" aria-live="polite">
              <Info size={14} aria-hidden="true" />
              <span>Enter your sentence and choose one style to get started.</span>
            </div>
          )}

          <ConsentNotice checked={consented} onConsent={setConsented} />

          <div className="coach-actions">
            <button type="submit" className="analyze-btn" disabled={!canSubmit}>
              {status === 'loading' ? <><Loader2 size={16} className="spin" /> Rewriting...</> : <><WandSparkles size={16} /> Rewrite in this style</>}
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
                <span className="workspace-kicker">{STYLE_OPTIONS.find((option) => option.value === result.style)?.label || result.style} STYLE</span>
                <h2 id="coach-result-heading">Your rewrite</h2>
              </div>
              <span className="coach-result-badge">AI suggestion</span>
            </div>
            <p className="coach-result-original"><strong>Original:</strong> {result.originalText}</p>
            <blockquote>{result.reframedText}</blockquote>
            <p className="coach-result-note">{result.explanation}</p>
          </section>
        )}
      </section>

      {status === 'not-connected' && (
        <div className="status-panel status-panel--warn" role="status" aria-live="polite">
          <WifiOff size={27} aria-hidden="true" />
          <p className="status-title">Conversation Coach is not connected</p>
          <p className="status-body">Connect to the backend and check that its text service is configured.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="status-panel status-panel--error" role="alert">
          <AlertCircle size={27} aria-hidden="true" />
          <p className="status-title">Coach request failed</p>
          <p className="status-body">{errorMsg}</p>
          <button type="button" className="btn-ghost" onClick={() => lastPayload && submit(lastPayload)} disabled={!lastPayload}>Try again</button>
        </div>
      )}
    </main>
  );
}
