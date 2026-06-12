import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ExhibitionList from './pages/ExhibitionList';
import ExhibitionDetail from './pages/ExhibitionDetail';
import CreateExhibition from './pages/CreateExhibition';
import Profile from './pages/Profile';
import { getTheme } from './themes';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

function App() {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(getTheme('暖阳橙'));

  useEffect(() => {
    const savedTheme = localStorage.getItem('museum_theme');
    if (savedTheme) {
      setCurrentTheme(getTheme(savedTheme));
    }
    const savedDark = localStorage.getItem('museum_dark');
    if (savedDark === 'true') {
      setDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    if (newVal) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('museum_dark', String(newVal));
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.5s ease',
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          transition: 'background-color 0.5s ease, border-color 0.5s ease',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
          }}
        >
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${currentTheme.primary}, ${currentTheme.primaryDark})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 20,
                fontWeight: 'bold',
                transition: 'all 0.4s ease',
              }}
            >
              博
            </div>
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 20,
                  color: 'var(--text-primary)',
                  transition: 'color 0.4s ease',
                }}
              >
                虚拟博物馆
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Virtual Museum
              </div>
            </div>
          </Link>

          <nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <NavLink
              to="/"
              end
              style={({ isActive }) => ({
                padding: '10px 20px',
                borderRadius: 10,
                fontWeight: 500,
                color: isActive ? currentTheme.textOnButton : 'var(--text-secondary)',
                background: isActive ? currentTheme.buttonBg : 'transparent',
                transition: 'all 0.4s ease',
                textDecoration: 'none',
              })}
            >
              探索展览
            </NavLink>
            <NavLink
              to="/create"
              style={({ isActive }) => ({
                padding: '10px 20px',
                borderRadius: 10,
                fontWeight: 500,
                color: isActive ? currentTheme.textOnButton : 'var(--text-secondary)',
                background: isActive ? currentTheme.buttonBg : 'transparent',
                transition: 'all 0.4s ease',
                textDecoration: 'none',
              })}
            >
              创建展览
            </NavLink>
            <NavLink
              to="/profile"
              style={({ isActive }) => ({
                padding: '10px 20px',
                borderRadius: 10,
                fontWeight: 500,
                color: isActive ? currentTheme.textOnButton : 'var(--text-secondary)',
                background: isActive ? currentTheme.buttonBg : 'transparent',
                transition: 'all 0.4s ease',
                textDecoration: 'none',
              })}
            >
              个人中心
            </NavLink>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={toggleDarkMode}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: 18,
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title={darkMode ? '切换到亮色模式' : '切换到暗色模式'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, width: '100%' }}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <motion.div
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <ExhibitionList onThemeChange={(t) => {
                    setCurrentTheme(getTheme(t));
                    localStorage.setItem('museum_theme', t);
                  }} />
                </motion.div>
              }
            />
            <Route
              path="/exhibition/:id"
              element={
                <motion.div
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <ExhibitionDetail onThemeChange={(t) => {
                    setCurrentTheme(getTheme(t));
                    localStorage.setItem('museum_theme', t);
                  }} />
                </motion.div>
              }
            />
            <Route
              path="/create"
              element={
                <motion.div
                  variants={pageVariants}
