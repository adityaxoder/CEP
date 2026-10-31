/** Minimal acknowledgement required before an analysis request. */
export function ConsentNotice({ checked, onConsent }) {
  return (
    <div className="consent-box">
      <label className="consent-check-label">
        <input
          id="consent-checkbox"
          type="checkbox"
          checked={checked}
          onChange={(event) => onConsent(event.target.checked)}
          className="consent-checkbox"
        />
        <span>Proceed</span>
      </label>
    </div>
  );
}
