import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { User } from '../types';
import { clearAuth } from '../api';
import './Navbar.css';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    onLogout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-brand" onClick={() => navigate('/')}>
          <span className="navbar-logo">☕</span>
          <span className="navbar-title">拼单咖啡角</span>
        </div>
        {user && (
          <>
            <div className="navbar-links">
              <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                首页
              </NavLink>
              <NavLink to="/orders" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                拼单广场
              </NavLink>
              <NavLink to="/wall" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                动态墙
              </NavLink>
              <NavLink to="/explore" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                风味探索
              </NavLink>
            </div>
            <div className="navbar-user">
              {user.avatar ? (
                <img src={user.avatar} alt={user.nickname} className="navbar-avatar" />
              ) : (
                <div className="navbar-avatar-placeholder">
                  {user.nickname.charAt(0)}
                </div>
              )}
              <span className="navbar-nickname">{user.nickname}</span>
              <button className="navbar-logout" onClick={handleLogout}>退出</button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
