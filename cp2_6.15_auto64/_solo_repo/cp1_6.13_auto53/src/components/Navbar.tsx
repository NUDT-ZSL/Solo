import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { PawPrint, Menu, X, Home, Calendar, FileText, BookOpen } from 'lucide-react';

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/schedule', label: '日程看板', icon: Calendar },
    { path: '/pets', label: '宠物档案', icon: BookOpen },
    { path: '/logs/booking-demo-1', label: '看护日志', icon: FileText },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '56px',
          background: 'rgba(245, 230, 211, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(92, 64, 51, 0.1)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
        }}
      >
        <NavLink
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            color: 'var(--color-text)',
            marginRight: '32px',
          }}
        >
          <PawPrint size={28} style={{ color: 'var(--color-primary)' }} />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              fontWeight: '600',
            }}
          >
            PetHotel
          </span>
        </NavLink>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            flex: 1,
            '@media (max-width: 768px)': { display: 'none' },
          }}
          className="desktop-nav"
        >
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: active ? 'var(--color-primary)' : 'var(--color-text)',
                  background: active ? 'rgba(217, 119, 6, 0.1)' : 'transparent',
                  fontWeight: active ? '500' : '400',
                  transition: 'all 0.2s ease',
                  fontSize: '0.95rem',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'var(--color-bg-alt)';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{
            display: 'none',
            '@media (max-width: 768px)': { display: 'flex' },
            background: 'none',
            border: 'none',
            padding: '8px',
            borderRadius: '8px',
            cursor: 'pointer',
            color: 'var(--color-text)',
            marginLeft: 'auto',
          }}
          className="mobile-menu-btn"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {isMobileMenuOpen && (
        <div
          className="fade-in"
          style={{
            position: 'fixed',
            top: '56px',
            left: 0,
            right: 0,
            background: 'var(--color-bg)',
            borderBottom: '1px solid var(--color-border)',
            padding: '16px',
            zIndex: 99,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: active ? 'var(--color-primary)' : 'var(--color-text)',
                  background: active ? 'rgba(217, 119, 6, 0.1)' : 'transparent',
                  fontWeight: active ? '500' : '400',
                }}
              >
                <Icon size={20} />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      )}

      <div
        style={{
          display: 'none',
          '@media (min-width: 1024px)': {
            display: 'block',
          },
          position: 'fixed',
          left: 0,
          top: '56px',
          bottom: 0,
          width: '240px',
          background: 'var(--color-text)',
          color: 'white',
          padding: '24px 0',
          zIndex: 50,
        }}
        className="sidebar"
      >
        <div style={{ padding: '0 24px 16px', fontSize: '0.85rem', opacity: 0.6 }}>
          管理菜单
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 24px',
                textDecoration: 'none',
                color: active ? 'white' : 'rgba(255, 255, 255, 0.7)',
                background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                borderLeft: active ? '3px solid var(--color-primary)' : '3px solid transparent',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 1023px) {
          .sidebar { display: none !important; }
        }
        @media (min-width: 1024px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: none !important; }
        }
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          .desktop-nav { display: none !important; }
        }
        @media (min-width: 769px) and (max-width: 1023px) {
          .desktop-nav { display: flex !important; }
        }
      `}</style>
    </>
  );
};

export default Navbar;
