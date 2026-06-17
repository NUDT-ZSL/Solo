import { useStore, Page } from '../store'

const navItems: { page: Page; label: string; icon: JSX.Element }[] = [
  {
    page: 'dashboard',
    label: '仪表盘',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    page: 'menu',
    label: '菜单',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    page: 'orders',
    label: '订单流',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    page: 'export',
    label: '导出',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
]

export function Sidebar() {
  const currentPage = useStore((s) => s.currentPage)
  const setCurrentPage = useStore((s) => s.setCurrentPage)
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed)

  if (sidebarCollapsed) {
    return (
      <div
        style={{
          height: 64,
          background: '#1E293B',
          color: '#CBD5E1',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 8,
          width: '100%',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginRight: 24 }}>小店仪表盘</div>
        {navItems.map((item) => (
          <button
            key={item.page}
            onClick={() => setCurrentPage(item.page)}
            style={{
              background: currentPage === item.page ? '#3B82F6' : 'transparent',
              color: currentPage === item.page ? '#fff' : '#CBD5E1',
              border: 'none',
              borderRadius: 8,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'transform 0.2s, background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div
      style={{
        width: 240,
        background: '#1E293B',
        color: '#CBD5E1',
        height: '100vh',
        padding: '24px 16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 32, padding: '0 8px' }}>
        🍜 小店仪表盘
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map((item) => (
          <button
            key={item.page}
            onClick={() => setCurrentPage(item.page)}
            style={{
              background: currentPage === item.page ? '#3B82F6' : 'transparent',
              color: currentPage === item.page ? '#fff' : '#CBD5E1',
              border: 'none',
              borderRadius: 8,
              padding: '12px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              fontSize: 15,
              width: '100%',
              textAlign: 'left',
              transition: 'transform 0.2s, background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div style={{ marginTop: 'auto', fontSize: 12, color: '#64748B', padding: '0 8px' }}>
        v1.0.0 · 模拟数据
      </div>
    </div>
  )
}
