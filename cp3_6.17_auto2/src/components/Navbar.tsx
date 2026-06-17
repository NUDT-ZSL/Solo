import { NavLink, useLocation } from 'react-router-dom';
import { Monitor, User, Settings } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();

  const navLinks = [
    { path: '/overview', label: '设备总览', icon: Monitor },
    { path: '/profile', label: '我的档案', icon: User },
    { path: '/admin', label: '管理面板', icon: Settings },
  ];

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav
      style={{
        height: '60px',
        backgroundColor: '#1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#ffffff',
          fontSize: '20px',
          fontWeight: 600,
          letterSpacing: '0.5px',
        }}
      >
        <Monitor size={28} style={{ color: '#3b82f6' }} />
        <span>设备共享站</span>
      </div>

      <div style={{ display: 'flex', gap: '32px', height: '100%' }}>
        {navLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.path);
          return (
            <NavLink
              key={link.path}
              to={link.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: active ? '#ffffff' : '#94a3b8',
                textDecoration: 'none',
                fontSize: '15px',
                fontWeight: 500,
                height: '100%',
                position: 'relative',
                transition: 'color 0.3s ease-out',
              }}
            >
              <Icon size={18} />
              <span>{link.label}</span>
              {active && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                    borderRadius: '2px 2px 0 0',
                  }}
                />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default Navbar;
