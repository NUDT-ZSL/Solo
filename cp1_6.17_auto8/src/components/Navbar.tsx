import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import '../styles/app.css';

const Navbar: React.FC = () => {
  const { user } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: '/', label: '首页', icon: '🏠' },
    { to: '/challenge', label: '挑战', icon: '🎯' },
    { to: '/profile', label: '个人中心', icon: '👤' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-logo">
          <span className="navbar-logo-icon">☕</span>
          <span>豆录</span>
        </div>

        <button
          className="hamburger-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="菜单"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>

        <div className={`navbar-links ${mobileOpen ? 'mobile-open' : ''}`}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `navbar-link ${isActive ? 'active' : ''}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </div>

        {user && (
          <div className="navbar-user">
            <img src={user.avatar} alt={user.username} className="navbar-avatar" />
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
