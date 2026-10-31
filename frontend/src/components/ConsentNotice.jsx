/**
 * ConsentNotice – displayed before text is sent to the external AI service.
 * Users must acknowledge this before submitting.
 */
import { ShieldCheck } from 'lucide-react';

export function ConsentNotice({ checked, onConsent, hasText, savesAnalysis = false }) {
  return (
    <div className="consent-box" role="region" aria-label="Consent notice">
      <div className="consent-icon">
        <ShieldCheck size={20} aria-hidden="true" />
      </div>
      <div className="consent-body">
        <p className="consent-title">Before you continue</p>
        <p className="consent-text">
          {hasText
          ? `Text in this request is sent to Google’s AI service for analysis or rewriting. The app requests stateless processing, but the service terms still apply. Do not enter sensitive or private information.${savesAnalysis ? ' The completed analysis result is saved to this account’s local history until you delete it; uploaded image and audio files are not saved.' : ''}`
            : 'If you include text, it will be sent to Google’s AI service for analysis. The app requests stateless processing, but the service terms still apply. Do not enter sensitive or private information. Image and audio are handled by the local backend. Completed analysis results are saved to this account’s local history until deleted; uploaded files are not saved.'}
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
            {savesAnalysis
              ? 'I understand that my analysis result is saved to this account’s history.'
              : 'I understand that my text is sent to Google’s AI service.'}
          </span>
        </label>
      </div>
    </div>
  );
}
