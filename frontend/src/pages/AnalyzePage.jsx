import { useState } from 'react';
import { AlertCircle, FileText, Image as ImageIcon, Loader2, Mic, RotateCcw, Sparkles, WifiOff } from 'lucide-react';
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
  const displayedResult = result || selectedResult;

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

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    const entry = await analyze({
      text: text.trim() || undefined,
      image: imageFile || undefined,
      audio: audioFile || undefined,
    });
    setLastPayload({
      text: text.trim() || undefined,
      image: imageFile || undefined,
      audio: audioFile || undefined,
    });
    if (entry) {
      onAnalysisComplete?.({ id: Date.now(), timestamp: new Date().toLocaleTimeString(), result: entry, provided });
      onTabChange('analysis');
    }
  }

  return (
    <main id="main-content" className="workspace-page">
      <div className="workspace-heading">
        <div>
          <span className="workspace-kicker">EMOTIONIQ WORKSPACE</span>
          <h1>{isResultsTab ? 'Analysis results' : content.label}</h1>
          <p>{isResultsTab ? 'Review the latest estimate across the signals you provided.' : content.description}</p>
        </div>
        <div className="workspace-count">{isResultsTab ? '05' : `0${['text', 'image', 'voice', 'multimodal'].indexOf(activeTab) + 1}`} / 05</div>
      </div>

      {isResultsTab ? (
        displayedResult ? (
          <ResultsPanel result={displayedResult} provided={provided} />
        ) : (
          <section className="empty-analysis section-card">
            <div className="empty-analysis-icon"><Sparkles size={22} /></div>
            <h2>No analysis yet</h2>
            <p>Choose Text, Image, Voice, or Multimodal above to provide content first.</p>
            <button type="button" className="btn-primary" onClick={() => onTabChange('multimodal')}>Start multimodal analysis</button>
          </section>
        )
      ) : (
        <section className="analysis-workspace section-card">
          <div className="analysis-workspace-header">
            <div className="analysis-mode-icon"><ModeIcon size={20} aria-hidden="true" /></div>
            <div>
              <h2>Provide your {activeTab === 'multimodal' ? 'signals' : activeTab}</h2>
              <p>{activeTab === 'multimodal' ? 'Add any combination of inputs. Missing modalities will be skipped.' : 'Only this modality will be sent for analysis.'}</p>
            </div>
          </div>

          <div className={activeTab === 'multimodal' ? 'modality-inputs modality-inputs--multi' : 'modality-inputs'}>
            {(activeTab === 'text' || activeTab === 'multimodal') && <TextInput value={text} onChange={setText} />}
            {(activeTab === 'image' || activeTab === 'multimodal') && <ImageInput file={imageFile} onFile={setImageFile} onError={setImageError} />}
            {(activeTab === 'voice' || activeTab === 'multimodal') && <VoiceInput file={audioFile} onFile={setAudioFile} onError={setAudioError} />}
          </div>

          {(imageError || audioError) && (
            <div className="file-errors" role="alert">
              {imageError && <p className="file-error">{imageError}</p>}
              {audioError && <p className="file-error">{audioError}</p>}
            </div>
          )}

          <ConsentNotice onConsent={setConsented} />
          <form onSubmit={handleSubmit} className="analysis-form">
            <button type="submit" className="analyze-btn" disabled={!canSubmit}>
              {status === 'loading' ? <><Loader2 size={16} className="spin" /> Analysing…</> : <><Sparkles size={16} /> Analyse {activeTab}</>}
            </button>
            {status !== 'idle' && <button type="button" className="reset-btn" onClick={handleReset}><RotateCcw size={14} /> Reset</button>}
          </form>
          {!canSubmit && status === 'idle' && (
            <p className="submit-hint" role="status">
              {!hasInput ? 'Add at least one signal to continue.' : !consented ? 'Confirm the estimate notice to continue.' : 'Fix the file issue before analysing.'}
            </p>
          )}
        </section>
      )}

      {!isResultsTab && status === 'loading' && <div className="status-panel status-panel--loading"><Loader2 size={27} className="spin" /><p>Analysing your content…</p></div>}
      {!isResultsTab && status === 'not-connected' && <div className="status-panel status-panel--warn"><WifiOff size={27} /><p className="status-title">Analysis is not connected yet</p><p className="status-body">The backend endpoint has not been configured yet.</p></div>}
      {!isResultsTab && status === 'error' && <div className="status-panel status-panel--error"><AlertCircle size={27} /><p className="status-title">Analysis failed</p><p className="status-body">{errorMsg}</p><button type="button" className="btn-ghost" onClick={() => analyze(lastPayload)}>Try again</button></div>}
    </main>
  );
}
