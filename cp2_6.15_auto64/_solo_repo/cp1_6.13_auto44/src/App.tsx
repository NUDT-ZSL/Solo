import React from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import GroomerSchedule from './components/GroomerSchedule'
import BookingPage from './components/BookingPage'
import MemberCenter from './components/MemberCenter'
import RoomMonitor from './components/RoomMonitor'

const menuItems = [
  { path: '/dashboard', label: '总店仪表板', icon: '📊' },
  { path: '/groomer', label: '美容师日程', icon: '✂️' },
  { path: '/book', label: '服务预约', icon: '📅' },
  { path: '/member', label: '会员中心', icon: '⭐' },
  { path: '/rooms', label: '寄养房管理', icon: '🏠' },
]

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            display: 'none',
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 1001,
            background: '#1e293b',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            width: 40,
            height: 40,
            fontSize: 20,
            cursor: 'pointer',
          }}
        >
          ☰
        </button>

        <aside
          className={`sidebar ${sidebarOpen ? 'open' : ''}`}
          style={{
            width: 220,
            minHeight: '100vh',
            background: '#1e293b',
            color: '#fff',
            padding: '24px 0',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1000,
            transition: 'transform 0.2s',
          }}
        >
          <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>🐾 宠物连锁店</h1>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>管理系统 v1.0</p>
          </div>
          <nav style={{ marginTop: 16 }}>
            {menuItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 20px',
                  color: isActive ? '#f97316' : '#cbd5e1',
                  textDecoration: 'none',
                  fontSize: 14,
                  background: isActive ? 'rgba(249,115,22,0.1)' : 'transparent',
                  borderRight: isActive ? '3px solid #f97316' : '3px solid transparent',
                  transition: 'all 0.2s',
                })}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div style={{ padding: '20px', marginTop: 32, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 8px' }}>分店列表</p>
            <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 2 }}>
              <div>🏪 汪星总店</div>
              <div>🏪 喵星分店</div>
              <div>🏪 萌宠分店</div>
            </div>
          </div>
        </aside>

        <main
          style={{
            flex: 1,
            padding: 24,
            minHeight: '100vh',
            overflow: 'auto',
            maxWidth: '100%',
          }}
        >
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/groomer" element={<GroomerSchedule />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/member" element={<MemberCenter />} />
            <Route path="/rooms" element={<RoomMonitor />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
            style={{
              display: 'none',
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 999,
            }}
          />
        )}
      </div>

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; }

        @media (max-width: 768px) {
          .hamburger-btn { display: block !important; }
          .sidebar-overlay { display: block !important; }
          .sidebar {
            position: fixed !important;
            left: 0; top: 0;
            transform: translateX(-100%);
            height: 100vh;
            z-index: 1000;
          }
          .sidebar.open {
            transform: translateX(0);
          }
          main {
            padding: 60px 12px 12px !important;
          }

          .groomer-schedule-container {
            flex-direction: column !important;
          }
          .groomer-schedule-container > div {
            width: 100% !important;
            max-width: 100% !important;
          }

          .booking-store-list > div {
            width: 100% !important;
            max-width: 100% !important;
          }

          .booking-service-list > div {
            width: 100% !important;
            max-width: 100% !important;
          }

          .member-gift-list > div {
            width: calc(50% - 8px) !important;
            max-width: 100% !important;
          }

          .dashboard-metrics > div {
            width: 100% !important;
          }

          .booking-form-container {
            max-width: 100% !important;
          }
        }
      `}</style>
    </BrowserRouter>
  )
}

export default App
