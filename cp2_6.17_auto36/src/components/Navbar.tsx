import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '首页' },
    { path: '/my-projects', label: '开发者中心' },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: 'rgba(22, 33, 62, 0.95)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        borderBottom: '1px solid rgba(233, 69, 96, 0.2)',
      }}
    >
      <Link
        to="/"
        style={{
          fontSize: '22px',
          fontWeight: 'bold',
          color: '#e94560',
          letterSpacing: '1px',
        }}
      >
        IndieGame Hub
      </Link>

      <div style={{ display: 'flex', gap: '40px', height: '100%', alignItems: 'center' }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                position: 'relative',
                color: isActive ? '#ffffff' : '#a0a0b0',
                fontSize: '16px',
                padding: '8px 0',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#a0a0b0';
                }
              }}
            >
              {item.label}
              <span
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: isActive ? 'translateX(-50%) scaleX(1)' : 'translateX(-50%) scaleX(0)',
                  width: '100%',
                  height: '2px',
                  backgroundColor: '#e94560',
                  transition: 'transform 0.2s ease',
                  transformOrigin: 'center',
                }}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Navbar;
