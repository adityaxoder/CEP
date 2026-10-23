/**
 * AnalyzePage – workspace layout supporting single-mode and multimodal workflows.
 *
 * Controlled tabs:
 *   • text: Text analysis input
 *   • image: Image facial-expression input
 *   • voice: Audio vocal-emotion input
 *   • multimodal: Combined text + image + voice inputs
 *   • analysis: Results panel
 */
import { useState } from 'react';
import { AlertCircle, FileText, Image as ImageIcon, Info, Loader2, Mic, RotateCcw, Sparkles, WifiOff } from 'lucide-react';
import { TextInput } from '../components/TextInput';
import { ImageInput } from '../components/ImageInput';
import { VoiceInput } from '../components/VoiceInput';
import { ConsentNotice } from '../components/ConsentNotice';
import { ResultsPanel } from '../components/ResultsPanel';
import { useAnalysis } from '../hooks/useAnalysis';

const TAB_CONTENT = {
  text: {
    label: 'Text analysis',
    description: 'Paste a message to estimate the tone and emotional cues in its wording.',
    icon: FileText,
  },
  image: {
    label: 'Image analysis',
    description: 'Upload a facial-expression image to inspect visible emotional cues.',
    icon: ImageIcon,
  },
  voice: {
    label: 'Voice analysis',
    description: 'Upload a voice recording to estimate vocal delivery and tone.',
    icon: Mic,
  },
  multimodal: {
    label: 'Multimodal analysis',
    description: 'Combine text, image, and voice cues in one analysis request.',
    icon: Sparkles,
  },
};

export function AnalyzePage({ activeTab, selectedResult, onTabChange, onAnalysisComplete, onResultReset }) {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [imageError, setImageError] = useState('');
  const [audioError, setAudioError] = useState('');
  const [consented, setConsented] = useState(false);
  const [lastPayload, setLastPayload] = useState(null);
  const { status, result, errorMsg, analyze, reset } = useAnalysis();

  const isResultsTab = activeTab === 'analysis';
  const content = TAB_CONTENT[activeTab] || TAB_CONTENT.text;
  const ModeIcon = content.icon;
  const hasInput = Boolean(text.trim() || imageFile || audioFile);
  const hasError = Boolean(imageError || audioError);
  const canSubmit = hasInput && consented && !hasError && status !== 'loading';
  const provided = { text: Boolean(text.trim()), image: Boolean(imageFile), audio: Boolean(audioFile) };
  const signalCount = Object.values(provided).filter(Boolean).length;
  const displayedResult = result || selectedResult;
  const showReset = hasInput || hasError || consented || status !== 'idle';
  const submitHint = !hasInput
    ? 'Add at least one signal to continue.'
    : !consented
      ? 'Confirm the estimate notice to continue.'
      : 'Fix the file issue before analysing.';

  function handleReset() {
    setText('');
    setImageFile(null);
    setAudioFile(null);
    setImageError('');
    setAudioError('');
    setConsented(false);
    onResultReset?.();
    reset();
  }

  function handleStartNew() {
    handleReset();
    onTabChange('multimodal');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    const payload = {
      text: text.trim() || undefined,
      image: imageFile || undefined,
      audio: audioFile || undefined,
    };
    setLastPayload(payload);
    const entry = await analyze(payload);
    if (entry) {
      onAnalysisComplete?.({
        id: Date.now(),
        requestId: entry.requestId || null,
        timestamp: new Date().toLocaleTimeString(),
        result: entry,
        provided,
      });
      onTabChange('analysis');
    }
  }

  function handleRetry() {
    if (lastPayload) analyze(lastPayload);
  }

  return (
    <main id="main-content" className="workspace-page">
      <div className="workspace-heading">
        <div>
          <span className="workspace-kicker">BRAINIACCONVO WORKSPACE</span>
          <h1>{isResultsTab ? 'Analysis results' : content.label}</h1>
          <p>{isResultsTab ? 'Review the latest estimate across the signals you provided.' : content.description}</p>
        </div>
        <div className="workspace-count">{isResultsTab ? '05' : `0${['text', 'image', 'voice', 'multimodal'].indexOf(activeTab) + 1}`} / 05</div>
      </div>

      {isResultsTab ? (
        displayedResult ? (
          <ResultsPanel result={displayedResult} provided={provided} onStartNew={handleStartNew} />
        ) : (
          <section className="empty-analysis section-card">
            <div className="empty-analysis-icon"><Sparkles size={22} /></div>
            <h2>No analysis yet</h2>
            <p>Choose Text, Image, Voice, or Multimodal above to provide content first.</p>
            <button type="button" className="btn-primary" onClick={() => onTabChange('multimodal')}>Start multimodal analysis</button>
          </section>
        )
      ) : (
        <section className="analysis-workspace section-card" aria-busy={status === 'loading'}>
          <div className="analysis-workspace-header">
            <div className="analysis-mode-icon"><ModeIcon size={20} aria-hidden="true" /></div>
            <div>
              <h2>Provide your {activeTab === 'multimodal' ? 'signals' : activeTab}</h2>
              <p>{activeTab === 'multimodal' ? 'Add any combination of inputs. Missing modalities will be skipped.' : 'Only this modality will be sent for analysis.'}</p>
            </div>
          </div>

          {activeTab === 'multimodal' && (
            <div className="multi-signal-summary" role="status" aria-live="polite">
              <span className="multi-signal-count">{signalCount} / 3</span>
              <span>{signalCount === 0 ? 'Choose any signal to begin. Estimates will appear here after you submit.' : `${signalCount} signal${signalCount === 1 ? '' : 's'} ready. Missing signals will be skipped.`}</span>
            </div>
          )}

          <div className={activeTab === 'multimodal' ? 'modality-inputs modality-inputs--multi' : 'modality-inputs'}>
            {(activeTab === 'text' || activeTab === 'multimodal') && <TextInput value={text} onChange={setText} />}
            {(activeTab === 'image' || activeTab === 'multimodal') && <ImageInput file={imageFile} onFile={setImageFile} onError={setImageError} />}
            {(activeTab === 'voice' || activeTab === 'multimodal') && <VoiceInput file={audioFile} onFile={setAudioFile} onError={setAudioError} />}
          </div>

          {signalCount === 0 && activeTab !== 'multimodal' && status === 'idle' && (
            <div className="empty-input-guidance" role="status" aria-live="polite">
              <Info size={14} aria-hidden="true" />
              <span>
                {activeTab === 'text'
                  ? 'Enter a message to see an estimate of wording cues here.'
                  : activeTab === 'image'
                    ? 'Choose an image to see an estimate of visible cues here.'
                    : 'Choose a recording to see an estimate of vocal delivery here.'}
              </span>
            </div>
          )}

          {(imageError || audioError) && (
            <div className="file-errors" role="alert">
              {imageError && <p className="file-error">{imageError}</p>}
              {audioError && <p className="file-error">{audioError}</p>}
            </div>
          )}

          <ConsentNotice checked={consented} onConsent={setConsented} />
          <form onSubmit={handleSubmit} className="analysis-form">
            <button type="submit" className="analyze-btn" disabled={!canSubmit} aria-describedby={!canSubmit ? 'submit-hint' : undefined}>
              {status === 'loading' ? <><Loader2 size={16} className="spin" /> Analysing…</> : <><Sparkles size={16} /> Analyse {activeTab}</>}
            </button>
            {showReset && <button type="button" className="reset-btn" onClick={handleReset}><RotateCcw size={14} /> Reset</button>}
          </form>
          {!canSubmit && status === 'idle' && <p id="submit-hint" className="submit-hint" role="status">{submitHint}</p>}
        </section>
      )}

      {!isResultsTab && status === 'loading' && (
        <div className="status-panel status-panel--loading" role="status" aria-live="polite">
          <Loader2 size={27} className="spin" aria-hidden="true" />
          <p className="status-title">Analysing your content…</p>
          <div className="processing-progress" role="progressbar" aria-label="Analysis in progress" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Processing">
            <span />
          </div>
          <p className="status-body">Preparing your selected signals. Keep this window open.</p>
        </div>
      )}
      {!isResultsTab && status === 'not-connected' && (
        <div className="status-panel status-panel--warn" role="status" aria-live="polite">
          <WifiOff size={27} aria-hidden="true" />
          <p className="status-title">Analysis is not connected yet</p>
          <p className="status-body">The backend endpoint has not been configured yet.</p>
        </div>
      )}
      {!isResultsTab && status === 'error' && (
        <div className="status-panel status-panel--error" role="alert">
          <AlertCircle size={27} aria-hidden="true" />
          <p className="status-title">Analysis failed</p>
          <p className="status-body">{errorMsg} Remove the error trigger or reset the form before trying again.</p>
          <button type="button" className="btn-ghost" onClick={handleRetry} disabled={!lastPayload}>Try again</button>
        </div>
      )}
    </main>
  );
}
