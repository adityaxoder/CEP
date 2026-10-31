/**
 * HistoryPage – saved local analysis history for the signed-in account.
 */
import { ArrowRight, Clock, Info, Trash2 } from 'lucide-react';

/* Pseudo-random bar heights for mini chart decoration */
function getMiniBarHeights(seed) {
  return Array.from({ length: 10 }, (_, i) => {
    const v = Math.sin((seed + i) * 1.7) * 0.4 + Math.cos((seed + i) * 0.9) * 0.3 + 0.55;
    return Math.max(8, Math.round(v * 36));
  });
}

const LABELS = { text: 'Text', image: 'Image', audio: 'Voice' };

function getConfidencePercent(confidence) {
  const value = Number(confidence);
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(1, Math.max(0, value)) * 100);
}

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const iso = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}

export function HistoryPage({ history, loading, error, onClear, onDelete, onRefresh, onNavigate }) {
  return (
    <main id="main-content" className="history-page">
      <div className="page-intro">
        <h1 className="page-title">
          <Clock size={22} aria-hidden="true" />
          Observations History
        </h1>
        <p className="page-subtitle">Your completed analysis results are saved in this app’s local database and kept separate by username.</p>
        <div className="history-notice" role="note">
          <Info size={13} aria-hidden="true" />
          <span>
            Results remain available after you sign out or refresh. Uploaded image and audio files are not saved. You can delete one result or clear your history below.
          </span>
        </div>
      </div>

      {error && <div className="history-error" role="alert"><span>{error}</span><button type="button" className="btn-ghost" onClick={onRefresh} disabled={loading}>Retry</button></div>}

      {loading ? (
        <div className="history-empty" role="status">Loading your saved analyses…</div>
      ) : error && history.length === 0 ? (
        <div className="history-empty">Your saved history could not be loaded. Use Retry to try again.</div>
      ) : history.length === 0 ? (
        <div className="history-empty">
          <Clock size={52} className="history-empty-icon" aria-hidden="true" />
          <p className="history-empty-title">No saved analyses yet</p>
          <p className="history-empty-hint">
            Complete an analysis and it will appear here for this account.
          </p>
          <button type="button" className="btn-primary" onClick={() => onNavigate?.('multimodal')}>
            <ArrowRight size={14} aria-hidden="true" /> Start an analysis
          </button>
        </div>
      ) : (
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="section-card-title">
              {history.length} saved analysis{history.length !== 1 ? 'es' : ''}
            </h2>
            <button
              type="button"
              className="clear-btn"
              onClick={onClear}
              disabled={loading}
              aria-label="Clear all saved analysis history"
            >
              <Trash2 size={13} aria-hidden="true" />
              Clear
            </button>
          </div>

          <div className="section-card-body history-card-body">
            <ol className="history-list" aria-label="Analysis history">
              {history.map((entry, idx) => {
                const runNum   = history.length - idx;
                const barHeights = getMiniBarHeights(entry.id % 100);
                const isCritical = (entry.result?.mismatch?.detected) ?? false;

                /* Summarise which modalities have data */
                const modalitySummary = ['text', 'image', 'audio']
                  .filter((m) => entry.provided[m] && entry.result?.modalities?.[m])
                  .map((m) => {
                    const d = entry.result.modalities[m];
                    return d.confidence === null || d.confidence === undefined
                      ? `${LABELS[m]}: ${d.label}`
                      : `${LABELS[m]}: ${d.label} (${getConfidencePercent(d.confidence)}%)`;
                  })
                  .join(' · ') || 'No results';
                const details = ['text', 'image', 'audio']
                  .filter((modality) => entry.provided[modality] && entry.result?.modalities?.[modality])
                  .map((modality) => ({ modality, ...entry.result.modalities[modality] }));

                return (
                  <li key={entry.id} className="history-item">
                    {/* Left text */}
                    <div className="history-item-left">
                      <p className="history-item-id">P{String(runNum).padStart(2, '0')}</p>
                      <p className="history-item-desc" title={modalitySummary}>{modalitySummary}</p>
                      <span className="history-item-time">{formatDate(entry.createdAt)}</span>
                      <details className="history-item-details">
                        <summary>View saved result</summary>
                        {entry.result?.summary && <p>{entry.result.summary}</p>}
                        <div className="history-detail-signals">
                          {details.map((detail) => (
                            <section key={detail.modality}>
                              <strong>{LABELS[detail.modality]}: {detail.label}</strong>
                              {detail.description && <p>{detail.description}</p>}
                              {detail.explanation && <p>{detail.explanation}</p>}
                              {detail.evidence?.length > 0 && <p><strong>Wording evidence:</strong> {detail.evidence.join(', ')}</p>}
                            </section>
                          ))}
                        </div>
                        {entry.result?.improvement && <p><strong>Could be clearer:</strong> {entry.result.improvement}</p>}
                        {entry.result?.mismatch?.detected && <p className="history-detail-mismatch"><strong>Possible cue mismatch:</strong> {entry.result.mismatch.description}</p>}
                        {entry.result?.suggestion && <p><strong>Suggestion:</strong> {entry.result.suggestion}</p>}
                      </details>
                    </div>

                    {/* Mini bar chart */}
                    <div className="history-mini-bars" aria-hidden="true">
                      {barHeights.map((h, i) => (
                        <div
                          key={i}
                          className={`history-mini-bar ${i >= barHeights.length - 3 ? 'history-mini-bar--active' : ''}`}
                          style={{ height: h }}
                        />
                      ))}
                    </div>

                    {/* Tag pills */}
                    <div className="history-item-tags">
                      {isCritical && (
                        <span className="tag-pill tag-pill--critical">Mismatch</span>
                      )}
                      {entry.provided.text  && <span className="tag-pill tag-pill--insight">Text</span>}
                      {entry.provided.image && <span className="tag-pill tag-pill--insight">Image</span>}
                      {entry.provided.audio && <span className="tag-pill tag-pill--insight">Voice</span>}
                      <button type="button" className="history-entry-delete" onClick={() => onDelete?.(entry.id)} disabled={loading} aria-label={`Delete analysis ${runNum}`} title="Delete this analysis">
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </main>
  );
}
