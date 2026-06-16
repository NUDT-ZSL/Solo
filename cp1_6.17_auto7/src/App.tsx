import { Routes, Route, NavLink } from 'react-router-dom';
import { useState } from 'react';
import AnimalList from './pages/AnimalList';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="nav-content">
          <div className="nav-brand">
            <span className="brand-icon">🐾</span>
            <span className="brand-text">流浪动物救助站</span>
          </div>
          <button
            className={`hamburger ${menuOpen ? 'active' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="菜单"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div className={`nav-links ${menuOpen ? 'mobile-open' : ''}`}>
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              动物列表
            </NavLink>
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              管理员后台
            </NavLink>
          </div>
        </div>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<AnimalList />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>
    </div>
  );
}
