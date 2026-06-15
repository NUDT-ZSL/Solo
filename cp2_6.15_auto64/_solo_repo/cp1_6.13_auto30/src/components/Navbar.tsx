import { useState } from 'react'

interface NavbarProps {
  navigate: (path: string) => void
  currentRoute: string
}

const links = [
  { label: '首页', path: '/', route: 'home' },
  { label: '检索', path: '/search', route: 'search' },
  { label: '仪表板', path: '/dashboard', route: 'dashboard' },
  { label: '图书录入', path: '/admin', route: 'admin' },
]

export default function Navbar({ navigate, currentRoute }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (route: string) => currentRoute === route || (route === 'home' && currentRoute === 'search')

  return (
    <>
      <nav className="navbar">
        <div
          onClick={() => navigate('/')}
          className="navbar-brand"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M4 5h6a3 3 0 013 3v12a2 2 0 00-2-2H4V5z" fill="#fbbf24" />
            <path d="M20 5h-6a3 3 0 00-3 3v12a2 2 0 012-2h7V5z" fill="#fef3c7" />
            <text x="9" y="15" fontSize="10" fontWeight="bold" fill="#78350f">B</text>
          </svg>
          BookBridge
        </div>

        <div className="desktop-nav">
          {links.map((link) => (
            <a
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`nav-link ${isActive(link.route) ? 'nav-link-active' : ''}`}
            >
              {link.label}
              {isActive(link.route) && <span className="nav-underline" />}
            </a>
          ))}
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="hamburger-btn"
          aria-label="菜单"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </nav>

      {mobileOpen && (
        <div className="mobile-menu">
          {links.map((link) => (
            <a
              key={link.path}
              onClick={() => {
                navigate(link.path)
                setMobileOpen(false)
              }}
              className="mobile-menu-link"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}

      <style>{`
        .navbar {
          height: 60px;
          background-color: #78350f;
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          position: relative;
        }
        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 20px;
          font-weight: bold;
        }
        .desktop-nav {
          display: flex;
          gap: 24px;
        }
        .nav-link {
          color: white;
          cursor: pointer;
          position: relative;
          padding-bottom: 4px;
          text-decoration: none;
        }
        .nav-link-active {
          font-weight: 600;
        }
        .nav-underline {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background-color: white;
          animation: fadeIn 0.3s ease-out;
        }
        .hamburger-btn {
          display: none;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 24px;
          padding: 4px 8px;
        }
        .mobile-menu {
          position: absolute;
          top: 60px;
          left: 0;
          right: 0;
          background-color: #78350f;
          display: flex;
          flex-direction: column;
          padding: 16px 24px;
          gap: 16px;
          z-index: 100;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .mobile-menu-link {
          color: white;
          cursor: pointer;
          font-size: 16px;
          padding: 4px 0;
          text-decoration: none;
        }
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .hamburger-btn {
            display: block !important;
          }
        }
      `}</style>
    </>
  )
}
