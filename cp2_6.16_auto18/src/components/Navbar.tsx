import { Link, useLocation } from 'react-router-dom';
import { Leaf, User } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      style={{
        height: '56px',
        backgroundColor: 'var(--color-primary)',
        color: '#ffffff',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          to="/"
          className="ripple-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#ffffff',
            textDecoration: 'none',
            padding: '8px 12px',
            borderRadius: '8px',
            transition: 'background-color var(--transition-fast)',
          }}
        >
          <Leaf size={24} />
          <span style={{ fontSize: '18px', fontWeight: 700 }}>园艺助手</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            to="/garden"
            className="ripple-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              color: isActive('/garden') ? 'var(--color-primary)' : '#ffffff',
              backgroundColor: isActive('/garden') ? 'var(--color-secondary)' : 'transparent',
              transition: 'all var(--transition-fast)',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            我的植物库
          </Link>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
              marginLeft: '8px',
            }}
          >
            <User size={20} />
          </div>
        </div>
      </div>
    </nav>
  );
}
