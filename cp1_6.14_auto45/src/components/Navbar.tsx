import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>, key: string) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    button.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.navContainer}>
        <Link to="/" style={styles.logo}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <span style={styles.logoText}>PollVault</span>
        </Link>

        <div style={styles.navRight}>
          <button
            style={styles.navButton}
            className="ripple-button"
            onClick={(e) => { createRipple(e, 'back'); handleBack(); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            style={styles.menuButton}
            className="ripple-button"
            onClick={(e) => { createRipple(e, 'menu'); setMenuOpen(!menuOpen); }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {menuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>

          <div style={styles.avatar} title="用户">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div style={styles.mobileMenu}>
          <Link to="/" style={styles.menuItem} onClick={() => setMenuOpen(false)}>
            投票列表
          </Link>
          <Link to="/create" style={styles.menuItem} onClick={() => setMenuOpen(false)}>
            创建投票
          </Link>
        </div>
      )}
    </nav>
  );
};

const styles: Record<string, React.CSSProperties> = {
  navbar: {
    height: '56px',
    backgroundColor: '#0f172a',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  navContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: 600,
  },
  logoText: {
    background: 'linear-gradient(135deg, #6366f1, #ec4899)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  navButton: {
    display: 'none',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    color: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  menuButton: {
    display: 'none',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    color: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  mobileMenu: {
    display: 'none',
    position: 'absolute',
    top: '56px',
    left: 0,
    right: 0,
    backgroundColor: '#0f172a',
    borderTop: '1px solid #1e293b',
    padding: '8px 0',
  },
  menuItem: {
    display: 'block',
    padding: '12px 24px',
    color: '#e2e8f0',
    transition: 'background-color 0.2s ease',
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @media (max-width: 768px) {
    .nav-desktop-link { display: none !important; }
  }
`;
document.head.appendChild(styleSheet);

export default Navbar;
