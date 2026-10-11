/**
 * ResultsPanel – renders the complete analysis result once status === 'success'.
 */
import { AlertTriangle, Lightbulb } from 'lucide-react';
import { ModalityCard } from './ModalityCard';

export function ResultsPanel({ result, provided }) {
  const { modalities = {}, mismatch, suggestion } = result;

  return (
    <section className="results-panel section-card" aria-label="Analysis results">
      <div className="section-card-header">
        <h2 className="section-card-title">Analysis Results</h2>
      </div>
      <div className="section-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Disclaimer */}
        <div className="results-disclaimer" role="note">
          <AlertTriangle size={13} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
          These are <strong>estimates</strong> based on observable cues, not a
          diagnosis or proof of what someone truly feels.
        </div>

        {/* Modality cards — 3-col grid */}
        <div className="results-modality-grid">
          <ModalityCard modality="text"  data={modalities.text}  missing={!provided.text} />
          <ModalityCard modality="image" data={modalities.image} missing={!provided.image} />
          <ModalityCard modality="audio" data={modalities.audio} missing={!provided.audio} />
        </div>

        {/* Cue mismatch */}
        {mismatch?.detected && (
          <div className="mismatch-notice" role="alert">
            <AlertTriangle size={15} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="mismatch-title">Possible cue mismatch detected</p>
              <p className="mismatch-desc">{mismatch.description}</p>
            </div>
          </div>
        )}

        {/* Communication suggestion */}
        {suggestion && (
          <div className="suggestion-box">
            <Lightbulb size={15} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="suggestion-title">Communication suggestion</p>
              <p className="suggestion-text">{suggestion}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
