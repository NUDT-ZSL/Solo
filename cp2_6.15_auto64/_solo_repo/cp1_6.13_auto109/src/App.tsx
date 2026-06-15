import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import ActivityList from './pages/ActivityList';
import ActivityDetail from './pages/ActivityDetail';
import TimelineTab from './pages/TimelineTab';
import GuestsTab from './pages/GuestsTab';
import ReminderTab from './pages/ReminderTab';

const ScrollRestoration = () => {
  const location = useLocation();
  const scrollPositions = useRef<Record<string, number>>({});

  useEffect(() => {
    const key = location.pathname.split('/').slice(0, 4).join('/');
    const saved = scrollPositions.current[key];
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTop = saved || 0;
    }
  }, [location.pathname]);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;
    const onScroll = () => {
      const key = location.pathname.split('/').slice(0, 4).join('/');
      scrollPositions.current[key] = mainEl.scrollTop;
    };
    mainEl.addEventListener('scroll', onScroll);
    return () => mainEl.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  return null;
};

const App = () => {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('activities');

  const menuItems = [
    { id: 'dashboard', label: '控制面板', icon: '📊' },
    { id: 'activities', label: '活动管理', icon: '📅' },
    { id: 'guests', label: '嘉宾总览', icon: '👥' },
    { id: 'reminders', label: '提醒中心', icon: '🔔' },
    { id: 'templates', label: '模板库', icon: '📋' },
    { id: 'settings', label: '系统设置', icon: '⚙️' },
  ];

  return (
    <div style={styles.appContainer}>
      <aside style={styles.sidebar}>
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>🎊</div>
          <div>
            <div style={styles.logoTitle}>FestivePlanner</div>
            <div style={styles.logoSubtitle}>活动策划助手</div>
          </div>
        </div>

        <nav style={styles.navMenu}>
          {menuItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setActiveMenu(item.id);
                if (item.id === 'activities') navigate('/');
              }}
              style={{
                ...styles.menuItem,
                ...(activeMenu === item.id ? styles.menuItemActive : {}),
              }}
            >
              <span style={styles.menuIcon}>{item.icon}</span>
              <span style={styles.menuLabel}>{item.label}</span>
            </div>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userAvatar}>FP</div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>策划师</div>
            <div style={styles.userRole}>管理员</div>
          </div>
        </div>
      </aside>

      <main style={styles.mainContent}>
        <ScrollRestoration />
        <Routes>
          <Route path="/" element={<ActivityList />} />
          <Route path="/activity/:id" element={<ActivityDetail />}>
            <Route index element={<TimelineTab />} />
            <Route path="timeline" element={<TimelineTab />} />
            <Route path="guests" element={<GuestsTab />} />
            <Route path="reminder" element={<ReminderTab />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#0f172a',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    margin: 0,
    padding: 0,
    overflow: 'hidden',
  },
  sidebar: {
    width: '280px',
    minWidth: '280px',
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0',
    borderRight: '1px solid #334155',
    position: 'sticky',
    top: 0,
    height: '100vh',
    boxSizing: 'border-box',
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 24px 32px',
    borderBottom: '1px solid #334155',
  },
  logoIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
  },
  logoTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#f8fafc',
    letterSpacing: '-0.02em',
  },
  logoSubtitle: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  navMenu: {
    flex: 1,
    padding: '20px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflowY: 'auto',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '10px',
    cursor: 'pointer',
    color: '#94a3b8',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  menuItemActive: {
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
  },
  menuIcon: {
    fontSize: '18px',
    width: '24px',
    textAlign: 'center',
  },
  menuLabel: {
    flex: 1,
  },
  sidebarFooter: {
    padding: '16px 24px',
    borderTop: '1px solid #334155',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '14px',
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#f8fafc',
  },
  userRole: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  mainContent: {
    flex: 1,
    overflowY: 'auto',
    height: '100vh',
    backgroundColor: '#0f172a',
  },
};

export default App;
