/**
 * ConsentNotice – displayed above the Analyze button.
 * Users must acknowledge this before submitting.
 */
import { ShieldCheck } from 'lucide-react';

export function ConsentNotice({ checked, onConsent }) {
  return (
    <div className="consent-box" role="region" aria-label="Consent notice">
      <div className="consent-icon">
        <ShieldCheck size={20} aria-hidden="true" />
      </div>
      <div className="consent-body">
        <p className="consent-title">Before you continue</p>
        <p className="consent-text">
          <strong>Estimates only, not diagnoses.</strong>
        </p>
        <label className="consent-check-label">
          <input
            id="consent-checkbox"
            type="checkbox"
            checked={checked}
            onChange={(e) => onConsent(e.target.checked)}
            aria-describedby="consent-desc"
            className="consent-checkbox"
          />
          <span id="consent-desc">
            I understand.
          </span>
        </label>
      </div>
    </div>
  );
}
