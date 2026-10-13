/**
 * ModalityCard – matches the reference "Craft Joy / Neutral" card style:
 *   Modality label  •  Status dot chip
 *   Big confidence %
 *   Mini sparkline SVG
 *   Emotion label badge
 *   Explanation text
 */
import { Info, Image as ImageIcon, MessageSquare, Mic } from 'lucide-react';

const MODALITY_ICONS = { text: MessageSquare, image: ImageIcon, audio: Mic };
const MODALITY_LABELS = { text: 'Text', image: 'Image', audio: 'Voice' };

export function ModalityCard({ modality, data, missing }) {
  const Icon  = MODALITY_ICONS[modality];
  const label = MODALITY_LABELS[modality];

  if (missing) {
    return (
      <div className="modality-card modality-card--dim" aria-label={`${label} – not provided`}>
        <div className="modality-card-header">
          <span className="modality-emoji" aria-hidden="true"><Icon size={13} /></span>
          <h3 className="modality-name">{label}</h3>
        </div>
        <p className="modality-status">
          <Info size={13} aria-hidden="true" /> No {label.toLowerCase()} provided
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="modality-card modality-card--dim" aria-label={`${label} – unavailable`}>
        <div className="modality-card-header">
          <span className="modality-emoji" aria-hidden="true"><Icon size={13} /></span>
          <h3 className="modality-name">{label}</h3>
        </div>
        <p className="modality-status">
          <Info size={13} aria-hidden="true" /> Analysis unavailable
        </p>
      </div>
    );
  }

  const pct     = Math.round((data.confidence ?? 0) * 100);
  const isHigh  = pct >= 70;
  const isMid   = pct >= 40 && pct < 70;

  const dotClass    = isHigh ? 'status-dot--green' : isMid ? 'status-dot--amber' : 'status-dot--muted';
  const badgeClass  = isHigh ? 'badge--green'  : isMid  ? 'badge--amber'  : 'badge--rose';
  const fillClass   = isHigh ? 'fill--green'   : isMid  ? 'fill--amber'   : 'fill--rose';
  const confidenceNote = pct >= 70 ? 'confident' : pct >= 40 ? 'moderate' : 'uncertain';

  /* Sparkline */
  const seed = pct / 10;
  const W = 120, H = 36;
  const step = W / 7;
  const rawYs = Array.from({ length: 8 }, (_, i) => {
    const v = (Math.sin((i + seed) * 1.4) * 0.35 + Math.cos((i + seed) * 0.9) * 0.3 + 0.55);
    return H - Math.max(0.05, Math.min(0.95, v)) * (H - 6) - 3;
  });
  const pts      = rawYs.map((y, i) => `${(i * step).toFixed(1)},${y.toFixed(1)}`).join(' ');
  const linePath = `M${pts.replace(/ /g, ' L')}`;
  const areaPath = `M0,${H} L${pts.replace(/ /g, ' L')} L${W},${H} Z`;

  const strokeColor = isHigh ? '#22c55e' : isMid ? '#f59e0b' : '#f43f5e';
  const fillColor   = isHigh ? 'rgba(34,197,94,0.08)' : isMid ? 'rgba(245,158,11,0.08)' : 'rgba(244,63,94,0.08)';

  return (
    <div className="modality-card" aria-label={`${label} modality result`}>
      {/* Header row */}
      <div className="modality-card-header">
        <span className="modality-emoji" aria-hidden="true"><Icon size={13} /></span>
        <h3 className="modality-name">{label}</h3>
        <div className="modality-status-wrap">
          <span className={`status-dot ${dotClass}`} aria-hidden="true" />
          <span className="status-label">Status</span>
        </div>
      </div>

      {/* Big percentage + sparkline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
        <p
          className="modality-pct"
          role="meter"
          aria-label={`Confidence: ${pct}%`}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {pct}%
        </p>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mini-sparkline"
          aria-hidden="true"
          preserveAspectRatio="none"
        >
          <path d={areaPath}  fill={fillColor} />
          <path d={linePath}  fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Confidence bar */}
      <div className="confidence-track" aria-hidden="true">
        <div className={`confidence-fill ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>

      {/* Label badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className={`modality-label-badge ${badgeClass}`}>{data.label}</span>
        <span className="confidence-label">{confidenceNote}</span>
      </div>

      {/* Explanation */}
      {data.explanation && (
        <p className="modality-explanation">{data.explanation}</p>
      )}
    </div>
  );
}
