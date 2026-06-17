import { NavLink, Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';

export default function Navbar() {
  const { user, loading } = useUser();

  return (
    <nav className="nav-container">
      <div className="nav-inner">
        <Link to="/overview" className="nav-logo">
          <div className="nav-logo-icon">📦</div>
          <span>设备共享站</span>
        </Link>

        <ul className="nav-links">
          <li>
            <NavLink
              to="/overview"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              总览
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/profile"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              我的档案
            </NavLink>
          </li>
          {user?.role === 'admin' && (
            <li>
              <NavLink
                to="/admin"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                管理面板
              </NavLink>
            </li>
          )}
        </ul>

        {!loading && user && (
          <div className="nav-user">
            <div className="nav-user-info">
              <span className="nav-user-name">{user.name}</span>
              <span className="nav-user-credit">信用分: {user.creditScore}</span>
            </div>
            <img
              src={user.avatar}
              alt={user.name}
              className="nav-user-avatar"
            />
          </div>
        )}
      </div>
    </nav>
  );
}
