import { useState } from 'react';
import { ArrowRight, Brain, Check, LockKeyhole, Mail, UserRound } from 'lucide-react';

export function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login');

  function handleSubmit(event) {
    event.preventDefault();
    onLogin();
  }

  const isSignup = mode === 'signup';

  return (
    <main className="auth-page" id="main-content">
      <section className="auth-visual" aria-label="EmotionIQ overview">
        <div className="auth-visual-top">
          <div className="auth-brand-mark" aria-hidden="true"><Brain size={20} /></div>
          <span className="auth-brand-name">EmotionIQ</span>
        </div>

        <div className="auth-visual-copy">
          <span className="auth-eyebrow">COMMUNICATION INTELLIGENCE</span>
          <p>Bring text, voice, and visual cues into one thoughtful analysis workspace.</p>
        </div>

        <div className="auth-visual-footer">
          <span><Check size={14} /> Private by default</span>
          <span><Check size={14} /> Estimates, not diagnoses</span>
        </div>
      </section>

      <section className="auth-panel" aria-label={isSignup ? 'Create an EmotionIQ account' : 'Sign in to EmotionIQ'}>
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <div className="auth-brand-mark" aria-hidden="true"><Brain size={18} /></div>
            <span className="auth-brand-name">EmotionIQ</span>
          </div>

          <div className="auth-heading">
            {isSignup && <span className="auth-kicker">GET STARTED</span>}
            <h2>{isSignup ? 'Create your workspace' : 'Sign in to continue'}</h2>
            <p>{isSignup ? 'Use any placeholder details for this demo.' : 'Use the form below to continue.'}</p>
          </div>

          <div className="auth-mode-tabs" role="tablist" aria-label="Account access">
            <button type="button" role="tab" aria-selected={!isSignup} className={!isSignup ? 'auth-mode-tab auth-mode-tab--active' : 'auth-mode-tab'} onClick={() => setMode('login')}>Sign in</button>
            <button type="button" role="tab" aria-selected={isSignup} className={isSignup ? 'auth-mode-tab auth-mode-tab--active' : 'auth-mode-tab'} onClick={() => setMode('signup')}>Sign up</button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignup && (
              <label className="auth-field">
                <span>Name</span>
                <span className="auth-input-wrap">
                  <UserRound size={16} aria-hidden="true" />
                  <input type="text" name="name" placeholder="Your name" autoComplete="name" />
                </span>
              </label>
            )}

            <label className="auth-field">
              <span>Email</span>
              <span className="auth-input-wrap">
                <Mail size={16} aria-hidden="true" />
                <input type="text" name="email" placeholder="you@example.com" autoComplete="email" />
              </span>
            </label>

            <label className="auth-field">
              <span>Password</span>
              <span className="auth-input-wrap">
                <LockKeyhole size={16} aria-hidden="true" />
                <input type="text" name="password" placeholder="Enter any password" autoComplete={isSignup ? 'new-password' : 'current-password'} />
              </span>
            </label>

            {isSignup && (
              <label className="auth-field">
                <span>Confirm password</span>
                <span className="auth-input-wrap">
                  <LockKeyhole size={16} aria-hidden="true" />
                  <input type="text" name="confirmPassword" placeholder="Repeat any password" autoComplete="new-password" />
                </span>
              </label>
            )}

            <button className="auth-submit" type="submit">
              {isSignup ? 'Create demo account' : 'Login'}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>

        </div>
      </section>
    </main>
  );
}
