import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo" onClick={() => navigate('/')}>
          设备共享站
        </div>
        <div className="navbar-links">
          <NavLink
            to="/overview"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            总览
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            我的档案
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              管理面板
            </NavLink>
          )}
        </div>
        {user && (
          <div className="navbar-user">
            <img src={user.avatar} alt={user.name} className="navbar-avatar" />
            <span className="navbar-username">{user.name}</span>
          </div>
        )}
      </div>
    </nav>
  );
}
