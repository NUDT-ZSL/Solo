import { useState } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { BookOpen, Menu, X, User as UserIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: '/home', label: '首页' },
    { to: '/books', label: '搜书' },
    { to: '/tracker', label: '漂流追踪' },
    { to: '/profile', label: '个人中心' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/home');
  };

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        background: '#ffffff',
        borderBottom: '1px solid #e7e5e4',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        zIndex: 100,
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '100%',
        }}
      >
        <Link
          to="/home"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 700,
            fontSize: 18,
            color: '#d97706',
          }}
        >
          <BookOpen size={24} />
          <span>图书漂流</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                style={({ isActive }) => ({
                  position: 'relative',
                  fontSize: 14,
                  fontWeight: 500,
                  color: isActive ? '#d97706' : '#292524',
                  padding: '4px 2px',
                })}
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: '50%',
                        transform: isActive
                          ? 'translateX(-50%) scaleX(1)'
                          : 'translateX(-50%) scaleX(0)',
                        width: '100%',
                        height: 2,
                        background: '#d97706',
                        transition: 'transform 0.2s ease',
                        transformOrigin: 'center',
                      }}
                    />
                  </>
                )}
              </NavLink>
            ))}
            {user?.isAdmin && (
              <NavLink
                to="/admin"
                style={({ isActive }) => ({
                  position: 'relative',
                  fontSize: 14,
                  fontWeight: 500,
                  color: isActive ? '#d97706' : '#292524',
                  padding: '4px 2px',
                })}
              >
                管理面板
              </NavLink>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              <Link
                to="/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 14,
                  color: '#292524',
                }}
              >
                <img
                  src={user.avatar}
                  alt={user.nickname}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#f5f5f4',
                  }}
                />
                <span style={{ fontWeight: 500 }}>{user.nickname}</span>
              </Link>
              <button className="btn-secondary" onClick={handleLogout} style={{ padding: '6px 14px', fontSize: 13 }}>
                登出
              </button>
            </>
          ) : (
            <>
              <Link to="/login">
                <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
                  登录
                </button>
              </Link>
              <Link to="/register">
                <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
                  注册
                </button>
              </Link>
            </>
          )}
          <button
            style={{
              display: 'none',
              background: 'transparent',
              padding: 4,
            }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          style={{
            background: '#ffffff',
            borderTop: '1px solid #e7e5e4',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{ fontSize: 14, color: '#292524' }}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          nav > div > div:nth-child(2) {
            display: none !important;
          }
          nav > div > div:nth-child(3) > a,
          nav > div > div:nth-child(3) > button:not(:last-child) {
            display: none !important;
          }
          nav > div > div:nth-child(3) > button:last-child {
            display: block !important;
          }
        }
      `}</style>
    </nav>
  );
}
