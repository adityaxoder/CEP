/**
 * Header – top navigation bar.
 * Design matches the reference: brand | tab nav | action buttons
 */
import { Brain, LogOut, Settings } from 'lucide-react';

export function Header({ currentPage, onNavigate, onLogout }) {
  const navItems = [
    { id: 'text', label: 'Text' },
    { id: 'image', label: 'Image' },
    { id: 'voice', label: 'Voice' },
    { id: 'multimodal', label: 'Multimodal' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'history', label: 'History' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="app-header" role="banner">
      <div className="header-inner">
        {/* Brand — separated by right border */}
        <button
          type="button"
          className="brand"
          onClick={() => onNavigate('text')}
          aria-label="EmotionIQ home"
        >
          <span className="brand-icon" aria-hidden="true">
            <Brain size={18} />
          </span>
          <span className="brand-name">EmotionIQ</span>
        </button>

        {/* Tab nav */}
        <nav aria-label="Main navigation">
          <ul className="nav-list" role="list">
            {navItems.map(({ id, label }) => (
              <li key={id}>
                <button
                  type="button"
                  className={`nav-link ${currentPage === id ? 'nav-link--active' : ''}`}
                  onClick={() => onNavigate(id)}
                  aria-current={currentPage === id ? 'page' : undefined}
                  >
                  {id === 'settings' && <Settings size={14} aria-hidden="true" />}
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="header-actions">
          <button type="button" className="btn-ghost header-logout" onClick={onLogout}>
            <LogOut size={14} aria-hidden="true" />
            Logout
          </button>
        </div>

      </div>
    </header>
  );
}
