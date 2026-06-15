import { useState } from 'react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: 'classes' | 'profile' | 'admin') => void;
  userId: string;
}

function Navbar({ currentPage, onNavigate, userId }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { key: 'classes', label: '课表', icon: '📅' },
    { key: 'profile', label: '个人中心', icon: '👤' },
    { key: 'admin', label: '管理面板', icon: '⚙️' },
  ];

  const isCoach = userId.startsWith('coach');

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-logo" onClick={() => onNavigate('classes')}>
          <span className="logo-icon">💪</span>
          <span className="logo-text">FitScheduler</span>
        </div>

        <div className="navbar-links">
          {navItems.map(item => (
            <button
              key={item.key}
              className={`nav-link ${currentPage === item.key ? 'active' : ''}`}
              onClick={() => {
                onNavigate(item.key as 'classes' | 'profile' | 'admin');
                setMobileMenuOpen(false);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="navbar-user">
          <span className="user-role">{isCoach ? '👨‍🏫 教练' : '👤 会员'}</span>
        </div>

        <button 
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="mobile-menu">
          {navItems.map(item => (
            <button
              key={item.key}
              className={`mobile-nav-link ${currentPage === item.key ? 'active' : ''}`}
              onClick={() => {
                onNavigate(item.key as 'classes' | 'profile' | 'admin');
                setMobileMenuOpen(false);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      <style>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 100;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .navbar-inner {
          max-width: 1400px;
          margin: 0 auto;
          height: 100%;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .navbar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          user-select: none;
        }

        .logo-icon {
          font-size: 24px;
        }

        .logo-text {
          font-size: 20px;
          font-weight: 700;
          background: linear-gradient(135deg, #4caf50, #81c784);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .navbar-links {
          display: flex;
          gap: 8px;
          flex: 1;
          justify-content: center;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.25s ease-out;
          position: relative;
          overflow: hidden;
        }

        .nav-link:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          transform: translateY(-1px);
        }

        .nav-link.active {
          background: rgba(76, 175, 80, 0.2);
          color: #4caf50;
        }

        .nav-icon {
          font-size: 16px;
        }

        .navbar-user {
          display: flex;
          align-items: center;
        }

        .user-role {
          font-size: 13px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          color: rgba(255, 255, 255, 0.8);
        }

        .mobile-menu-btn {
          display: none;
          background: transparent;
          color: #fff;
          font-size: 24px;
          padding: 8px 12px;
          border-radius: 8px;
        }

        .mobile-menu {
          display: none;
          position: absolute;
          top: 60px;
          left: 0;
          right: 0;
          background: rgba(0, 0, 0, 0.95);
          backdrop-filter: blur(20px);
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .mobile-nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 14px 16px;
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
          border-radius: 10px;
          font-size: 16px;
          text-align: left;
        }

        .mobile-nav-link.active {
          background: rgba(76, 175, 80, 0.2);
          color: #4caf50;
        }

        @media (max-width: 768px) {
          .navbar-inner {
            padding: 0 16px;
          }

          .navbar-links {
            display: none;
          }

          .navbar-user {
            display: none;
          }

          .mobile-menu-btn {
            display: block;
          }

          .mobile-menu {
            display: block;
          }

          .logo-text {
            font-size: 18px;
          }
        }
      `}</style>
    </nav>
  );
}

export default Navbar;
