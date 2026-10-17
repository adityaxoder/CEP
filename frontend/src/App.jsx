/**
 * App – root component.
 *
 * Owns:
 *   • currentPage  state ("analyze" | "history")
 *   • sessionHistory state – analysis runs for this tab only, no persistence
 */
import { useState, useCallback } from 'react';
import { Header }      from './components/Header';
import { AnalyzePage } from './pages/AnalyzePage';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage }   from './pages/LoginPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage]         = useState('text');
  const [sessionHistory, setSessionHistory]   = useState([]);

  /** Called by AnalyzePage when an analysis completes successfully */
  const addHistoryEntry = useCallback((entry) => {
    setSessionHistory((prev) => [entry, ...prev]);
  }, []);

  const clearHistory = useCallback(() => setSessionHistory([]), []);

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="app-shell">
      {/* Skip-to-content for keyboard / screen reader users */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <Header currentPage={currentPage} onNavigate={setCurrentPage} />

      <div className="page-wrapper">
        {currentPage === 'history' ? (
          <HistoryPage history={sessionHistory} onClear={clearHistory} />
        ) : (
          <AnalyzePage
            activeTab={currentPage}
            onTabChange={setCurrentPage}
            onAnalysisComplete={addHistoryEntry}
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
