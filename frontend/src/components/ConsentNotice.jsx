/**
 * ConsentNotice – displayed above the Analyze button.
 * Users must acknowledge this before submitting.
 */
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export function ConsentNotice({ onConsent }) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="consent-box" role="region" aria-label="Consent notice">
      <div className="consent-icon">
        <ShieldCheck size={20} aria-hidden="true" />
      </div>
      <div className="consent-body">
        <p className="consent-title">Before you continue</p>
        <p className="consent-text">
          EmotionIQ analyses observable cues in the content you provide.
          Results are <strong>estimates only</strong> — they are not a
          diagnosis, and they do not reveal what someone truly feels.
          Your content is processed for analysis and is not stored by
          this app.
        </p>
        <label className="consent-check-label">
          <input
            id="consent-checkbox"
            type="checkbox"
            checked={checked}
            onChange={(e) => {
              setChecked(e.target.checked);
              onConsent(e.target.checked);
            }}
            aria-describedby="consent-desc"
            className="consent-checkbox"
          />
          <span id="consent-desc">
            I understand these are estimates, not a diagnosis.
          </span>
        </label>
      </div>
    </div>
  );
}
