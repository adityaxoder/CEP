/**
 * ImageInput – file picker for the image modality.
 * Accepts JPEG, PNG, WEBP up to 5 MB.
 */
import { useRef } from 'react';
import { ImageIcon, X } from 'lucide-react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB    = 5;
const MAX_BYTES      = MAX_SIZE_MB * 1024 * 1024;

export function ImageInput({ file, onFile, onError }) {
  const inputRef = useRef(null);

  function handleChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      onError('Please select a JPEG, PNG, or WEBP image.');
      e.target.value = ''; return;
    }
    if (selected.size > MAX_BYTES) {
      onError(`Image must be smaller than ${MAX_SIZE_MB} MB.`);
      e.target.value = ''; return;
    }
    onError('');
    onFile(selected);
  }

  function handleRemove() {
    onFile(null); onError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  const previewUrl = file ? URL.createObjectURL(file) : null;

  return (
    <div className="input-card">
      <div className="input-card-header">
        <span className="input-card-icon" aria-hidden="true">
          <ImageIcon size={14} />
        </span>
        <h3 className="input-card-title">Image</h3>
      </div>

      {file ? (
        <div className="file-preview">
          <img src={previewUrl} alt="Selected image preview" className="image-preview-thumb" />
          <div className="file-preview-info">
            <span className="file-name" title={file.name}>{file.name}</span>
            <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <button type="button" className="remove-btn" onClick={handleRemove} aria-label={`Remove ${file.name}`}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <label className="file-drop-zone" htmlFor="image-input">
          <ImageIcon size={26} className="drop-icon" aria-hidden="true" />
          <span className="drop-label">Click to choose an image</span>
          <span className="drop-hint">JPEG · PNG · WEBP · max {MAX_SIZE_MB} MB</span>
          <input ref={inputRef} id="image-input" type="file"
            accept={ACCEPTED_TYPES.join(',')} className="sr-only" onChange={handleChange} />
        </label>
      )}
    </div>
  );
}
