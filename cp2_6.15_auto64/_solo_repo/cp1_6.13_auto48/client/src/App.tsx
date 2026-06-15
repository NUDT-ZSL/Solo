import { BrowserRouter as Router, Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Calendar from './components/Calendar';
import DeviceList from './components/DeviceList';
import Dashboard from './pages/Dashboard';

function AppContent() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(window.innerWidth < 768);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const handleResize = () => {
      const compact = window.innerWidth < 768;
      setIsCompact(compact);
      if (!compact) setMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="app-container">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isCompact && (
            <button className="hamburger-btn" onClick={toggleMenu} aria-label="菜单">
              ☰
            </button>
          )}
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            <h1>🏠 社区共享空间</h1>
          </Link>
        </div>
        <nav className={`app-nav ${menuOpen ? 'open' : ''}`}>
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
            📅 预约日历
          </NavLink>
          <NavLink to="/devices" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
            📦 设备借用
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
            ⚙️ 管理中心
          </NavLink>
        </nav>
      </header>

      {menuOpen && isCompact && (
        <div
          style={{ position: 'fixed', inset: 0, top: '60px', zIndex: 99 }}
          onClick={closeMenu}
        />
      )}

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Calendar />} />
          <Route path="/devices" element={<DeviceList />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>

      <footer className="app-footer">
        社区共享空间管理系统 v1.0.0
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
