/**
 * TextInput – textarea for the text modality.
 */
import { Type } from 'lucide-react';

const MAX_CHARS = 2000;

export function TextInput({ value, onChange }) {
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
      />
    </div>
  );
}
