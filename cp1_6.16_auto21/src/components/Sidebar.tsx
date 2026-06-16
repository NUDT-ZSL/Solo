import React, { useState } from 'react';

interface SidebarProps {
  onNewBatch: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNewBatch }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { icon: '📊', label: '数据看板', active: true },
    { icon: '☕', label: '生豆库存', active: false },
    { icon: '🔥', label: '烘焙记录', active: false },
    { icon: '📈', label: '统计分析', active: false },
    { icon: '⚙️', label: '设置', active: false },
  ];

  return (
    <>
      <button
        className="hamburger-btn"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? '✕' : '☰'}
      </button>

      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-icon">☕</div>
          <h1 className="logo-text">咖啡烘焙工坊</h1>
        </div>

        <nav className="nav-menu">
          {navItems.map((item, index) => (
            <div
              key={index}
              className={`nav-item ${item.active ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-actions">
          <button className="new-batch-sidebar-btn" onClick={onNewBatch}>
            <span className="plus-icon">+</span>
            <span>新建烘焙批次</span>
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="version-info">v1.0.0</div>
          <div className="copyright">© 2026 Coffee Roast Pro</div>
        </div>
      </aside>

      {isMobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
