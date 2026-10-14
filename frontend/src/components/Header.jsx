/**
 * Header – top navigation bar.
 * Design matches the reference: brand | tab nav | action buttons
 */
import { Activity, Clock, FileText, Image as ImageIcon, LogOut, Mic, Settings, Sparkles, WandSparkles } from 'lucide-react';

export function Header({ currentPage, onNavigate, onLogout }) {
  const navItems = [
    { id: 'text', label: 'Text', icon: FileText },
    { id: 'image', label: 'Image', icon: ImageIcon },
    { id: 'voice', label: 'Voice', icon: Mic },
    { id: 'multimodal', label: 'Multimodal', icon: Sparkles },
    { id: 'coach', label: 'Coach', icon: WandSparkles },
    { id: 'analysis', label: 'Analysis', icon: Activity },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="app-header" role="banner">
      <div className="header-inner">
        {/* Brand — separated by right border */}
        <button
          type="button"
          className="brand"
          onClick={() => onNavigate('text')}
          aria-label="BrainiacConvo home"
        >
          <span className="brand-name">BrainiacConvo</span>
        </button>

        {/* Tab nav */}
        <nav aria-label="Main navigation">
          <ul className="nav-list" role="list">
            {navItems.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  className={`nav-link ${currentPage === id ? 'nav-link--active' : ''}`}
                  onClick={() => onNavigate(id)}
                  aria-current={currentPage === id ? 'page' : undefined}
                  >
                  <Icon size={15} aria-hidden="true" />
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
