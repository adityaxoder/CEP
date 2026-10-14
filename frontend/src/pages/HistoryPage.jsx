/**
 * HistoryPage – session-only history with modality summaries and status tags.
 *
 * No persistence — clears when the tab is closed/refreshed.
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

export function HistoryPage({ history, onClear, onNavigate }) {
  return (
    <main id="main-content" className="history-page">
      <div className="page-intro">
        <h1 className="page-title">
          <Clock size={22} aria-hidden="true" />
          Observations History
        </h1>
        <p className="page-subtitle">Session-only — not saved to any server or device.</p>
        <div className="history-notice" role="note">
          <Info size={13} aria-hidden="true" />
          <span>
            Refreshing or closing this tab permanently clears the list.
            No content or results are stored anywhere.
          </span>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="history-empty">
          <Clock size={52} className="history-empty-icon" aria-hidden="true" />
          <p className="history-empty-title">No analyses yet this session</p>
          <p className="history-empty-hint">
            Go to Analyse and submit some content to see results here.
          </p>
          <button type="button" className="btn-primary" onClick={() => onNavigate?.('multimodal')}>
            <ArrowRight size={14} aria-hidden="true" /> Start an analysis
          </button>
        </div>
      ) : (
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="section-card-title">
              {history.length} run{history.length !== 1 ? 's' : ''} this session
            </h2>
            <button
              type="button"
              className="clear-btn"
              onClick={onClear}
              aria-label="Clear session history"
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
                    return `${LABELS[m]}: ${d.label} (${getConfidencePercent(d.confidence)}%)`;
                  })
                  .join(' · ') || 'No results';

                return (
                  <li key={entry.id} className="history-item">
                    {/* Left text */}
                    <div className="history-item-left">
                      <p className="history-item-id">P{String(runNum).padStart(2, '0')}</p>
                      <p className="history-item-desc" title={modalitySummary}>{modalitySummary}</p>
                      <span className="history-item-time">Today at {entry.timestamp}</span>
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
