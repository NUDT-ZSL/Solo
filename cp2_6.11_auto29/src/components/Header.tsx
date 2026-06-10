import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();
  const isProfile = location.pathname === '/profile';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(14, 22, 38, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            color: 'var(--text-primary)',
            fontSize: 24,
            fontWeight: 500,
            fontFamily: "'Noto Serif SC', serif",
            letterSpacing: '2px'
          }}
        >
          🌳 时光树洞
        </Link>

        <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              color: 'var(--text-primary)',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 14,
              background: location.pathname === '/' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              transition: 'all 0.3s ease'
            }}
            className="btn-primary"
          >
            时间线
          </Link>
          <Link
            to="/profile"
            style={{
              textDecoration: 'none',
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: isProfile ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              transition: 'all 0.3s ease',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            title="个人面板"
          >
            👤
          </Link>
        </nav>
      </div>
    </header>
  );
}
