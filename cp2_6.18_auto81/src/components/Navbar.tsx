import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/components.css';

interface NavbarProps {
  isAdmin?: boolean;
  currentUser?: string;
}

export default function Navbar({ isAdmin = true, currentUser = '张三' }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { path: '/', label: '首页' },
    { path: '/publish', label: '发布物品' },
    ...(isAdmin ? [{ path: '/admin', label: '管理后台' }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">易物社区</Link>

        <div className="navbar-desktop-nav">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`navbar-link ${isActive(link.path) ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
          <span className="navbar-user-info">{currentUser}</span>
        </div>

        <button
          className="navbar-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="菜单"
        >
          <span className="navbar-hamburger-line"></span>
          <span className="navbar-hamburger-line"></span>
          <span className="navbar-hamburger-line"></span>
        </button>
      </div>

      <div className={`navbar-mobile-menu ${mobileMenuOpen ? 'open' : 'closed'}`}>
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`navbar-mobile-link ${isActive(link.path) ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            {link.label}
          </Link>
        ))}
        <span className="navbar-mobile-user-info">{currentUser}</span>
      </div>
    </nav>
  );
}
