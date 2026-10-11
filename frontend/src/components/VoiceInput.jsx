/**
 * VoiceInput – file picker for the audio modality.
 * Accepts MP3, WAV, OGG, WEBM up to 10 MB.
 */
import { useRef } from 'react';
import { Mic, X } from 'lucide-react';

const ACCEPT_ATTR = '.mp3,.wav,.ogg,.webm,audio/*';
const MAX_SIZE_MB  = 10;
const MAX_BYTES    = MAX_SIZE_MB * 1024 * 1024;

export function VoiceInput({ file, onFile, onError }) {
  const inputRef = useRef(null);

  function handleChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith('audio/')) {
      onError('Please select an MP3, WAV, OGG, or WEBM audio file.');
      e.target.value = ''; return;
    }
    if (selected.size > MAX_BYTES) {
      onError(`Audio file must be smaller than ${MAX_SIZE_MB} MB.`);
      e.target.value = ''; return;
    }
    onError('');
    onFile(selected);
  }

  function handleRemove() {
    onFile(null); onError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="input-card">
      <div className="input-card-header">
        <span className="input-card-icon" aria-hidden="true">
          <Mic size={14} />
        </span>
        <h3 className="input-card-title">Voice</h3>
      </div>

      {file ? (
        <div className="file-preview">
          <Mic size={22} className="audio-file-icon" aria-hidden="true" />
          <div className="file-preview-info">
            <span className="file-name" title={file.name}>{file.name}</span>
            <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <button type="button" className="remove-btn" onClick={handleRemove} aria-label={`Remove ${file.name}`}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <label className="file-drop-zone" htmlFor="audio-input">
          <Mic size={26} className="drop-icon" aria-hidden="true" />
          <span className="drop-label">Click to choose audio</span>
          <span className="drop-hint">MP3 · WAV · OGG · WEBM · max {MAX_SIZE_MB} MB</span>
          <input ref={inputRef} id="audio-input" type="file"
            accept={ACCEPT_ATTR} className="sr-only" onChange={handleChange} />
        </label>
      )}
    </div>
  );
}
