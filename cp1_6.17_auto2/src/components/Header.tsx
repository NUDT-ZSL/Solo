import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Header.css';

interface HeaderProps {
  user: { id: string; username: string; avatar: string } | null;
  onLogout: () => void;
}

export default function Header({ user, onLogout }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    onLogout();
    setDropdownOpen(false);
    navigate('/');
  };

  const navLinks = [
    { path: '/', label: '首页' },
    { path: '/upload', label: '上传鉴定' }
  ];

  return (
    <header className="app-header">
      <div className="header-container">
        <Link to="/" className="logo">
          <span className="logo-icon">♪</span>
          <span className="logo-text">琴韵</span>
        </Link>

        <nav className="nav-desktop">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="header-right">
          {user ? (
            <div className="user-menu" ref={dropdownRef}>
              <button
                className="user-avatar-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <img src={user.avatar} alt={user.username} className="user-avatar" />
                <span className="username">{user.username}</span>
                <svg className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5H7z" />
                </svg>
              </button>
              
              {dropdownOpen && (
                <div className="dropdown-menu">
                  <Link to="/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                    个人中心
                  </Link>
                  <button className="dropdown-item" onClick={handleLogout}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                    </svg>
                    退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-login">
              登录
            </Link>
          )}

          <button
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      <div className={`mobile-menu-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)}>
        <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="mobile-menu-header">
            <span className="mobile-menu-title">菜单</span>
            <button className="close-btn" onClick={() => setMobileMenuOpen(false)}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          
          <nav className="mobile-nav">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`mobile-nav-link ${location.pathname === link.path ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
            
            {user ? (
              <>
                <Link to="/profile" className="mobile-nav-link">个人中心</Link>
                <button className="mobile-nav-link logout-link" onClick={handleLogout}>
                  退出登录
                </button>
              </>
            ) : (
              <Link to="/login" className="mobile-nav-link login-link">
                登录 / 注册
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
