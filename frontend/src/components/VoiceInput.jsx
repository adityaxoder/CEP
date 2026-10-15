/**
 * VoiceInput – file picker for the audio modality.
 * Accepts MP3, WAV, OGG, WEBM up to 10 MB.
 */
import { useRef, useState } from 'react';
import { Mic, X } from 'lucide-react';

const ACCEPTED_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.webm'];
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(',');
const MAX_SIZE_MB  = 10;
const MAX_BYTES    = MAX_SIZE_MB * 1024 * 1024;

export function VoiceInput({ file, onFile, onError }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  function validateAndSetFile(selected) {
    if (!selected) return;
    const extension = `.${selected.name.split('.').pop()?.toLowerCase()}`;
    if (!selected.type.startsWith('audio/') && !ACCEPTED_EXTENSIONS.includes(extension)) {
      onError('Please select an MP3, WAV, OGG, or WEBM audio file.');
      return;
    }
    if (selected.size > MAX_BYTES) {
      onError(`Audio file must be smaller than ${MAX_SIZE_MB} MB.`);
      return;
    }
    onError('');
    onFile(selected);
  }

  function handleChange(e) {
    validateAndSetFile(e.target.files?.[0]);
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    validateAndSetFile(e.dataTransfer.files?.[0]);
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
            <span className="file-preview-label">Selected recording</span>
            <span className="file-name" title={file.name}>{file.name}</span>
            <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <button type="button" className="remove-btn" onClick={handleRemove} aria-label={`Remove ${file.name}`}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <label
          className={`file-drop-zone ${isDragging ? 'file-drop-zone--active' : ''}`}
          htmlFor="audio-input"
          onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={handleDrop}
        >
          <Mic size={26} className="drop-icon" aria-hidden="true" />
          <span className="drop-label">Choose or drop a recording</span>
          <span id="audio-input-hint" className="drop-hint">MP3 · WAV · OGG · WEBM · max {MAX_SIZE_MB} MB</span>
          <input ref={inputRef} id="audio-input" type="file"
            accept={ACCEPT_ATTR} className="sr-only" onChange={handleChange}
            aria-describedby="audio-input-hint" />
        </label>
      )}
    </div>
  );
}
