import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Home from './pages/Home'
import EventDetail from './pages/EventDetail'
import Admin from './pages/Admin'
import './App.css'

function App() {
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState(location)
  const [transitionStage, setTransitionStage] = useState('fadeIn')

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('fadeOut')
    }
  }, [location, displayLocation])

  const handleAnimationEnd = () => {
    if (transitionStage === 'fadeOut') {
      setDisplayLocation(location)
      setTransitionStage('fadeIn')
    }
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="nav-brand">
            <span className="nav-brand-icon">🎓</span>
            <span className="nav-brand-text">CampusEventHub</span>
          </Link>
          <div className="nav-links">
            <Link to="/" className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}>
              活动大厅
            </Link>
            <Link
              to="/admin"
              className={location.pathname.startsWith('/admin') ? 'nav-link active' : 'nav-link'}
            >
              管理后台
            </Link>
          </div>
        </div>
      </nav>

      <main
        className={`app-content ${transitionStage}`}
        onAnimationEnd={handleAnimationEnd}
      >
        <div className="page-container">
          <Routes location={displayLocation}>
            <Route path="/" element={<Home />} />
            <Route path="/event/:id" element={<EventDetail />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </div>
      </main>

      <footer className="footer">
        <p>© 2026 CampusEventHub · 校园活动发布与报名管理系统</p>
      </footer>
    </div>
  )
}

export default App
