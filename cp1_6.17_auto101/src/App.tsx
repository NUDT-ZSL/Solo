import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { api } from './api';
import Auth from './pages/Auth';
import WorkList from './pages/WorkList';
import WorkDetail from './pages/WorkDetail';
import Upload from './pages/Upload';
import Profile from './pages/Profile';

function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!api.getToken());
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = () => {
      setIsLoggedIn(!!api.getToken());
      if (!api.getToken()) {
        navigate('/auth');
      }
    };
    window.addEventListener('auth:unauthorized', handleAuth);
    return () => window.removeEventListener('auth:unauthorized', handleAuth);
  }, [navigate]);

  const handleLogout = () => {
    api.removeToken();
    api.removeUser();
    setIsLoggedIn(false);
    navigate('/auth');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">🎨 版权交易平台</Link>
      <div className="navbar-links">
        <Link to="/">作品库</Link>
        {isLoggedIn ? (
          <>
            <Link to="/upload">上传作品</Link>
            <Link to="/profile">个人中心</Link>
            <button onClick={handleLogout}>退出</button>
          </>
        ) : (
          <Link to="/auth">登录/注册</Link>
        )}
      </div>
    </nav>
  );
}

function AppContent() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const handleUnauthorized = () => {
      setToast({ message: '登录已过期，请重新登录', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  return (
    <>
      <Navbar />
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
      <Routes>
        <Route path="/" element={<WorkList />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/works/:id" element={<WorkDetail />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
