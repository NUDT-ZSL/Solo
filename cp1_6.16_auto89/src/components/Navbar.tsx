import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import '../styles/Navbar.css';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, isEditMode, toggleLogin, toggleEditMode } = useAppContext();

  const showEditToggle = location.pathname.startsWith('/work/');

  return (
    <nav className="navbar">
      <div className="navbar-logo" onClick={() => navigate('/')}>
        指尖工艺坊
      </div>
      <div className="navbar-actions">
        {showEditToggle && isLoggedIn && (
          <button
            className={`edit-mode-toggle ${isEditMode ? 'active' : ''}`}
            onClick={toggleEditMode}
          >
            {isEditMode ? '退出编辑' : '编辑模式'}
          </button>
        )}
        <button
          className={`login-btn ${isLoggedIn ? 'logged-in' : ''}`}
          onClick={toggleLogin}
        >
          {isLoggedIn ? '已登录' : '登录'}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
