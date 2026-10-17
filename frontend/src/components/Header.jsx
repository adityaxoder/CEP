/**
 * Header – top navigation bar.
 * Design matches the reference: brand | tab nav | action buttons
 */
import { Brain, Plus, UserPlus } from 'lucide-react';

export function Header({ currentPage, onNavigate }) {
  const navItems = [
    { id: 'text', label: 'Text' },
    { id: 'image', label: 'Image' },
    { id: 'voice', label: 'Voice' },
    { id: 'multimodal', label: 'Multimodal' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'history', label: 'History' },
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
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Action buttons (right) */}
        <div className="header-actions">
          <button type="button" className="btn-ghost" aria-label="Invite team member">
            <UserPlus size={14} aria-hidden="true" />
            Invite
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onNavigate('multimodal')}
            aria-label="New analysis"
          >
            <Plus size={14} aria-hidden="true" />
            New Analysis
          </button>
        </div>
      </div>
    </header>
  );
}
