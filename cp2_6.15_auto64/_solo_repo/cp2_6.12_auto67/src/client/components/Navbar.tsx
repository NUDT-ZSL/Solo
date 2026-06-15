import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMenuOpen(false);
  };

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(255, 248, 231, 0.9)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border-light)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          to="/"
          style={{
            fontSize: '22px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, var(--primary-purple), var(--primary-orange))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textDecoration: 'none',
          }}
        >
          书影音收藏
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'none', alignItems: 'center', gap: '20px' }} className="desktop-menu">
            {user && (
              <>
                <Link
                  to="/"
                  style={{
                    color: 'var(--text-dark)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'color 0.2s ease',
                  }}
                >
                  我的收藏
                </Link>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <img
                    src={user.avatar}
                    alt={user.username}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                    }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>{user.username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'var(--text-gray)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  退出
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              width: '40px',
              height: '40px',
              gap: '5px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              padding: 0,
            }}
            className="mobile-menu-btn"
          >
            <motion.span
              animate={{ rotate: isMenuOpen ? 45 : 0, y: isMenuOpen ? 7 : 0 }}
              transition={{ duration: 0.2 }}
              style={{
                width: '24px',
                height: '2px',
                backgroundColor: 'var(--text-dark)',
                borderRadius: '2px',
              }}
            />
            <motion.span
              animate={{ opacity: isMenuOpen ? 0 : 1 }}
              transition={{ duration: 0.2 }}
              style={{
                width: '24px',
                height: '2px',
                backgroundColor: 'var(--text-dark)',
                borderRadius: '2px',
              }}
            />
            <motion.span
              animate={{ rotate: isMenuOpen ? -45 : 0, y: isMenuOpen ? -7 : 0 }}
              transition={{ duration: 0.2 }}
              style={{
                width: '24px',
                height: '2px',
                backgroundColor: 'var(--text-dark)',
                borderRadius: '2px',
              }}
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: '64px',
              right: 0,
              bottom: 0,
              width: '280px',
              backgroundColor: 'white',
              boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.1)',
              padding: '20px',
              zIndex: 99,
            }}
          >
            {user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid var(--border-light)',
                  }}
                >
                  <img
                    src={user.avatar}
                    alt={user.username}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                    }}
                  />
                  <div>
                    <p style={{ fontWeight: 600 }}>{user.username}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-gray)' }}>我的收藏</p>
                  </div>
                </div>

                <Link
                  to="/"
                  onClick={() => setIsMenuOpen(false)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    color: 'var(--text-dark)',
                    textDecoration: 'none',
                    fontSize: '15px',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  🏠 首页
                </Link>

                <button
                  onClick={handleLogout}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '15px',
                    color: '#E74C3C',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fef0f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  🚪 退出登录
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ color: 'var(--text-gray)', fontSize: '14px' }}>请先登录</p>
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--primary-purple)',
                    color: 'white',
                    textAlign: 'center',
                    textDecoration: 'none',
                    fontSize: '15px',
                    fontWeight: 500,
                  }}
                >
                  登录
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (min-width: 768px) {
          .desktop-menu {
            display: flex !important;
          }
          .mobile-menu-btn {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
