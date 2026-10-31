import { useState } from 'react';
import { ArrowRight, Check, LockKeyhole, Mail } from 'lucide-react';

export function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    const confirmPassword = String(data.get('confirmPassword') || '');

    if (!email || !password.trim()) {
      setError('Enter your email and password.');
      setIsSubmitting(false);
      return;
    }
    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    try {
      await onLogin({ email, password, confirmPassword, mode });
    } catch (submitError) {
      setError(submitError.message || 'Could not sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isSignup = mode === 'signup';

  return (
    <main className="auth-page" id="main-content">
      <section className="auth-visual" aria-label="BrainiacConvo overview">
        <div className="auth-visual-top">
          <span className="auth-brand-name">BrainiacConvo</span>
        </div>

        <div className="auth-visual-copy">
          <span className="auth-eyebrow">COMMUNICATION INTELLIGENCE</span>
          <p>Bring text, voice, and visual cues into one thoughtful analysis workspace.</p>
        </div>

        <div className="auth-visual-footer">
          <span><Check size={14} aria-hidden="true" /> Private by default</span>
          <span><Check size={14} aria-hidden="true" /> Estimates, not diagnoses</span>
        </div>
      </section>

      <section className="auth-panel" aria-label={isSignup ? 'Create a BrainiacConvo workspace' : 'Sign in to BrainiacConvo'}>
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <span className="auth-brand-name">BrainiacConvo</span>
          </div>

          <div className="auth-heading">
            {isSignup && <span className="auth-kicker">GET STARTED</span>}
            <h1>{isSignup ? 'Create your workspace' : 'Sign in to continue'}</h1>
            <p>{isSignup ? 'Set up your workspace to begin.' : 'Enter the workspace to begin.'}</p>
          </div>

          <div className="auth-mode-tabs" role="tablist" aria-label="Account access">
            <button type="button" role="tab" aria-selected={!isSignup} className={!isSignup ? 'auth-mode-tab auth-mode-tab--active' : 'auth-mode-tab'} onClick={() => { setError(''); setMode('login'); }}>Sign in</button>
            <button type="button" role="tab" aria-selected={isSignup} className={isSignup ? 'auth-mode-tab auth-mode-tab--active' : 'auth-mode-tab'} onClick={() => { setError(''); setMode('signup'); }}>Sign up</button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field" htmlFor="email-input">
              <span>Email</span>
              <span className="auth-input-wrap">
                <Mail size={16} aria-hidden="true" />
                <input id="email-input" type="email" name="email" placeholder="name@example.com" autoComplete="email" required />
              </span>
            </label>

            <label className="auth-field" htmlFor="password-input">
              <span>Password</span>
              <span className="auth-input-wrap">
                <LockKeyhole size={16} aria-hidden="true" />
                <input id="password-input" type="password" name="password" placeholder="Enter password" autoComplete={isSignup ? 'new-password' : 'current-password'} required />
              </span>
            </label>

            {isSignup && (
              <label className="auth-field" htmlFor="confirm-password-input">
                <span>Confirm password</span>
                <span className="auth-input-wrap">
                  <LockKeyhole size={16} aria-hidden="true" />
                  <input id="confirm-password-input" type="password" name="confirmPassword" placeholder="Confirm password" autoComplete="new-password" required />
                </span>
              </label>
            )}

            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSignup ? 'Create demo account' : 'Login'}
              {!isSubmitting && <ArrowRight size={16} aria-hidden="true" />}
            </button>
          </form>

          {!isSignup && <p className="auth-demo-note">Local demo account: vedant@gmail.com · password: 123</p>}

        </div>
      </section>
    </main>
  );
}
