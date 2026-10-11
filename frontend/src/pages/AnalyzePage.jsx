/**
 * AnalyzePage – two-column dashboard layout:
 *
 *  Left column                    Right sidebar
 *  ─────────────────────          ──────────────────────
 *  Stat row (metrics)             Speech Delivery Tracks
 *  Area chart (session trend)       Waveform × 2
 *  Input cards (text/img/voice)   Live Definitions Breakdown
 *  Consent + Analyse button         Modality summary cards
 *  Results panel (on success)
 */
import { useState } from 'react';
import {
  Loader2, AlertCircle, WifiOff, RotateCcw, Sparkles,
} from 'lucide-react';
import { TextInput }     from '../components/TextInput';
import { ImageInput }    from '../components/ImageInput';
import { VoiceInput }    from '../components/VoiceInput';
import { ConsentNotice } from '../components/ConsentNotice';
import { ResultsPanel }  from '../components/ResultsPanel';
import { ModalityCard }  from '../components/ModalityCard';
import { WaveformViz }   from '../components/WaveformViz';
import { AreaChart }     from '../components/AreaChart';
import { useAnalysis }   from '../hooks/useAnalysis';

export function AnalyzePage({ onAnalysisComplete }) {
  const [text,       setText]       = useState('');
  const [imageFile,  setImageFile]  = useState(null);
  const [audioFile,  setAudioFile]  = useState(null);
  const [imageError, setImageError] = useState('');
  const [audioError, setAudioError] = useState('');
  const [consented,  setConsented]  = useState(false);
  const [activeTab,  setActiveTab]  = useState('All');

  const { status, result, errorMsg, analyze, reset } = useAnalysis();

  const hasInput  = text.trim() || imageFile || audioFile;
  const hasErr    = imageError || audioError;
  const canSubmit = hasInput && consented && !hasErr && status !== 'loading';

  const provided = {
    text:  !!text.trim(),
    image: !!imageFile,
    audio: !!audioFile,
  };

  function handleReset() {
    setText(''); setImageFile(null); setAudioFile(null);
    setImageError(''); setAudioError(''); setConsented(false);
    reset();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    const entry = await analyze({
      text:  text.trim() || undefined,
      image: imageFile   || undefined,
      audio: audioFile   || undefined,
    });
    if (entry && onAnalysisComplete) {
      onAnalysisComplete({
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        result: entry,
        provided,
      });
    }
  }

  /* Sidebar shows idle-state preview cards or live results */
  const sidebarData = result?.modalities ?? {};

  return (
    <main id="main-content" className="analyze-page">

      {/* ── Page intro (full width) ── */}
      <div className="page-intro">
        <h1 className="page-title">
          <Sparkles size={22} className="title-sparkle" aria-hidden="true" />
          Live Inquiries &amp; Analysis
        </h1>
        <p className="page-subtitle">
          Submit text, an image, or a voice clip to estimate emotional cues
          across each channel.
        </p>
      </div>

      {/* ══════════════ LEFT COLUMN ══════════════ */}
      <div className="inputs-col">

        {/* Metric stat row */}
        <div className="section-card">
          <div className="section-card-body" style={{ paddingTop: 16, paddingBottom: 16 }}>
            {/* Filter tabs */}
            <div className="filter-tabs" role="tablist" aria-label="Analysis filter">
              {['All', 'Critical', 'Insights', 'Needs Review'].map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={activeTab === t}
                  className={`filter-tab ${activeTab === t ? 'filter-tab--active' : ''}`}
                  onClick={() => setActiveTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Stats */}
            <div className="stat-row">
              <div className="stat-item">
                <p className="stat-value">
                  {status === 'success' && result
                    ? `${Math.round((result.modalities?.text?.confidence ?? 0) * 100)}%`
                    : '—'}
                </p>
                <span className={`stat-badge ${status === 'success' ? 'stat-badge--green' : 'stat-badge--indigo'}`}>
                  {status === 'success' ? '↑ text cue' : 'awaiting'}
                </span>
              </div>
              <div className="stat-item">
                <p className="stat-value">
                  {status === 'success' && result
                    ? `${Math.round((result.modalities?.image?.confidence ?? 0) * 100)}%`
                    : '—'}
                </p>
                <span className={`stat-badge ${status === 'success' ? 'stat-badge--green' : 'stat-badge--indigo'}`}>
                  {status === 'success' ? '↑ image cue' : 'awaiting'}
                </span>
              </div>
              <div className="stat-item">
                <p className="stat-value">
                  {status === 'success' && result
                    ? `${Math.round((result.modalities?.audio?.confidence ?? 0) * 100)}%`
                    : '—'}
                </p>
                <span className="stat-badge stat-badge--indigo">
                  {status === 'success' ? 'voice cue' : 'session'}
                </span>
              </div>
            </div>

            {/* Area chart */}
            <AreaChart status={status} />
          </div>
        </div>

        {/* Input cards */}
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="section-card-title">Provide Content</h2>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              One or more modalities
            </span>
          </div>
          <div className="section-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <TextInput value={text} onChange={setText} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <ImageInput file={imageFile} onFile={setImageFile} onError={setImageError} />
              <VoiceInput file={audioFile} onFile={setAudioFile} onError={setAudioError} />
            </div>

            {(imageError || audioError) && (
              <div className="file-errors" role="alert">
                {imageError && <p className="file-error">{imageError}</p>}
                {audioError && <p className="file-error">{audioError}</p>}
              </div>
            )}

            <ConsentNotice onConsent={setConsented} />

            <form onSubmit={handleSubmit} noValidate aria-label="Analysis form">
              <div className="submit-row">
                <button
                  id="analyze-btn"
                  type="submit"
                  className="analyze-btn"
                  disabled={!canSubmit}
                  aria-disabled={!canSubmit}
                >
                  {status === 'loading' ? (
                    <><Loader2 size={16} className="spin" aria-hidden="true" />Analysing…</>
                  ) : (
                    <><Sparkles size={16} aria-hidden="true" />Analyse</>
                  )}
                </button>

                {status !== 'idle' && (
                  <button type="button" className="reset-btn" onClick={handleReset}>
                    <RotateCcw size={14} aria-hidden="true" /> Reset
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Status panels */}
        {status === 'loading' && (
          <div className="status-panel status-panel--loading" aria-live="polite" aria-busy="true">
            <Loader2 size={30} className="spin" aria-hidden="true" />
            <p>Analysing your content…</p>
          </div>
        )}

        {status === 'not-connected' && (
          <div className="status-panel status-panel--warn" role="status">
            <WifiOff size={30} aria-hidden="true" />
            <p className="status-title">Analysis is not connected yet</p>
            <p className="status-body">
              The backend endpoint has not been configured. See{' '}
              <code>src/api/emotionClient.js</code> for the integration
              checklist.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="status-panel status-panel--error" role="alert">
            <AlertCircle size={30} aria-hidden="true" />
            <p className="status-title">Analysis failed</p>
            <p className="status-body">{errorMsg}</p>
          </div>
        )}

        {status === 'success' && result && (
          <ResultsPanel result={result} provided={provided} />
        )}
      </div>

      {/* ══════════════ RIGHT SIDEBAR ══════════════ */}
      <aside className="sidebar-col" aria-label="Delivery tracks and live definitions">

        {/* Speech Delivery Tracks */}
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="section-card-title">Speech Delivery Tracks</h2>
            <span className="status-chip">
              <span className={`status-dot ${status === 'success' ? 'status-dot--green' : 'status-dot--muted'}`} aria-hidden="true" />
              {status === 'success' ? 'Analysed' : 'Waiting'}
            </span>
          </div>
          <div className="section-card-body">
            <div className="waveform-stack">
              <WaveformViz
                active={!!audioFile || status === 'success'}
                color1="var(--brand-400)"
                color2="var(--brand-300)"
                label="Voice channel"
              />
              <WaveformViz
                active={!!text || status === 'success'}
                color1="var(--teal-400)"
                color2="var(--teal-500)"
                label="Text signal"
              />
            </div>
          </div>
        </div>

        {/* Live Definitions Breakdown */}
        <div className="section-card">
          <div className="section-card-header" style={{ gap: 8 }}>
            <div style={{ flex: 1 }}>
              <h2 className="section-card-title">Live Definitions Breakdown</h2>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Confidence per modality
              </p>
            </div>
            {/* Crystal / sparkle decoration */}
            <svg className="crystal-icon" viewBox="0 0 32 32" aria-hidden="true">
              <path d="M16 3 L22 12 L16 16 L10 12 Z" fill="var(--brand-300)" />
              <path d="M16 16 L22 12 L22 24 L16 29 Z" fill="var(--indigo-600)" opacity="0.8"/>
              <path d="M16 16 L10 12 L10 24 L16 29 Z" fill="var(--brand-500)" opacity="0.8"/>
              <circle cx="26" cy="6" r="2" fill="var(--amber-500)" opacity="0.9"/>
              <circle cx="30" cy="10" r="1.2" fill="var(--amber-500)" opacity="0.6"/>
              <circle cx="24" cy="3"  r="1.5" fill="var(--brand-300)" opacity="0.7"/>
            </svg>
          </div>

          <div className="section-card-body" style={{ paddingTop: 12 }}>
            {status === 'success' && result ? (
              <div className="modality-grid">
                <ModalityCard modality="text"  data={sidebarData.text}  missing={!provided.text} />
                <ModalityCard modality="image" data={sidebarData.image} missing={!provided.image} />
                <ModalityCard modality="audio" data={sidebarData.audio} missing={!provided.audio} />
              </div>
            ) : (
              <div className="modality-grid">
                <ModalityCard modality="text"  data={null} missing={true} />
                <ModalityCard modality="image" data={null} missing={true} />
                <ModalityCard modality="audio" data={null} missing={true} />
              </div>
            )}
          </div>
        </div>

      </aside>
    </main>
  );
}
