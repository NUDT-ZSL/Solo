import { Link, NavLink } from 'react-router-dom';

export function Navbar() {
  const linkBaseStyle = {
    padding: '8px 16px',
    borderRadius: '6px',
    textDecoration: 'none',
    color: '#4b5563',
    fontWeight: 500,
    transition: 'all 0.2s',
  };

  const linkActiveStyle = {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
  };

  return (
    <nav style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        height: '60px',
        gap: '8px',
      }}>
        <Link to="/overview" style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#1f2937',
          textDecoration: 'none',
          marginRight: '32px',
        }}>
          设备借用系统
        </Link>
        <NavLink
          to="/overview"
          style={({ isActive }) => ({
            ...linkBaseStyle,
            ...(isActive ? linkActiveStyle : {}),
          })}
        >
          设备总览
        </NavLink>
        <NavLink
          to="/profile"
          style={({ isActive }) => ({
            ...linkBaseStyle,
            ...(isActive ? linkActiveStyle : {}),
          })}
        >
          我的档案
        </NavLink>
        <NavLink
          to="/admin"
          style={({ isActive }) => ({
            ...linkBaseStyle,
            ...(isActive ? linkActiveStyle : {}),
          })}
        >
          管理后台
        </NavLink>
      </div>
    </nav>
  );
}
