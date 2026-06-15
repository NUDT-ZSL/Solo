import { useState, useEffect } from 'react';
import { useParams, useNavigate, Outlet, useLocation } from 'react-router-dom';
import axios from 'axios';
import { createContext, useContext } from 'react';

interface Activity {
  _id: string;
  name: string;
  date: string;
  status: string;
  location: string;
  description: string;
}

interface ActivityContextType {
  activity: Activity | null;
  loading: boolean;
  refreshActivity: () => void;
}

const ActivityContext = createContext<ActivityContextType>({
  activity: null,
  loading: true,
  refreshActivity: () => {},
});

export const useActivityContext = () => useContext(ActivityContext);

const ActivityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActivity = async () => {
    if (!id) return;
    try {
      const res = await axios.get<Activity>(`/api/activities/${id}`);
      setActivity(res.data);
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [id]);

  useEffect(() => {
    const segments = location.pathname.split('/');
    if (segments.length === 3 && segments[1] === 'activity') {
      navigate(`/activity/${id}/timeline`, { replace: true });
    }
  }, [location.pathname, id, navigate]);

  const getTabFromPath = () => {
    if (location.pathname.endsWith('/guests')) return 'guests';
    if (location.pathname.endsWith('/reminder')) return 'reminder';
    return 'timeline';
  };

  const activeTab = getTabFromPath();

  const tabs = [
    { key: 'timeline', label: '时间线', icon: '⏱️', path: `/activity/${id}/timeline` },
    { key: 'guests', label: '嘉宾', icon: '👥', path: `/activity/${id}/guests` },
    { key: 'reminder', label: '提醒', icon: '🔔', path: `/activity/${id}/reminder` },
  ];

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'preparing':
        return { label: '准备中', bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' };
      case 'in_progress':
        return { label: '进行中', bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' };
      case 'finished':
        return { label: '已结束', bg: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' };
      default:
        return { label: '未知', bg: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' };
    }
  };

  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading || !activity) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <div style={{ color: '#94a3b8', marginTop: 16 }}>加载中...</div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(activity.status);
  const daysUntil = getDaysUntil(activity.date);

  const contextValue: ActivityContextType = {
    activity,
    loading,
    refreshActivity: fetchActivity,
  };

  return (
    <ActivityContext.Provider value={contextValue}>
      <div style={styles.pageWrapper}>
        <div style={styles.breadcrumb}>
          <span style={styles.breadcrumbLink} onClick={() => navigate('/')}>活动列表</span>
          <span style={styles.breadcrumbSep}>/</span>
          <span style={styles.breadcrumbCurrent}>{activity.name}</span>
        </div>

        <div style={styles.detailHeader}>
          <div style={styles.headerLeft}>
            <h1 style={styles.detailTitle}>{activity.name}</h1>
            <div style={styles.headerMeta}>
              <span style={styles.metaTag}>
                <span>📅</span> {activity.date}
              </span>
              <span style={styles.metaTag}>
                <span>📍</span> {activity.location || '待确认'}
              </span>
              <span
                style={{
                  ...styles.statusBadge,
                  backgroundColor: statusInfo.bg,
                  color: statusInfo.color,
                  border: `1px solid ${statusInfo.border}`,
                }}
              >
                {statusInfo.label}
              </span>
            </div>
            {activity.description && (
              <p style={styles.description}>{activity.description}</p>
            )}
          </div>
          <div style={styles.headerRight}>
            <div style={styles.countdownCard}>
              <div style={styles.countdownNumber}>
                {daysUntil < 0 ? '已结束' : daysUntil === 0 ? '今天' : daysUntil}
              </div>
              <div style={styles.countdownLabel}>
                {daysUntil < 0 ? '' : daysUntil === 0 ? '活动就在今天' : '天后开始'}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.tabBar}>
          {tabs.map((tab) => (
            <div
              key={tab.key}
              onClick={() => navigate(tab.path)}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab.key ? styles.tabButtonActive : {}),
                cursor: 'pointer',
              }}
            >
              <span style={{ marginRight: 6 }}>{tab.icon}</span>
              {tab.label}
            </div>
          ))}
        </div>

        <div style={styles.tabContent}>
          <Outlet />
        </div>
      </div>
    </ActivityContext.Provider>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    padding: '28px 36px',
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    boxSizing: 'border-box',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #334155',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    fontSize: 14,
  },
  breadcrumbLink: {
    color: '#6366f1',
    cursor: 'pointer',
  },
  breadcrumbSep: {
    color: '#475569',
  },
  breadcrumbCurrent: {
    color: '#94a3b8',
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 16,
    padding: 28,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    marginLeft: 32,
  },
  detailTitle: {
    fontSize: 26,
    fontWeight: 700,
    color: '#f1f5f9',
    margin: 0,
    marginBottom: 12,
    letterSpacing: '-0.02em',
  },
  headerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  metaTag: {
    fontSize: 14,
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
    lineHeight: 1.5,
    margin: 0,
  },
  countdownCard: {
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    borderRadius: 12,
    padding: '20px 28px',
    textAlign: 'center',
    minWidth: 120,
  },
  countdownNumber: {
    fontSize: 32,
    fontWeight: 700,
    color: '#ffffff',
  },
  countdownLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  tabBar: {
    display: 'flex',
    gap: 4,
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 12,
    padding: 6,
    marginBottom: 24,
  },
  tabButton: {
    padding: '10px 24px',
    borderRadius: 8,
    backgroundColor: 'transparent',
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    userSelect: 'none',
  },
  tabButtonActive: {
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#ffffff',
    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
  },
  tabContent: {
    minHeight: 400,
  },
};

export default ActivityDetail;
