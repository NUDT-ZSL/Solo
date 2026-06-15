import React, { useState, lazy, Suspense, useCallback, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { loginUser, User } from './api/requests';

const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

function LoadingSpinner() {
  return (
    <div className="loading-spinner">
      <div className="spinner" />
    </div>
  );
}

function loadStoredUser(): User | null {
  try {
    const stored = localStorage.getItem('fithub_user');
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function saveStoredUser(user: User | null) {
  if (user) {
    localStorage.setItem('fithub_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('fithub_user');
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(loadStoredUser);
  const [loginName, setLoginName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogin = useCallback(async () => {
    if (!loginName.trim()) return;
    try {
      const u = await loginUser(loginName.trim());
      setUser(u);
      saveStoredUser(u);
      setLoginName('');
    } catch {
      console.error('Login failed');
    }
  }, [loginName]);

  const handleLogout = useCallback(() => {
    setUser(null);
    saveStoredUser(null);
    setMenuOpen(false);
  }, []);

  if (!user) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="#f97316" strokeWidth="3" />
              <path d="M16 28l6-8 4 6 6-10" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h1>FitHub</h1>
          </div>
          <p className="login-subtitle">社区运动中心 · 预约与训练记录平台</p>
          <div className="login-form">
            <input
              type="text"
              placeholder="输入您的姓名"
              value={loginName}
              onChange={e => setLoginName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="login-input"
            />
            <button onClick={handleLogin} className="login-btn">登 录</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="top-nav">
        <div className="nav-left">
          <div className="brand">
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="#f97316" strokeWidth="3" />
              <path d="M16 28l6-8 4 6 6-10" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="brand-name">FitHub</span>
          </div>
          {!isMobile && (
            <nav className="nav-tabs">
              <NavLink
                to="/user"
                className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
              >
                会员端
              </NavLink>
              <NavLink
                to="/admin"
                className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
              >
                管理端
              </NavLink>
            </nav>
          )}
        </div>
        {!isMobile && (
          <div className="nav-right">
            <span className="user-name">{user.name}</span>
            <button className="logout-btn" onClick={handleLogout}>退出</button>
          </div>
        )}
        {isMobile && (
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
          </button>
        )}
      </header>

      {isMobile && menuOpen && (
        <div className="mobile-menu">
          <div className="mobile-user-info">{user.name}</div>
          <NavLink to="/user" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>会员端</NavLink>
          <NavLink to="/admin" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>管理端</NavLink>
          <button className="mobile-logout" onClick={handleLogout}>退出登录</button>
        </div>
      )}

      <main className="main-content">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/user" element={<UserDashboard user={user} />} />
            <Route path="/admin" element={<AdminDashboard user={user} />} />
            <Route path="*" element={<Navigate to="/user" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
