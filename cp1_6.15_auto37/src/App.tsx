import React, { useState, useEffect, useRef } from 'react';
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
  const [transitionStage, setTransitionStage] = useState<'enter' | 'exit'>('enter');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      const navOrder = ['/', '/stats', '/settings'];
      const prevIndex = navOrder.indexOf(prevPathRef.current);
      const nextIndex = navOrder.indexOf(location.pathname);
      setSlideDirection(nextIndex > prevIndex ? 'left' : 'right');

      setTransitionStage('exit');
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage('enter');
      }, 150);

      prevPathRef.current = location.pathname;
      return () => clearTimeout(timer);
    }
  }, [location]);

  const getTransitionClass = () => {
    if (transitionStage === 'exit') {
      return `page-exit page-exit-${slideDirection}`;
    }
    return `page-enter page-enter-${slideDirection}`;
  };

  return (
    <div className="routes-wrapper">
      <div className={`routes-container ${getTransitionClass()}`}>
        <Routes location={displayLocation}>
          <Route path="/" element={<DailyLogPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
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

        .routes-wrapper {
          position: relative;
          width: 100%;
          overflow: hidden;
        }

        .routes-container {
          position: relative;
          width: 100%;
          min-height: calc(100vh - 120px);
        }

        .page-enter {
          animation-duration: 0.3s;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          animation-fill-mode: both;
        }

        .page-exit {
          animation-duration: 0.15s;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          animation-fill-mode: both;
        }

        .page-enter-left {
          animation-name: slideInFromRight;
        }

        .page-enter-right {
          animation-name: slideInFromLeft;
        }

        .page-exit-left {
          animation-name: slideOutToLeft;
        }

        .page-exit-right {
          animation-name: slideOutToRight;
        }

        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideOutToLeft {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(-30px);
          }
        }

        @keyframes slideOutToRight {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(30px);
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
