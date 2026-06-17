import { Routes, Route, NavLink, Link } from 'react-router-dom'
import HomePage from './pages/HomePage'
import DetailPage from './pages/DetailPage'
import Dashboard from './pages/Dashboard'
import ArtistPage from './pages/ArtistPage'
import { Palette } from 'lucide-react'

export default function App() {
  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-brand">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Palette size={18} />
              艺术市集热度追踪
            </span>
          </Link>
          <div className="navbar-links">
            <NavLink to="/" end className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}>
              首页
            </NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}>
              管理员看板
            </NavLink>
            <NavLink to="/artist" className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}>
              艺术家专区
            </NavLink>
          </div>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/artwork/:id" element={<DetailPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/artist" element={<ArtistPage />} />
      </Routes>
    </>
  )
}
