import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import CalendarView from './components/CalendarView';
import DevicePanel from './components/DevicePanel';
import Dashboard from './components/Dashboard';

const NAV_ITEMS = [
  { to: '/', label: '日历', icon: '📅' },
  { to: '/devices', label: '设备', icon: '🎸' },
  { to: '/dashboard', label: '仪表盘', icon: '🏠' },
];

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <aside style={{
          width: 240, background: '#2C2C2C', flexShrink: 0,
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
          transform: undefined, transition: 'transform 0.3s',
        }} className="sidebar">
          <div style={{ padding: '24px 20px', borderBottom: '1px solid #383838' }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, background: 'linear-gradient(135deg, #7C4DFF, #B388FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              🎵 巡演管家
            </h1>
            <p style={{ fontSize: 11, color: '#666', marginTop: 4 }}>乐队排期与设备管理</p>
          </div>
          <nav style={{ padding: '12px 0' }}>
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 20px', margin: '2px 8px', borderRadius: 8,
                  color: isActive ? '#FFF' : '#AAA', fontSize: 14, fontWeight: isActive ? 600 : 400,
                  textDecoration: 'none',
                  background: isActive ? '#383838' : 'transparent',
                  borderLeft: isActive ? '4px solid #7C4DFF' : '4px solid transparent',
                  transition: 'background 0.2s, color 0.2s, border-left 0.2s',
                })}
                onMouseEnter={e => {
                  if (!(e.currentTarget as HTMLElement).classList.contains('active')) {
                    (e.currentTarget as HTMLElement).style.background = '#383838';
                  }
                }}
                onMouseLeave={e => {
                  if (!(e.currentTarget as HTMLElement).classList.contains('active')) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            display: 'none', position: 'fixed', top: 12, left: 12, zIndex: 200,
            width: 40, height: 40, borderRadius: 8, border: 'none',
            background: '#2C2C2C', color: '#FFF', fontSize: 20, cursor: 'pointer',
          }}
        >
          ☰
        </button>

        <main style={{ flex: 1, marginLeft: 240, padding: 32, minHeight: '100vh' }} className="main-content">
          <Routes>
            <Route path="/" element={<CalendarView />} />
            <Route path="/devices" element={<DevicePanel />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        input:focus, select:focus {
          border-color: #7C4DFF !important;
          transform: scale(1.02);
        }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(${sidebarOpen ? '0' : '-100%'}) !important;
            width: 100% !important;
          }
          .main-content {
            margin-left: 0 !important;
            padding: 60px 16px 16px !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
        }
      `}</style>
    </BrowserRouter>
  );
};

export default App;
