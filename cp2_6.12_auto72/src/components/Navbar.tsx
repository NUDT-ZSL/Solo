import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const Navbar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { path: '/', label: '作品集' },
    { path: '/dashboard', label: '仪表盘' },
    { path: '/upload', label: '上传作品' }
  ]

  const handleNavClick = (path: string) => {
    navigate(path)
    setMenuOpen(false)
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          插画作品集
        </div>
        <ul className="navbar-links">
          {navItems.map((item) => (
            <li key={item.path}>
              <button
                className={`navbar-link ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => handleNavClick(item.path)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="菜单"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>
      <div className="navbar-gradient"></div>

      <div
        className={`side-menu-overlay ${menuOpen ? 'open' : ''}`}
        onClick={() => setMenuOpen(false)}
      ></div>
      <div className={`side-menu ${menuOpen ? 'open' : ''}`}>
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`side-menu-link ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => handleNavClick(item.path)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  )
}

export default Navbar
