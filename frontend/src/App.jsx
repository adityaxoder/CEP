/**
 * App – root component.
 *
 * Owns the current page, signed-in user's saved history, and selected result.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { AnalyzePage } from './pages/AnalyzePage';
import { CoachPage } from './pages/CoachPage';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { DEFAULT_PAGE, normalizePage } from './state/appState';
import { loginWithUsername, signupWithUsername } from './api/authClient';
import { clearAnalysisHistory, deleteAnalysisHistoryEntry, getAnalysisHistory } from './api/historyClient';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [currentUsername, setCurrentUsername] = useState('');
  const [currentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const historyRequestId = useRef(0);
  const [selectedResult, setSelectedResult] = useState(null);

  /** Called by AnalyzePage when an analysis completes successfully */
  const refreshHistory = useCallback(async () => {
    if (!accessToken) return;
    const requestId = ++historyRequestId.current;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const items = await getAnalysisHistory(accessToken);
      if (requestId === historyRequestId.current) setHistory(items);
    } catch (error) {
      if (requestId === historyRequestId.current) setHistoryError(error.message || 'Could not load your saved analyses.');
    } finally {
      if (requestId === historyRequestId.current) setHistoryLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isAuthenticated && accessToken) refreshHistory();
  }, [isAuthenticated, accessToken, refreshHistory]);

  const addHistoryEntry = useCallback(async (entry) => {
    setSelectedResult(entry.result);
    await refreshHistory();
  }, [refreshHistory]);

  const clearHistory = useCallback(async () => {
    if (!accessToken) return;
    const requestId = ++historyRequestId.current;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      await clearAnalysisHistory(accessToken);
      if (requestId === historyRequestId.current) {
        setHistory([]);
        setSelectedResult(null);
      }
    } catch (error) {
      if (requestId === historyRequestId.current) setHistoryError(error.message || 'Could not clear your saved analyses.');
    } finally {
      if (requestId === historyRequestId.current) setHistoryLoading(false);
    }
  }, [accessToken]);

  const deleteHistoryEntry = useCallback(async (id) => {
    if (!accessToken) return;
    const requestId = ++historyRequestId.current;
    setHistoryError('');
    try {
      await deleteAnalysisHistoryEntry(id, accessToken);
      if (requestId === historyRequestId.current) setHistory((current) => current.filter((entry) => entry.id !== id));
    } catch (error) {
      if (requestId === historyRequestId.current) setHistoryError(error.message || 'Could not delete this analysis.');
    }
  }, [accessToken]);

  const navigateTo = useCallback((page) => setCurrentPage(normalizePage(page)), []);
  const clearSelectedResult = useCallback(() => setSelectedResult(null), []);

  const signOut = useCallback(() => {
    historyRequestId.current += 1;
    setIsAuthenticated(false);
    setAccessToken(null);
    setCurrentUsername('');
    setCurrentPage(DEFAULT_PAGE);
    setHistory([]);
    setHistoryError('');
    setSelectedResult(null);
  }, []);

  const authenticate = useCallback(async ({ username, password, confirmPassword, mode }) => {
    const result = mode === 'signup'
      ? await signupWithUsername(username, password, confirmPassword)
      : await loginWithUsername(username, password);
    setAccessToken(result.access_token);
    setCurrentUsername(result.username || username);
    setIsAuthenticated(true);
  }, []);

  if (!isAuthenticated) {
    return <LoginPage onLogin={authenticate} />;
  }

  return (
    <div className="app-shell">
      {/* Skip-to-content for keyboard / screen reader users */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <Header currentPage={currentPage} onNavigate={navigateTo} onLogout={signOut} username={currentUsername} />

      <div className="page-wrapper">
        {currentPage === 'history' ? (
          <HistoryPage history={history} loading={historyLoading} error={historyError} onClear={clearHistory} onDelete={deleteHistoryEntry} onRefresh={refreshHistory} onNavigate={navigateTo} />
        ) : currentPage === 'settings' ? (
          <SettingsPage historyCount={history.length} historyLoading={historyLoading} historyError={historyError} onClearHistory={clearHistory} onSignOut={signOut} />
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
