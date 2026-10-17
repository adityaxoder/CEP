import { Check, LogOut, ShieldCheck, Trash2 } from 'lucide-react';

export function SettingsPage({ historyCount, onClearHistory, onSignOut }) {
  return (
    <main id="main-content" className="settings-page">
      <div className="page-intro">
        <div>
          <h1 className="page-title"><ShieldCheck size={22} aria-hidden="true" /> Privacy & settings</h1>
          <p className="page-subtitle">Control what this local prototype keeps and how you leave it.</p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="section-card" aria-labelledby="privacy-heading">
          <div className="section-card-header">
            <h2 id="privacy-heading" className="section-card-title">Privacy by default</h2>
            <span className="settings-status"><Check size={13} aria-hidden="true" /> Active</span>
          </div>
          <div className="section-card-body settings-copy">
            <p>Analysis history stays in this browser session while the UI prototype is running. Raw images and audio are not uploaded in mock mode.</p>
            <ul className="settings-list">
              <li><Check size={14} aria-hidden="true" /> No raw media is stored by this interface.</li>
              <li><Check size={14} aria-hidden="true" /> Results are estimates, not diagnoses.</li>
              <li><Check size={14} aria-hidden="true" /> Backend processing will require fresh consent.</li>
            </ul>
          </div>
        </section>

        <section className="section-card" aria-labelledby="data-heading">
          <div className="section-card-header">
            <h2 id="data-heading" className="section-card-title">Session data</h2>
            <span className="settings-count">{historyCount} saved</span>
          </div>
          <div className="section-card-body settings-copy">
            <p>Clear your analysis results from this session at any time. This cannot be undone.</p>
            {historyCount === 0 && <p className="settings-empty">No analyses are saved yet. Complete an analysis to see it listed here.</p>}
            <button type="button" className="clear-btn settings-action" onClick={onClearHistory} disabled={historyCount === 0}>
              <Trash2 size={14} aria-hidden="true" />
              Clear session history
            </button>
          </div>
        </section>
      </div>

      <section className="settings-signout section-card" aria-labelledby="account-heading">
        <div>
          <h2 id="account-heading" className="section-card-title">Demo workspace</h2>
          <p className="settings-muted">Authentication is local-only until a real account provider is connected.</p>
        </div>
        <button type="button" className="btn-ghost settings-action" onClick={onSignOut}>
          <LogOut size={14} aria-hidden="true" />
          Sign out
        </button>
      </section>
    </main>
  );
}