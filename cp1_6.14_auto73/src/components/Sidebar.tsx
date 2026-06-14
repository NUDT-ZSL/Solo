import React from 'react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onboardCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, onboardCount }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">RecruitFlow</div>
      <nav className="sidebar-nav">
        <button
          className={`sidebar-item ${currentView === 'jobs' ? 'active' : ''}`}
          onClick={() => onNavigate('jobs')}
        >
          <span className="sidebar-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          </span>
          职位管理
        </button>
        <button
          className={`sidebar-item ${currentView === 'candidates' ? 'active' : ''}`}
          onClick={() => onNavigate('candidates')}
        >
          <span className="sidebar-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </span>
          候选人看板
        </button>
      </nav>
      {onboardCount > 0 && (
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          color: '#ff5252',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#ff5252',
            display: 'inline-block',
            flexShrink: 0,
          }}/>
          {onboardCount}人即将入职
        </div>
      )}
    </div>
  );
};

export default Sidebar;
