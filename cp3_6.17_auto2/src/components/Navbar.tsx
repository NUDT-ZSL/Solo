import { NavLink } from 'react-router-dom';

/* Navbar.tsx - 顶部导航栏
   调用关系：被 src/App.tsx 渲染
   样式：固定60px，深色#1e293b，当前页链接下划线渐变蓝#3b82f6
*/

const links = [
  { to: '/overview', label: '总览' },
  { to: '/profile', label: '我的档案' },
  { to: '/admin', label: '管理面板' },
];

export function Navbar() {
  return (
    <nav style={navStyle}>
      <div style={logoStyle}>设备共享站</div>
      <div style={linksStyle}>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            style={({ isActive }) => ({
              ...linkStyle,
              color: isActive ? '#fff' : '#cbd5e1',
              borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
            })}
          >
            {l.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

const navStyle: React.CSSProperties = {
  height: '60px',
  background: '#1e293b',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
  position: 'sticky',
  top: 0,
  zIndex: 100,
  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
};

const logoStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#fff',
  letterSpacing: '1px',
};

const linksStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
};

const linkStyle: React.CSSProperties = {
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 500,
  padding: '8px 12px',
  borderRadius: '6px',
  transition: 'color 0.3s ease, background 0.3s ease',
};
