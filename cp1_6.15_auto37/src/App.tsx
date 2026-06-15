import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  useLocation,
} from 'react-router-dom';
import DailyLogPage from './pages/DailyLogPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('fadeIn');

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('fadeOut');
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage('slideIn');
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location, displayLocation]);

  const getTransitionClass = () => {
    if (transitionStage === 'fadeOut') return 'fade-out';
    if (transitionStage === 'slideIn') return 'slide-in';
    return 'fade-in';
  };

  return (
    <div className={`routes-container ${getTransitionClass()}`}>
      <Routes location={displayLocation}>
        <Route path="/" element={<DailyLogPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="app-container">
        <nav className="bottom-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => {
              return `nav-item ${isActive ? 'active' : ''}`;
            }}
          >
            <span className="nav-icon">📝</span>
            <span className="nav-label">日记</span>
          </NavLink>
          <NavLink
            to="/stats"
            className={({ isActive }) => {
              return `nav-item ${isActive ? 'active' : ''}`;
            }}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-label">统计</span>
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => {
              return `nav-item ${isActive ? 'active' : ''}`;
            }}
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">设置</span>
          </NavLink>
        </nav>

        <main className="main-content">
          <AnimatedRoutes />
        </main>
      </div>

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
            'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
          background-color: #f5f7fa;
          color: #1a202c;
          line-height: 1.6;
        }

        .app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #f5f7fa;
        }

        .main-content {
          flex: 1;
          padding: 1.5rem;
          padding-bottom: 5rem;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #fff;
          display: flex;
          justify-content: space-around;
          padding: 0.5rem 0;
          padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0));
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.08);
          z-index: 50;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 1.5rem;
          text-decoration: none;
          color: #a0aec0;
          transition: all 0.2s ease;
          border-radius: 8px;
          position: relative;
        }

        .nav-item.active {
          color: #4a90d9;
        }

        .nav-item.active::after {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background: #4a90d9;
          border-radius: 50%;
        }

        .nav-item:active {
          transform: scale(0.95);
        }

        .nav-icon {
          font-size: 1.5rem;
        }

        .nav-label {
          font-size: 0.75rem;
          font-weight: 500;
        }

        .routes-container {
          position: relative;
        }

        .fade-in {
          animation: fadeIn 0.3s ease;
        }

        .fade-out {
          animation: fadeOut 0.15s ease forwards;
        }

        .slide-in {
          animation: slideInFromRight 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .btn {
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
        }

        .btn:active {
          transform: scale(0.96);
        }

        .btn-primary {
          background: #4a90d9;
          color: #fff;
        }

        .btn-primary:hover {
          background: #357abd;
        }

        .btn-primary:disabled {
          background: #a0aec0;
          cursor: not-allowed;
        }

        .btn-primary:disabled:active {
          transform: none;
        }

        .btn-secondary {
          background: #edf2f7;
          color: #4a5568;
        }

        .btn-secondary:hover {
          background: #e2e8f0;
        }

        .page {
          animation: pageFadeIn 0.3s ease;
        }

        @keyframes pageFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .main-content {
            padding: 1rem;
            padding-bottom: 4.5rem;
          }

          .nav-item {
            padding: 0.5rem 1rem;
          }
        }
      `}</style>
    </Router>
  );
};

export default App;
