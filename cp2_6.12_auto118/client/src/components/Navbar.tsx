import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  cartCount: number;
  onCartClick: () => void;
}

const Navbar = ({ cartCount, onCartClick }: NavbarProps) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 480);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navLinks = [
    { path: '/', label: '作品' },
    { path: '/courses', label: '课程' }
  ];

  const navItemStyle = (path: string) => ({
    color: location.pathname === path ? '#8B5E3C' : '#4a3728',
    fontWeight: location.pathname === path ? 600 : 500,
    fontSize: 16,
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: 8,
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: 6
  });

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        backgroundColor: 'rgba(255, 248, 240, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(139, 94, 60, 0.15)',
        zIndex: 1000
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 8%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #8B5E3C, #4a3728)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D4A574',
              fontSize: 18,
              fontWeight: 700
            }}
          >
            匠
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#4a3728' }}>匠心皮具</span>
        </Link>

        {isMobile ? (
          <>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{
                background: 'none',
                padding: 8,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4a3728" strokeWidth="2">
                {isMobileMenuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>

            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{
                    position: 'absolute',
                    top: 60,
                    left: 0,
                    right: 0,
                    backgroundColor: '#FFF8F0',
                    borderBottom: '1px solid rgba(139, 94, 60, 0.15)',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}
                >
                  {navLinks.map(link => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      style={navItemStyle(link.path)}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div
                    onClick={() => {
                      onCartClick();
                      setIsMobileMenuOpen(false);
                    }}
                    style={{ ...navItemStyle('/cart'), cursor: 'pointer' }}
                  >
                    购物车 ({cartCount})
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {navLinks.map(link => (
              <Link key={link.path} to={link.path} style={navItemStyle(link.path)}>
                {link.label}
              </Link>
            ))}
            <button
              onClick={onCartClick}
              style={{
                background: 'none',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                position: 'relative'
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4a3728" strokeWidth="2">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;
