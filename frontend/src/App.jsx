/**
 * App – root component.
 *
 * Owns the current page, session-only analysis history, and selected result.
 */
import { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { AnalyzePage } from './pages/AnalyzePage';
import { CoachPage } from './pages/CoachPage';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { DEFAULT_PAGE, normalizePage } from './state/appState';
import { loginWithEmail, signupWithEmail } from './api/authClient';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [currentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const [history, setHistory] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);

  /** Called by AnalyzePage when an analysis completes successfully */
  const addHistoryEntry = useCallback((entry) => {
    setHistory((currentHistory) => [entry, ...currentHistory]);
    setSelectedResult(entry.result);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setSelectedResult(null);
  }, []);

  const navigateTo = useCallback((page) => setCurrentPage(normalizePage(page)), []);
  const clearSelectedResult = useCallback(() => setSelectedResult(null), []);

  const signOut = useCallback(() => {
    setIsAuthenticated(false);
    setAccessToken(null);
    setCurrentPage(DEFAULT_PAGE);
    setHistory([]);
    setSelectedResult(null);
  }, []);

  const authenticate = useCallback(async ({ email, password, confirmPassword, mode }) => {
    const result = mode === 'signup'
      ? await signupWithEmail(email, password, confirmPassword)
      : await loginWithEmail(email, password);
    setAccessToken(result.access_token);
    setIsAuthenticated(true);
  }, []);

  if (!isAuthenticated) {
    return <LoginPage onLogin={authenticate} />;
  }

  return (
    <div className="app-shell">
      {/* Skip-to-content for keyboard / screen reader users */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <Header currentPage={currentPage} onNavigate={navigateTo} onLogout={signOut} />

      <div className="page-wrapper">
        {currentPage === 'history' ? (
          <HistoryPage history={history} onClear={clearHistory} onNavigate={navigateTo} />
        ) : currentPage === 'settings' ? (
          <SettingsPage historyCount={history.length} onClearHistory={clearHistory} onSignOut={signOut} />
        ) : currentPage === 'coach' ? (
          <CoachPage accessToken={accessToken} />
        ) : (
          <AnalyzePage
            accessToken={accessToken}
            activeTab={currentPage}
            selectedResult={selectedResult}
            onTabChange={navigateTo}
            onAnalysisComplete={addHistoryEntry}
            onResultReset={clearSelectedResult}
          />
        )}
      </div>

      <footer className="app-footer" role="contentinfo">
        <p>
          EmotionIQ — estimates based on observable cues only. Not a diagnosis.
        </p>
      </footer>
    </div>
  );
}

export default App;
