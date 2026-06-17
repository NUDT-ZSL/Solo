import React, { useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Borrow from './pages/Borrow';
import MyBorrows from './pages/MyBorrows';
import AdminRepairs from './pages/AdminRepairs';

const App: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const handleNavClick = () => {
    setMenuOpen(false);
  };

  const navLinks = [
    { path: '/', label: '首页' },
    { path: '/my-borrows', label: '我的借用' },
    { path: '/admin/repairs', label: '维修管理' },
  ];

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-container">
          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="菜单"
          >
            ☰
          </button>
          <div className="nav-links">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                onClick={handleNavClick}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className={`nav-menu-mobile${menuOpen ? ' open' : ''}`}>
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                onClick={handleNavClick}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      <main className="main-content">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/borrow/:id" element={<Borrow />} />
          <Route path="/my-borrows" element={<MyBorrows />} />
          <Route path="/admin/repairs" element={<AdminRepairs />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
