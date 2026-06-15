import React, { useEffect, useState } from 'react'
import Dashboard from './views/Dashboard'
import Schedule from './views/Schedule'

type Page = 'dashboard' | 'schedule'

interface Toast { id: number; message: string }
interface BottomNotify { id: number; message: string }

const navItems: { key: Page; label: string; icon: React.ReactNode }[] = [
  {
    key: 'dashboard',
    label: '数据仪表盘',
    icon: (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    )
  },
  {
    key: 'schedule',
    label: '排课与选课',
    icon: (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    )
  }
]

const LogoIcon = () => (
  <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
)

const BellIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#7f8c8d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

const SuccessIcon = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('dashboard')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [notifications, setNotifications] = useState<BottomNotify[]>([])
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const toastIdRef = React.useRef(0)
  const notifyIdRef = React.useRef(0)

  const showToast = (message: string) => {
    const id = ++toastIdRef.current
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2000)
  }

  const showBottomNotify = (message: string) => {
    const id = ++notifyIdRef.current
    setNotifications(prev => [...prev, { id, message }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
          background: #f5f7fa;
          color: #2c3e50;
          -webkit-font-smoothing: antialiased;
        }
        input:focus, textarea:focus { border-color: #3498db !important; }
        button:focus { outline: none; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #dfe4ea; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #bdc3c7; }

        @keyframes slideDown {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes slideUpIn {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideUpOut {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(100%); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes mobileNavIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }

        @media (max-width: 1024px) and (min-width: 768px) {
          .sidebar { display: none !important; }
          .top-bar-mobile { display: flex !important; }
          .desktop-header { display: none !important; }
          .course-card { width: 100% !important; }
        }
        @media (max-width: 767px) {
          .sidebar { display: none !important; }
          .top-bar-mobile { display: flex !important; }
          .desktop-header { display: none !important; }
          .course-card { width: 100% !important; }
          .metric-card { width: 100% !important; }
          .calendar-cell { width: 32px !important; height: 32px !important; font-size: 8px !important; }
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <div
          className="sidebar"
          style={{
            width: 240,
            background: '#ffffff',
            borderRight: '1px solid #ecf0f1',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 12px',
            position: 'sticky',
            top: 0,
            height: '100vh'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 12px 28px 12px' }}>
            <LogoIcon />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#2c3e50', lineHeight: 1.1 }}>培训机构</div>
              <div style={{ fontSize: 11, color: '#95a5a6' }}>管理系统 v1.0</div>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => setPage(item.key)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  border: 'none',
                  borderRadius: 8,
                  background: page === item.key ? 'rgba(52,152,219,0.08)' : 'transparent',
                  color: page === item.key ? '#3498db' : '#34495e',
                  fontSize: 14,
                  fontWeight: page === item.key ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (page !== item.key) e.currentTarget.style.background = '#f8f9fa'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = page === item.key ? 'rgba(52,152,219,0.08)' : 'transparent'
                }}
              >
                {page === item.key && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: 24,
                    background: '#3498db',
                    borderRadius: '0 2px 2px 0',
                    transition: 'all 0.2s ease'
                  }} />
                )}
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div style={{ marginTop: 'auto', padding: '20px 12px 8px 12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: 12,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
              color: '#ffffff'
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 600
              }}>管</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>系统管理员</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>admin@training.edu</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div
            className="top-bar-mobile"
            style={{
              display: 'none',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: '#ffffff',
              borderBottom: '1px solid #ecf0f1',
              position: 'sticky',
              top: 0,
              zIndex: 50
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setMobileNavOpen(true)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#2c3e50' }}
              >☰</button>
              <LogoIcon />
              <div style={{ fontSize: 15, fontWeight: 700 }}>培训管理系统</div>
            </div>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}><BellIcon /></button>
          </div>

          {mobileNavOpen && (
            <div
              onClick={() => setMobileNavOpen(false)}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 0, left: 0, bottom: 0,
                  width: 240,
                  background: '#ffffff',
                  padding: '20px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  animation: 'mobileNavIn 0.25s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 12px 28px 12px' }}>
                  <LogoIcon />
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#2c3e50' }}>培训机构管理</div>
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {navItems.map(item => (
                    <button
                      key={item.key}
                      onClick={() => { setPage(item.key); setMobileNavOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px',
                        border: 'none', borderRadius: 8,
                        background: page === item.key ? 'rgba(52,152,219,0.08)' : 'transparent',
                        color: page === item.key ? '#3498db' : '#34495e',
                        fontSize: 14, fontWeight: page === item.key ? 600 : 400,
                        cursor: 'pointer', textAlign: 'left'
                      }}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          )}

          <header className="desktop-header" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            background: '#ffffff',
            borderBottom: '1px solid #ecf0f1',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#2c3e50' }}>
                {navItems.find(n => n.key === page)?.label || ''}
              </div>
              <div style={{ fontSize: 12, color: '#95a5a6', marginTop: 2 }}>
                {page === 'dashboard' ? '实时查看运营数据与待办事项' : '管理课程排期、学员选课与教师调度'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 8, borderRadius: 8, position: 'relative'
              }}>
                <BellIcon />
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#e74c3c'
                }} />
              </button>
            </div>
          </header>

          <main style={{ flex: 1, overflow: 'auto' }}>
            {page === 'dashboard' && <Dashboard onNotify={showBottomNotify as any} />}
            {page === 'schedule' && <Schedule onToast={showToast} onBottomNotify={showBottomNotify} />}
          </main>
        </div>
      </div>

      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 300,
            background: '#e74c3c',
            color: '#ffffff',
            padding: '12px 18px',
            borderRadius: 8,
            fontSize: 13,
            boxShadow: '0 8px 24px rgba(231,76,60,0.35)',
            zIndex: 10000,
            animation: 'slideDown 0.25s ease',
            textAlign: 'center',
            lineHeight: 1.4
          }}
        >
          ⚠️ {t.message}
        </div>
      ))}

      {notifications.map(n => (
        <div
          key={n.id}
          style={{
            position: 'fixed',
            left: 0, right: 0, bottom: 0,
            height: 60,
            background: '#27ae60',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            gap: 14,
            fontSize: 14,
            zIndex: 10000,
            borderRadius: 0,
            animation: 'slideUpIn 0.3s ease, slideUpOut 0.3s ease 4.7s forwards',
            boxShadow: '0 -4px 20px rgba(39,174,96,0.3)'
          }}
        >
          <SuccessIcon />
          <span style={{ flex: 1, fontWeight: 500 }}>{n.message}</span>
          <button
            onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#ffffff',
              padding: '4px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12
            }}
          >知道了</button>
        </div>
      ))}
    </>
  )
}

export default App
