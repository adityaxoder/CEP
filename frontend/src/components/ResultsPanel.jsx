/**
 * ResultsPanel – renders the complete analysis result once status === 'success'.
 */
import { AlertTriangle, Lightbulb, RotateCcw } from 'lucide-react';
import { ModalityCard } from './ModalityCard';

export function ResultsPanel({ result, provided, onStartNew }) {
  const { modalities = {}, mismatch, suggestion, summary, improvement } = result;
  const providedModalities = ['text', 'image', 'audio'].filter((modality) => provided?.[modality]);
  const signalLabel = `${providedModalities.length} signal${providedModalities.length === 1 ? '' : 's'} analysed`;
  const requestLabel = result.requestId || 'Request ID unavailable';

  return (
    <section className="results-panel section-card" aria-label="Analysis results">
      <div className="section-card-header">
        <h2 className="section-card-title">Analysis Results</h2>
        <div className="results-context" aria-label={`Request ${requestLabel}; ${signalLabel}`}>
          <span className="results-request-id" title={requestLabel}>Request {requestLabel}</span>
          <span>{signalLabel}</span>
        </div>
      </div>
      <div className="section-card-body results-stack">

        {/* Disclaimer */}
        <div className="results-disclaimer" role="note">
          <AlertTriangle size={13} className="notice-icon" aria-hidden="true" />
          These are <strong>estimates</strong> based on observable cues, not a
          diagnosis or proof of what someone truly feels.
        </div>

        {/* Modality cards — 3-col grid */}
        <div className="results-modality-grid">
          <ModalityCard modality="text"  data={modalities.text}  missing={!provided.text} />
          <ModalityCard modality="image" data={modalities.image} missing={!provided.image} />
          <ModalityCard modality="audio" data={modalities.audio} missing={!provided.audio} />
        </div>

        {(summary || improvement) && (
          <div className="results-insight-grid">
            {summary && (
              <div className="results-insight">
                <p className="results-insight-title">Conversation tone summary</p>
                <p className="results-insight-text">{summary}</p>
              </div>
            )}
            {improvement && (
              <div className="results-insight results-insight--improvement">
                <p className="results-insight-title">What could be clearer</p>
                <p className="results-insight-text">{improvement}</p>
              </div>
            )}
          </div>
        )}

        {/* Cue mismatch */}
        {mismatch?.detected && (
          <div className="mismatch-notice" role="alert">
            <AlertTriangle size={15} className="notice-icon" aria-hidden="true" />
            <div>
              <p className="mismatch-title">Possible cue mismatch detected</p>
              <p className="mismatch-desc">{mismatch.description}</p>
            </div>
          </div>
        )}

        {/* Communication suggestion */}
        {suggestion && (
          <div className="suggestion-box">
            <Lightbulb size={15} className="notice-icon" aria-hidden="true" />
            <div>
              <p className="suggestion-title">Communication suggestion</p>
              <p className="suggestion-text">{suggestion}</p>
            </div>
          </div>
        )}

        <div className="results-actions">
          <button type="button" className="btn-primary" onClick={onStartNew}>
            <RotateCcw size={14} aria-hidden="true" /> Start another analysis
          </button>
        </div>
      </div>
    </section>
  );
}
