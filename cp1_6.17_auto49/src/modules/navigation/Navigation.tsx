import React, { useState } from 'react';
import { useDataStore } from '../data/DataStore';

interface NavigationProps {
  currentPage: 'map' | 'portfolio' | 'report';
  onNavigate: (page: 'map' | 'portfolio' | 'report') => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPage, onNavigate }) => {
  const { userName, totalScore, currentMusicianId, musicians, theme, toggleTheme } = useDataStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const currentMusician = musicians.find(m => m.id === currentMusicianId);

  const navItems = [
    { id: 'map', label: '彩蛋地图', icon: '🗺️' },
    { id: 'portfolio', label: '作品集', icon: '📚' },
    { id: 'report', label: '我的报告', icon: '📊' }
  ] as const;

  return (
    <nav className="navigation">
      <div className="nav-header">
        <div className="logo">🎵 音符秘境</div>
        <button 
          className="hamburger" 
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="菜单"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
      
      <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => {
              onNavigate(item.id);
              setMenuOpen(false);
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="nav-user">
        <div className="user-info">
          <span className="user-name">{userName || '访客'}</span>
          {currentMusician && (
            <span className="user-musician" style={{ color: currentMusician.accentColor }}>
              🎸 {currentMusician.name}
            </span>
          )}
        </div>
        <button 
          className="theme-toggle" 
          onClick={toggleTheme}
          title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
        <div className="user-score">
          <span className="score-icon">⭐</span>
          <span className="score-value">{totalScore}</span>
        </div>
      </div>

      <style>{`
        .navigation {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background: #1E1E2E;
          border-bottom: 2px solid #FFD54F;
          position: sticky;
          top: 0;
          z-index: 100;
          flex-wrap: wrap;
          transition: background 0.3s ease;
        }

        [data-theme='light'] .navigation {
          background: #FFFFFF;
          border-bottom: 2px solid #FFB300;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .nav-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #FFD54F;
          text-shadow: 0 0 10px rgba(255, 213, 79, 0.5);
        }

        .hamburger {
          display: none;
          flex-direction: column;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          gap: 4px;
        }

        .hamburger span {
          width: 24px;
          height: 3px;
          background: #FFD54F;
          border-radius: 2px;
          transition: all 0.3s ease;
        }

        .nav-links {
          display: flex;
          gap: 8px;
          transition: all 0.3s ease-out;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          color: #E0E0E0;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease-out;
        }

        .nav-link:hover {
          background: rgba(255, 213, 79, 0.1);
          border-color: #FFD54F;
          transform: scale(1.05);
        }

        .nav-link.active {
          background: rgba(255, 213, 79, 0.2);
          border-color: #FFD54F;
          color: #FFD54F;
        }

        .nav-icon {
          font-size: 18px;
        }

        .nav-user {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .user-name {
          color: #E0E0E0;
          font-weight: 500;
        }

        .user-musician {
          font-size: 12px;
          opacity: 0.8;
        }

        .user-score {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          background: rgba(255, 213, 79, 0.1);
          border-radius: 20px;
          border: 1px solid #FFD54F;
        }

        .score-icon {
          font-size: 16px;
        }

        .score-value {
          color: #FFD54F;
          font-weight: bold;
          font-size: 16px;
        }

        .theme-toggle {
          width: 40px;
          height: 40px;
          border: none;
          background: rgba(255, 213, 79, 0.1);
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.3s ease-out;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #FFD54F;
        }

        .theme-toggle:hover {
          transform: scale(1.1) rotate(15deg);
          box-shadow: 0 0 15px rgba(255, 213, 79, 0.5);
        }

        [data-theme='light'] .nav-link {
          color: #424242;
        }

        [data-theme='light'] .nav-link:hover {
          background: rgba(255, 179, 0, 0.1);
          border-color: #FFB300;
        }

        [data-theme='light'] .nav-link.active {
          background: rgba(255, 179, 0, 0.2);
          border-color: #FFB300;
          color: #E65100;
        }

        [data-theme='light'] .user-name {
          color: #424242;
        }

        [data-theme='light'] .hamburger span {
          background: #FFB300;
        }

        [data-theme='light'] .theme-toggle {
          background: rgba(255, 179, 0, 0.1);
          border-color: #FFB300;
        }

        @media (max-width: 768px) {
          .navigation {
            padding: 12px 16px;
          }

          .nav-header {
            width: 100%;
          }

          .hamburger {
            display: flex;
          }

          .nav-links {
            flex-direction: column;
            width: 100%;
            max-height: 0;
            overflow: hidden;
            order: 3;
          }

          .nav-links.open {
            max-height: 300px;
            padding-top: 12px;
          }

          .nav-link {
            width: 100%;
            justify-content: flex-start;
          }

          .nav-user {
            order: 2;
          }

          .user-info {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
};
