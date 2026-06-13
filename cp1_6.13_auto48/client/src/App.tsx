import { BrowserRouter as Router, Routes, Route, NavLink, Link } from 'react-router-dom';
import { useState } from 'react';
import Calendar from './components/Calendar';
import DeviceList from './components/DeviceList';
import Dashboard from './pages/Dashboard';

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="hamburger-btn" onClick={toggleMenu}>
              ☰
            </button>
            <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }} onClick={closeMenu}>
              <h1>🏠 社区共享空间</h1>
            </Link>
          </div>
          <nav className={`app-nav ${menuOpen ? 'open' : ''}`}>
            <NavLink
              to="/"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeMenu}
            >
              📅 预约日历
            </NavLink>
            <NavLink
              to="/devices"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeMenu}
            >
              📦 设备借用
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeMenu}
            >
              ⚙️ 管理中心
            </NavLink>
          </nav>
        </header>

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
    </Router>
  );
}

export default App;
