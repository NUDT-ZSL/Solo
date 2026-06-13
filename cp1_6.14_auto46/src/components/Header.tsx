import { Link } from 'react-router-dom'
import CartModule from '../modules/cart/CartModule'
import AuthModule from '../modules/auth/AuthModule'

const Header = () => {
  return (
    <header className="app-header">
      <div className="header-container">
        <Link to="/" className="logo">
          <span className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </span>
          <span className="logo-text">ArtVault</span>
        </Link>

        <nav className="nav-links">
          <Link to="/" className="nav-link">
            画廊
          </Link>
        </nav>

        <div className="header-actions">
          <CartModule />
          <AuthModule />
        </div>
      </div>

      <style>{`
        .app-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(26, 26, 46, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .header-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 40px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #e0e0e0;
          transition: color 0.2s ease;
        }

        .logo:hover {
          color: #c9a84c;
        }

        .logo-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          color: #c9a84c;
        }

        .logo-icon svg {
          width: 28px;
          height: 28px;
        }

        .logo-text {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .nav-links {
          display: flex;
          gap: 32px;
        }

        .nav-link {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 15px;
          font-weight: 500;
          color: #e0e0e0;
          text-decoration: none;
          position: relative;
          transition: color 0.2s ease;
        }

        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 2px;
          background: #c9a84c;
          transition: width 0.3s ease;
        }

        .nav-link:hover {
          color: #c9a84c;
        }

        .nav-link:hover::after {
          width: 100%;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        @media (max-width: 1024px) {
          .header-container {
            padding: 0 24px;
          }
        }

        @media (max-width: 768px) {
          .header-container {
            padding: 0 16px;
            height: 64px;
          }

          .nav-links {
            display: none;
          }

          .logo-text {
            font-size: 18px;
          }
        }
      `}</style>
    </header>
  )
}

export default Header
