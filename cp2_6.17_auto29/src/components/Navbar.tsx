import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationToast from './NotificationToast';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { member, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🥬</span>
          <span className="logo-text">田园鲜蔬</span>
        </Link>

        <div className="navbar-links">
          <Link to="/" className="nav-link">首页</Link>
          {member && (
            <>
              <Link to="/orders" className="nav-link">我的订单</Link>
              {member.isAdmin && (
                <Link to="/admin" className="nav-link admin-link">管理后台</Link>
              )}
            </>
          )}
        </div>

        <div className="navbar-user">
          {member ? (
            <div className="user-info">
              <NotificationToast />
              <span className="user-name">{member.name}</span>
              <button className="logout-btn" onClick={handleLogout}>
                退出
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-outline btn-sm">登录</Link>
              <Link to="/register" className="btn btn-primary btn-sm">注册</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
