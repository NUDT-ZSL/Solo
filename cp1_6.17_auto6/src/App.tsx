import React, { useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import EventsCalendar from './pages/EventsCalendar'
import EventDetail from './pages/EventDetail'
import AdminPage from './pages/Admin'
import { useApp } from './context/AppContext'

function App() {
  const location = useLocation()
  const { user, login, logout } = useApp()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginName, setLoginName] = useState('')
  const [isAdminLogin, setIsAdminLogin] = useState(false)

  const handleLogin = () => {
    if (loginName.trim()) {
      login(loginName.trim(), isAdminLogin)
      setShowLoginModal(false)
      setLoginName('')
      setIsAdminLogin(false)
    }
  }

  const getProgressColor = (current: number, max: number) => {
    const percentage = (current / max) * 100
    if (percentage < 50) return '#2ECC71'
    if (percentage <= 80) return '#F39C12'
    return '#E74C3C'
  }

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="nav-content">
          <Link to="/" className="nav-brand">
            <span className="nav-icon">📅</span>
            <span>BookEvents</span>
          </Link>
          <div className="nav-links">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
              活动日历
            </Link>
            {user?.isAdmin && (
              <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
                管理中心
              </Link>
            )}
          </div>
          <div className="nav-user">
            {user ? (
              <div className="user-info">
                <span className="user-name">
                  {user.isAdmin ? '👤 管理员：' : '👤 读者：'}{user.name}
                </span>
                <button className="logout-btn" onClick={logout}>
                  退出
                </button>
              </div>
            ) : (
              <button className="login-btn" onClick={() => setShowLoginModal(true)}>
                登录
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="main-content">
        <div className="page-transition">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<EventsCalendar getProgressColor={getProgressColor} />} />
            <Route path="/events/:id" element={<EventDetail getProgressColor={getProgressColor} />} />
            <Route path="/admin" element={<AdminPage getProgressColor={getProgressColor} />} />
          </Routes>
        </div>
      </main>

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">登录</h2>
            <div className="form-group">
              <label>姓名</label>
              <input
                type="text"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder="请输入您的姓名"
                className="form-input"
              />
            </div>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isAdminLogin}
                  onChange={(e) => setIsAdminLogin(e.target.checked)}
                />
                <span>管理员登录</span>
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowLoginModal(false)}>
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleLogin}
                disabled={!loginName.trim()}
              >
                登录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
