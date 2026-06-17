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
      <>
        <div className="sidebar-topbar">
          <div className="sidebar-brand-topbar">小店仪表盘</div>
          {navItems.map((item) => (
            <button
              key={item.page}
              className={`sidebar-nav-btn-topbar ${currentPage === item.page ? 'sidebar-nav-btn-active' : ''}`}
              onClick={() => setCurrentPage(item.page)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <SidebarStyles />
      </>
    )
  }

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-brand">🍜 小店仪表盘</div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.page}
              className={`sidebar-nav-btn ${currentPage === item.page ? 'sidebar-nav-btn-active' : ''}`}
              onClick={() => setCurrentPage(item.page)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">v1.0.0 · 模拟数据</div>
      </aside>
      <SidebarStyles />
    </>
  )
}

function SidebarStyles() {
  return (
    <style>{`
      .sidebar {
        width: 240px;
        background: #1E293B;
        color: #CBD5E1;
        height: 100vh;
        padding: 24px 16px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        position: fixed;
        left: 0;
        top: 0;
        z-index: 100;
        overflow-y: auto;
      }
      .sidebar-brand {
        font-size: 20px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 32px;
        padding: 0 8px;
      }
      .sidebar-nav {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .sidebar-nav-btn {
        background: transparent;
        color: #CBD5E1;
        border: none;
        border-radius: 8px;
        padding: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        font-size: 15px;
        width: 100%;
        text-align: left;
        transition: transform 0.2s ease, background 0.2s ease;
        font-family: inherit;
      }
      .sidebar-nav-btn:hover {
        transform: scale(1.02);
      }
      .sidebar-nav-btn-active {
        background: #3B82F6 !important;
        color: #fff !important;
      }
      .sidebar-footer {
        margin-top: auto;
        font-size: 12px;
        color: #64748B;
        padding: 0 8px;
      }
      .sidebar-topbar {
        height: 64px;
        background: #1E293B;
        color: #CBD5E1;
        display: flex;
        align-items: center;
        padding: 0 16px;
        gap: 8px;
        width: 100%;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 100;
        box-sizing: border-box;
      }
      .sidebar-brand-topbar {
        font-size: 18px;
        font-weight: 700;
        color: #fff;
        margin-right: 24px;
      }
      .sidebar-nav-btn-topbar {
        background: transparent;
        color: #CBD5E1;
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 14px;
        transition: transform 0.2s ease, background 0.2s ease;
        font-family: inherit;
      }
      .sidebar-nav-btn-topbar:hover {
        transform: scale(1.02);
      }
    `}</style>
  )
}
