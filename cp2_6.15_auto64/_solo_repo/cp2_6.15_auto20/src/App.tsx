import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import GardenPage from '@/pages/GardenPage';
import ExplorePage from '@/pages/ExplorePage';
import PlantDetailPage from '@/pages/PlantDetailPage';

const AnimatedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [show, setShow] = useState(true);
  const location = useLocation();

  useEffect(() => {
    setShow(false);
    const timer = setTimeout(() => setShow(true), 10);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}
    >
      {children}
    </div>
  );
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const navItems = [
    { path: '/home', label: '首页', icon: '🏠' },
    { path: '/garden', label: '我的植物园', icon: '🌱' },
    { path: '/explore', label: '探索广场', icon: '🔍' },
  ];

  const showNav = location.pathname !== '/home';

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <button
        onClick={() => setDarkMode(!darkMode)}
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: darkMode ? '#ffd700' : '#1e1e1e',
          color: darkMode ? '#1e1e1e' : '#ffd700',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
        title={darkMode ? '切换到亮色模式' : '切换到暗色模式'}
      >
        {darkMode ? '☀️' : '🌙'}
      </button>

      {showNav && (
        <nav
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            padding: '12px 20px',
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
            background: darkMode ? 'rgba(0,0,0,0.85)' : 'rgba(26, 58, 26, 0.9)',
            backdropFilter: 'blur(10px)',
            zIndex: 100,
            borderBottom: darkMode ? '1px solid #333' : '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {navItems.map(item => {
            const isActive = location.pathname === item.path ||
              (item.path === '/explore' && location.pathname.startsWith('/plant/'));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  background: isActive
                    ? 'linear-gradient(135deg, #667eea, #764ba2)'
                    : 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '400',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      <div style={{ paddingTop: showNav ? '64px' : 0 }}>
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<AnimatedRoute><HomePage /></AnimatedRoute>} />
          <Route path="/garden" element={<AnimatedRoute><GardenPage /></AnimatedRoute>} />
          <Route path="/explore" element={<AnimatedRoute><ExplorePage /></AnimatedRoute>} />
          <Route path="/plant/:id" element={<AnimatedRoute><PlantDetailPage /></AnimatedRoute>} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
