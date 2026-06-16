import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import AnimalList from './pages/AnimalList'
import AnimalDetail from './pages/AnimalDetail'
import AdminDashboard from './pages/AdminDashboard'
import { useAuth } from './context/AuthContext'
import './styles/App.css'

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { isLoggedIn, logout } = useAuth()

  const handleNavClick = (path: string) => {
    setMenuOpen(false)
    navigate(path)
  }

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/')
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-logo">
            <Link to="/" onClick={() => setMenuOpen(false)}>
              🐾 流浪动物救助站
            </Link>
          </div>

          <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              onClick={() => handleNavClick('/')}
            >
              动物列表
            </Link>
            {isLoggedIn ? (
              <>
                <Link
                  to="/admin"
                  className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
                  onClick={() => handleNavClick('/admin')}
                >
                  管理后台
                </Link>
                <button className="nav-link logout-btn" onClick={handleLogout}>
                  退出登录
                </button>
              </>
            ) : (
              <Link
                to="/admin"
                className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
                onClick={() => handleNavClick('/admin')}
              >
                管理员登录
              </Link>
            )}
          </div>

          <button
            className={`hamburger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="菜单"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="sidebar-overlay" onClick={() => setMenuOpen(false)}>
          <div className="sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-header">
              <span>🐾 菜单</span>
              <button className="close-btn" onClick={() => setMenuOpen(false)}>
                ✕
              </button>
            </div>
            <div className="sidebar-links">
              <Link to="/" className="sidebar-link" onClick={() => setMenuOpen(false)}>
                动物列表
              </Link>
              {isLoggedIn ? (
                <>
                  <Link
                    to="/admin"
                    className="sidebar-link"
                    onClick={() => setMenuOpen(false)}
                  >
                    管理后台
                  </Link>
                  <button className="sidebar-link logout-btn" onClick={handleLogout}>
                    退出登录
                  </button>
                </>
              ) : (
                <Link
                  to="/admin"
                  className="sidebar-link"
                  onClick={() => setMenuOpen(false)}
                >
                  管理员登录
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="main-content">
        <Routes>
          <Route path="/" element={<AnimalList />} />
          <Route path="/animal/:id" element={<AnimalDetail />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>

      <footer className="footer">
        <p>© 2024 流浪动物救助站 - 让每一个生命都被温柔以待</p>
      </footer>
    </div>
  )
}

export default App
