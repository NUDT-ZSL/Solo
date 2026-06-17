import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import MapPage from './pages/MapPage'
import UserPage from './pages/UserPage'

export default function App() {
  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-left">
          <span className="navbar-title">📚 知识图谱复习系统</span>
          <div className="navbar-nav">
            <NavLink to="/map" className="nav-link">
              知识图谱
            </NavLink>
            <NavLink to="/users" className="nav-link">
              用户管理
            </NavLink>
          </div>
        </div>
        <div className="navbar-right"></div>
      </nav>

      <div className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/map" replace />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/users" element={<UserPage />} />
        </Routes>
      </div>
    </div>
  )
}
