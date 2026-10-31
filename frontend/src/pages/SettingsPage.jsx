import { Check, LogOut, ShieldCheck, Trash2 } from 'lucide-react';

export function SettingsPage({ historyCount, historyLoading, historyError, onClearHistory, onSignOut }) {
  return (
    <main id="main-content" className="settings-page">
      <div className="page-intro">
        <div>
          <h1 className="page-title"><ShieldCheck size={22} aria-hidden="true" /> Privacy & settings</h1>
          <p className="page-subtitle">Review what this prototype keeps and where analysis text is processed.</p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="section-card" aria-labelledby="privacy-heading">
          <div className="section-card-header">
            <h2 id="privacy-heading" className="section-card-title">Privacy by default</h2>
            <span className="settings-status"><Check size={13} aria-hidden="true" /> Active</span>
          </div>
          <div className="section-card-body settings-copy">
            <p>Analysis results are stored in this app’s local database and separated by username. Text analysis and coach rewrites are processed by Google’s AI service; its service terms apply. Do not submit sensitive or private text.</p>
            <ul className="settings-list">
              <li><Check size={14} aria-hidden="true" /> Submitted text, media filenames, and analysis outputs are saved until you delete them.</li>
              <li><Check size={14} aria-hidden="true" /> Uploaded image and audio contents are not saved in history.</li>
              <li><Check size={14} aria-hidden="true" /> Coach rewrites use the style you select.</li>
              <li><Check size={14} aria-hidden="true" /> Results are wording estimates, not facts about anyone’s feelings.</li>
            </ul>
          </div>
        </section>

        <section className="section-card" aria-labelledby="data-heading">
          <div className="section-card-header">
            <h2 id="data-heading" className="section-card-title">Session data</h2>
            <span className="settings-count">{historyLoading ? 'Loading…' : `${historyCount} saved`}</span>
          </div>
          <div className="section-card-body settings-copy">
            <p>Delete an individual result from History, or remove all saved results for this account here.</p>
            {historyError && <p className="auth-error" role="alert">{historyError}</p>}
            {historyCount === 0 && !historyLoading && <p className="settings-empty">No analyses are saved yet. Complete an analysis to see it listed here.</p>}
            <button type="button" className="clear-btn settings-action" onClick={onClearHistory} disabled={historyCount === 0 || historyLoading}>
              <Trash2 size={14} aria-hidden="true" />
              Clear all saved history
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
