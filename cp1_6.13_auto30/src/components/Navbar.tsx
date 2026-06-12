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
    <nav
      style={{
        height: '60px',
        backgroundColor: '#78350f',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <div
        onClick={() => navigate('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontSize: '20px',
          fontWeight: 'bold',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M4 5h6a3 3 0 013 3v12a2 2 0 00-2-2H4V5z" fill="#fbbf24" />
          <path d="M20 5h-6a3 3 0 00-3 3v12a2 2 0 012-2h7V5z" fill="#fef3c7" />
          <text x="9" y="15" fontSize="10" fontWeight="bold" fill="#78350f">B</text>
        </svg>
        BookBridge
      </div>

      <div style={{ display: 'flex', gap: '24px' }} className="desktop-nav">
        {links.map((link) => (
          <a
            key={link.path}
            onClick={() => navigate(link.path)}
            style={{
              color: 'white',
              cursor: 'pointer',
              position: 'relative',
              paddingBottom: '4px',
              fontWeight: isActive(link.route) ? '600' : '400',
            }}
          >
            {link.label}
            {isActive(link.route) && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: 'white',
                  animation: 'fadeIn 0.3s ease-out',
                }}
              />
            )}
          </a>
        ))}
      </div>

      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          display: 'none',
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '24px',
        }}
        className="hamburger"
      >
        ☰
      </button>

      {mobileOpen && (
        <div
          style={{
            display: 'none',
            position: 'absolute',
            top: '60px',
            left: 0,
            right: 0,
            backgroundColor: '#78350f',
            flexDirection: 'column',
            padding: '16px',
            gap: '16px',
          }}
          className="mobile-menu"
        >
          {links.map((link) => (
            <a
              key={link.path}
              onClick={() => {
                navigate(link.path)
                setMobileOpen(false)
              }}
              style={{ color: 'white', cursor: 'pointer' }}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: block !important; }
          .mobile-menu { display: flex !important; }
        }
      `}</style>
    </nav>
  )
}
