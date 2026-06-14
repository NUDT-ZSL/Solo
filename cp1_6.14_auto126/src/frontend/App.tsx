import React, { useState, useEffect } from 'react';
import WorksList from './components/WorksList';
import WorkDetail from './components/WorkDetail';
import AnalyticsPanel from './components/AnalyticsPanel';
import ReviewCenter from './components/ReviewCenter';
import { Work } from './utils/http';

type NavItem = 'works' | 'analytics' | 'review';

const App: React.FC = () => {
  const [activeNav, setActiveNav] = useState<NavItem>('works');
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [analyticsWork, setAnalyticsWork] = useState<Work | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayContent, setDisplayContent] = useState(true);

  const handleNavChange = (nav: NavItem) => {
    if (nav === activeNav) return;
    setIsTransitioning(true);
    setDisplayContent(false);
    setSelectedWork(null);
    setShowDetail(false);
    setTimeout(() => {
      setActiveNav(nav);
      setDisplayContent(true);
      setIsTransitioning(false);
    }, 200);
  };

  const handleSelectWork = (work: Work) => {
    setIsTransitioning(true);
    setDisplayContent(false);
    setTimeout(() => {
      setSelectedWork(work);
      setShowDetail(true);
      setDisplayContent(true);
      setIsTransitioning(false);
    }, 200);
  };

  const handleBackToList = () => {
    setIsTransitioning(true);
    setDisplayContent(false);
    setTimeout(() => {
      setShowDetail(false);
      setSelectedWork(null);
      setDisplayContent(true);
      setIsTransitioning(false);
    }, 200);
  };

  const handleShowAnalytics = (work: Work) => {
    setAnalyticsWork(work);
    handleNavChange('analytics');
  };

  const navItems: { id: NavItem; label: string; icon: JSX.Element }[] = [
    {
      id: 'works',
      label: '作品管理',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <polygon points="10,8 16,12 10,16" />
        </svg>
      ),
    },
    {
      id: 'analytics',
      label: '数据分析',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      id: 'review',
      label: '审核中心',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22,4 12,14.01 9,11.01" />
        </svg>
      ),
    },
  ];

  const renderContent = () => {
    if (!displayContent) return null;

    if (activeNav === 'works') {
      if (showDetail && selectedWork) {
        return (
          <div className="fade-in">
            <WorkDetail work={selectedWork} onBack={handleBackToList} />
          </div>
        );
      }
      return (
        <div className="fade-in">
          <WorksList onSelectWork={handleSelectWork} onShowAnalytics={handleShowAnalytics} />
        </div>
      );
    }

    if (activeNav === 'analytics') {
      return (
        <div className="fade-in">
          <AnalyticsPanel selectedWork={analyticsWork} onSelectWork={setAnalyticsWork} />
        </div>
      );
    }

    if (activeNav === 'review') {
      return (
        <div className="fade-in">
          <ReviewCenter />
        </div>
      );
    }

    return null;
  };

  return (
    <div style={styles.app} data-app>
      <nav style={styles.sidebar} data-sidebar>
        <div style={styles.logoArea} data-logo-area>
          <div style={styles.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#ff2d55">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <div style={styles.logoText}>
            <div style={styles.logoTitle}>MusicStudio</div>
            <div style={styles.logoSubtitle}>创作者平台</div>
          </div>
        </div>

        <div style={styles.navDivider} />

        <div style={styles.navList}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavChange(item.id)}
              style={{
                ...styles.navItem,
                backgroundColor: activeNav === item.id ? '#2c2c2e' : 'transparent',
                borderLeft: activeNav === item.id ? '4px solid #ff2d55' : '4px solid transparent',
                paddingLeft: activeNav === item.id ? 20 : 24,
              }}
              data-nav-item={item.id}
            >
              <span style={{
                ...styles.navIcon,
                color: activeNav === item.id ? '#ff2d55' : '#8e8e93',
              }}>
                {item.icon}
              </span>
              <span style={{
                ...styles.navLabel,
                color: activeNav === item.id ? '#ffffff' : '#8e8e93',
                fontWeight: activeNav === item.id ? 600 : 500,
              }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        <div style={styles.sidebarFooter}>
          <div style={styles.userCard}>
            <div style={styles.userAvatar}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>独立音乐人</div>
              <div style={styles.userRole}>创作者 Pro</div>
            </div>
          </div>
        </div>
      </nav>

      <main style={styles.mainContent}>
        <div style={{
          ...styles.contentWrapper,
          opacity: isTransitioning ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    width: '100%',
    height: '100vh',
    minHeight: '100vh',
    backgroundColor: '#0a0a0b',
    overflow: 'hidden',
  },
  sidebar: {
    width: 240,
    minWidth: 240,
    height: '100%',
    backgroundColor: '#151516',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #1c1c1e',
    overflowY: 'auto',
  },
  logoArea: {
    padding: '24px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,45,85,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column',
  },
  logoTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  logoSubtitle: {
    fontSize: 11,
    color: '#636366',
    fontWeight: 500,
    marginTop: 2,
  },
  navDivider: {
    height: 1,
    backgroundColor: '#1c1c1e',
    margin: '0 20px',
  },
  navList: {
    flex: 1,
    padding: '12px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  navItem: {
    width: '100%',
    height: 48,
    minHeight: 48,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
  },
  navIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.15s ease',
  },
  navLabel: {
    fontSize: 15,
    transition: 'all 0.15s ease',
  },
  sidebarFooter: {
    padding: '16px 16px',
    borderTop: '1px solid #1c1c1e',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1c1c1e',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: '#ff2d55',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#ffffff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userRole: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },
  mainContent: {
    flex: 1,
    height: '100%',
    overflowY: 'auto',
    minWidth: 0,
    backgroundColor: '#0a0a0b',
  },
  contentWrapper: {
    padding: '32px 40px',
    maxWidth: 1600,
    margin: '0 auto',
    width: '100%',
    minHeight: '100%',
  },
};

const hoverStyles = `
  [data-nav-item]:hover {
    background-color: #2c2c2e !important;
  }
  [data-nav-item]:hover > span:last-child {
    color: #ffffff !important;
  }
  @media (max-width: 1024px) {
    [data-sidebar] { width: 200px !important; min-width: 200px !important; }
  }
  @media (max-width: 768px) {
    [data-app] { flex-direction: column !important; }
    [data-sidebar] { 
      width: 100% !important; 
      min-width: 100% !important; 
      height: auto !important;
      flex-direction: row !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
    }
    [data-logo-area] { padding: 12px 16px !important; }
    [data-nav-list] { flex-direction: row !important; padding: 0 !important; }
    [data-nav-item] { height: 56px !important; padding: 0 16px !important; border-left: none !important; border-bottom: 4px solid transparent !important; }
    [data-sidebar-footer] { display: none !important; }
    [data-nav-divider] { display: none !important; }
  }
`;

const appStyleTag = document.createElement('style');
appStyleTag.textContent = hoverStyles;
document.head.appendChild(appStyleTag);

export default App;
