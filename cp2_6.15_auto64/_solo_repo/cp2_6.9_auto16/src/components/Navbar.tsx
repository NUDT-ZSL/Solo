import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-logo" onClick={() => setIsMenuOpen(false)}>
            <span className="logo-icon">🍳</span>
            <span className="logo-text">美食食谱</span>
          </Link>

          <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
            <Link
              to="/"
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="nav-icon">🏠</span>
              首页
            </Link>
            <Link
              to="/profile"
              className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="nav-icon">👤</span>
              个人中心
            </Link>
            <Link
              to="/create"
              className="nav-btn-create"
              onClick={() => setIsMenuOpen(false)}
            >
              <span>➕</span>
              创建食谱
            </Link>
          </div>

          <button
            className={`hamburger ${isMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="菜单"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>
      {isMenuOpen && <div className="menu-overlay" onClick={() => setIsMenuOpen(false)} />}
      <style>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: #ffffff;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        }
        .nav-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          font-size: 20px;
          font-weight: 700;
          color: #E67E22;
          transition: transform 0.2s ease;
        }
        .nav-logo:hover {
          transform: scale(1.02);
        }
        .nav-logo:active {
          transform: scale(0.95);
        }
        .logo-icon {
          font-size: 28px;
        }
        .logo-text {
          background: linear-gradient(135deg, #E67E22 0%, #F39C12 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 12px;
          text-decoration: none;
          color: #7f8c8d;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s ease;
          position: relative;
        }
        .nav-link:hover {
          background: #FFF8EE;
          color: #E67E22;
        }
        .nav-link:active {
          transform: scale(0.95);
        }
        .nav-link.active {
          color: #E67E22;
          background: #FFF8EE;
        }
        .nav-link.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          background: #E67E22;
          border-radius: 0 3px 3px 0;
        }
        .nav-icon {
          font-size: 16px;
        }
        .nav-btn-create {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          border-radius: 12px;
          background: linear-gradient(135deg, #E67E22 0%, #F39C12 100%);
          color: white;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(230, 126, 34, 0.3);
          transition: all 0.2s ease;
        }
        .nav-btn-create:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(230, 126, 34, 0.4);
        }
        .nav-btn-create:active {
          transform: scale(0.95);
        }
        .hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          padding: 8px;
          background: none;
          border: none;
          cursor: pointer;
          border-radius: 8px;
          transition: background 0.2s ease;
        }
        .hamburger:hover {
          background: #FFF8EE;
        }
        .hamburger span {
          display: block;
          width: 24px;
          height: 2px;
          background: #2c3e50;
          border-radius: 2px;
          transition: all 0.3s ease;
        }
        .hamburger.active span:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
        }
        .hamburger.active span:nth-child(2) {
          opacity: 0;
        }
        .hamburger.active span:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
        }
        .menu-overlay {
          display: none;
        }
        @media (max-width: 768px) {
          .hamburger {
            display: flex;
          }
          .nav-links {
            position: fixed;
            top: 64px;
            left: 0;
            right: 0;
            flex-direction: column;
            background: #ffffff;
            padding: 16px;
            gap: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transform: translateY(-120%);
            transition: transform 0.3s ease;
            z-index: 99;
          }
          .nav-links.active {
            transform: translateY(0);
          }
          .nav-link {
            width: 100%;
            padding: 14px 16px;
            font-size: 16px;
          }
          .nav-btn-create {
            width: 100%;
            justify-content: center;
            padding: 14px 20px;
            margin-top: 8px;
          }
          .menu-overlay {
            display: block;
            position: fixed;
            top: 64px;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.3);
            z-index: 98;
            opacity: 0;
            animation: fadeIn 0.3s ease forwards;
          }
          @keyframes fadeIn {
            to { opacity: 1; }
          }
        }
      `}</style>
    </>
  );
};

export default Navbar;
