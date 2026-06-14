import React from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import MixerPage from './pages/MixerPage'
import PresetsPage from './pages/PresetsPage'
import PresetDetailPage from './pages/PresetDetailPage'

const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({
  to,
  children,
}) => {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      style={{
        padding: '8px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        transition: 'all 0.2s ease',
        background: isActive ? '#6c5ce7' : 'transparent',
        color: isActive ? '#fff' : '#b8a9e8',
      }}
    >
      {children}
    </Link>
  )
}

const App: React.FC = () => {
  return (
    <AppProvider>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#1a1a2e',
        }}
      >
        <header
          style={{
            padding: '16px 32px',
            background: '#16162a',
            borderBottom: '1px solid #2d2a3e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>🎵</span>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#e0d8f0',
                fontFamily: 'Georgia, serif',
              }}
            >
              CitySoundBoard
            </h1>
          </div>
          <nav style={{ display: 'flex', gap: '8px' }}>
            <NavLink to="/">🎛️ 混合器</NavLink>
            <NavLink to="/presets">📁 我的预设</NavLink>
          </nav>
        </header>

        <main style={{ flex: 1, overflow: 'hidden' }}>
          <Routes>
            <Route path="/" element={<MixerPage />} />
            <Route path="/presets" element={<PresetsPage />} />
            <Route path="/presets/:id" element={<PresetDetailPage />} />
            <Route
              path="/share/:token"
              element={<PresetDetailPage isShared />}
            />
          </Routes>
        </main>

        <footer
          style={{
            padding: '12px 32px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#7c7599',
            borderTop: '1px solid #2d2a3e',
            background: '#16162a',
          }}
        >
          CitySoundBoard © 2026 · 创造属于你的沉浸式音景
        </footer>
      </div>
    </AppProvider>
  )
}

export default App
