/** Per-account history showing the original submitted inputs and saved results. */
import { ArrowRight, Clock, Trash2 } from 'lucide-react';

const LABELS = { text: 'Text', image: 'Image', audio: 'Voice' };

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const iso = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}

function InputContents({ entry }) {
  const inputs = entry.inputs || {};
  const hasSavedInput = Boolean(inputs.text || inputs.imageName || inputs.audioName);
  if (!hasSavedInput) {
    return <p className="history-input-empty">Input details weren’t saved for this older analysis.</p>;
  }

  return (
    <div className="history-input-list">
      {entry.provided?.text && <p className="history-input-text">{inputs.text || 'Text input unavailable'}</p>}
      {entry.provided?.image && (
        <div className="history-file-input"><span>Image</span><strong>{inputs.imageName || 'Image submitted'}</strong></div>
      )}
      {entry.provided?.audio && (
        <div className="history-file-input"><span>Voice</span><strong>{inputs.audioName || 'Audio submitted'}</strong></div>
      )}
    </div>
  );
}

function AnalysisOutput({ entry }) {
  const result = entry.result || {};
  const modalities = result.modalities || {};
  const available = ['text', 'image', 'audio'].filter((modality) => entry.provided?.[modality] && modalities[modality]);

  return (
    <section className="history-entry-panel history-entry-output" aria-label="Analysis output">
      <h3>Analysis output</h3>
      {result.summary && <p className="history-output-summary">{result.summary}</p>}
      <div className="history-output-signals">
        {available.map((modality) => {
          const detail = modalities[modality];
          return (
            <article className="history-output-signal" key={modality}>
              <div className="history-output-signal-heading">
                <span>{LABELS[modality]}</span>
                <strong>{detail.label}</strong>
              </div>
              {detail.description && <p>{detail.description}</p>}
              {modality !== 'text' && detail.explanation && <p>{detail.explanation}</p>}
              {detail.evidence?.length > 0 && <p><strong>Matched wording:</strong> {detail.evidence.join(', ')}</p>}
            </article>
          );
        })}
      </div>
      {result.mismatch?.detected && (
        <p className="history-output-callout"><strong>Possible cue mismatch:</strong> {result.mismatch.description}</p>
      )}
      {result.improvement && <p className="history-output-extra"><strong>Could be clearer:</strong> {result.improvement}</p>}
      {result.suggestion && <p className="history-output-extra"><strong>Suggestion:</strong> {result.suggestion}</p>}
      {!result.summary && available.length === 0 && <p className="history-input-empty">No output details are available.</p>}
    </section>
  );
}

export function HistoryPage({ history, loading, error, onClear, onDelete, onRefresh, onNavigate }) {
  return (
    <main id="main-content" className="history-page">
      <div className="page-intro">
        <h1 className="page-title"><Clock size={25} aria-hidden="true" /> Analysis History</h1>
      </div>

      {error && <div className="history-error" role="alert"><span>{error}</span><button type="button" className="btn-ghost" onClick={onRefresh} disabled={loading}>Retry</button></div>}

      {loading ? (
        <div className="history-empty" role="status">Loading history…</div>
      ) : error && history.length === 0 ? (
        <div className="history-empty">History couldn’t be loaded. Use Retry to try again.</div>
      ) : history.length === 0 ? (
        <div className="history-empty">
          <Clock size={52} className="history-empty-icon" aria-hidden="true" />
          <p className="history-empty-title">No saved analyses yet</p>
          <p className="history-empty-hint">Complete an analysis to see its input and result here.</p>
          <button type="button" className="btn-primary" onClick={() => onNavigate?.('multimodal')}>
            <ArrowRight size={14} aria-hidden="true" /> Start an analysis
          </button>
        </div>
      ) : (
        <section className="section-card history-card" aria-label="Saved analyses">
          <div className="section-card-header">
            <h2 className="section-card-title">{history.length} saved analysis{history.length !== 1 ? 'es' : ''}</h2>
            <button type="button" className="clear-btn" onClick={onClear} disabled={loading} aria-label="Clear all saved analysis history">
              <Trash2 size={13} aria-hidden="true" /> Clear all
            </button>
          </div>
          <div className="section-card-body history-card-body">
            <ol className="history-list" aria-label="Analysis history">
              {history.map((entry, index) => (
                <li key={entry.id} className="history-item">
                  <div className="history-item-header">
                    <div>
                      <p className="history-item-id">ANALYSIS {String(history.length - index).padStart(2, '0')}</p>
                      <time className="history-item-time">{formatDate(entry.createdAt)}</time>
                    </div>
                    <button type="button" className="history-entry-delete" onClick={() => onDelete?.(entry.id)} disabled={loading} aria-label={`Delete analysis ${index + 1}`} title="Delete this analysis">
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="history-entry-grid">
                    <section className="history-entry-panel history-entry-input" aria-label="Original user input">
                      <h3>Your input</h3>
                      <InputContents entry={entry} />
                    </section>
                    <AnalysisOutput entry={entry} />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </main>
  );
}
