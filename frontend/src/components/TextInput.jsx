/**
 * TextInput – textarea for the text modality.
 */
import { Type } from 'lucide-react';

const MAX_CHARS = 2000;

export function TextInput({ value, onChange }) {
  const remaining = MAX_CHARS - value.length;
  const nearLimit = remaining < 100;

  return (
    <div className="input-card">
      <div className="input-card-header">
        <span className="input-card-icon" aria-hidden="true">
          <Type size={14} />
        </span>
          <label className="input-card-title" htmlFor="text-input">Text message</label>
      </div>
      <textarea
        id="text-input"
        className="text-textarea"
        rows={4}
        maxLength={MAX_CHARS}
        placeholder="Paste or type the message you'd like to analyse…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby="text-char-count"
      />
      <p
        id="text-char-count"
        className={`char-count ${nearLimit ? 'char-count--warn' : ''}`}
        aria-live="polite"
        aria-atomic="true"
      >
        {remaining} characters remaining
      </p>
    </div>
  );
}
