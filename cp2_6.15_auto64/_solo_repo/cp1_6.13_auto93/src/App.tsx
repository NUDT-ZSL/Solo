import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext';
import { MemberName } from './types';
import CalendarPage from './pages/CalendarPage';
import SongsPage from './pages/SongsPage';

const MEMBERS: MemberName[] = ['鼓手', '吉他手', '贝斯手', '主唱'];

const App: React.FC = () => {
  const { currentUser, setCurrentUser, notification } = useAppContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="app-root">
      {notification && (
        <div className="notification-bar">
          {notification}
        </div>
      )}

      <header className="app-header">
        <div className="header-left">
          <div className="logo" onClick={() => navigate('/')}>
            🥁 BeatSync
          </div>
        </div>
        <nav className="header-nav">
          <NavLink to="/" className="nav-link" end>
            日历
          </NavLink>
          <NavLink to="/songs" className="nav-link">
            曲目
          </NavLink>
        </nav>
        <div className="header-right" ref={menuRef}>
          <button
            className="user-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="avatar-icon">👤</span>
            {currentUser}
            <span className="caret">{menuOpen ? '▲' : '▼'}</span>
          </button>
          {menuOpen && (
            <div className="user-dropdown">
              {MEMBERS.map(m => (
                <button
                  key={m}
                  className={`dropdown-item ${currentUser === m ? 'active' : ''}`}
                  onClick={() => { setCurrentUser(m); setMenuOpen(false); }}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<CalendarPage />} />
          <Route path="/songs" element={<SongsPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
