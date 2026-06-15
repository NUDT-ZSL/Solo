import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

interface NavbarProps {
  onNotificationClick: () => void;
}

export default function Navbar({ onNotificationClick }: NavbarProps) {
  const { user, isAuthenticated, logout, unreadCount } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <i className="fas fa-book-open" style={{ color: '#ff6b35' }}></i>
          <span>书缘</span>
        </Link>

        <div className="navbar-links">
          <Link to="/" className="nav-link">
            <i className="fas fa-home"></i>
            首页
          </Link>
          <Link to="/exchange" className="nav-link">
            <i className="fas fa-exchange-alt"></i>
            匹配中心
          </Link>
          {isAuthenticated && (
            <Link to="/my-books" className="nav-link">
              <i className="fas fa-book"></i>
              我的发布
            </Link>
          )}
        </div>

        <div className="navbar-actions">
          <button
            className="nav-icon-btn notification-btn"
            onClick={onNotificationClick}
          >
            <i className="fas fa-bell"></i>
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>

          {isAuthenticated ? (
            <div className="user-menu">
              <div className="user-avatar">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.username} />
                ) : (
                  <div className="avatar-placeholder">
                    {user?.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                退出
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary">
              登录
            </Link>
          )}

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="mobile-menu">
          <Link to="/" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
            <i className="fas fa-home"></i>
            首页
          </Link>
          <Link to="/exchange" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
            <i className="fas fa-exchange-alt"></i>
            匹配中心
          </Link>
          {isAuthenticated && (
            <Link to="/my-books" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
              <i className="fas fa-book"></i>
              我的发布
            </Link>
          )}
          {isAuthenticated ? (
            <button className="mobile-nav-link" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i>
              退出登录
            </button>
          ) : (
            <Link to="/login" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
              <i className="fas fa-sign-in-alt"></i>
              登录
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
