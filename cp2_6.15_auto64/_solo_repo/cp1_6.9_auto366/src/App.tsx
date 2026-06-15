import React, { useState, useEffect, useCallback, createContext, useContext, useMemo, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { capsuleApi } from './api/capsuleApi';
import type { Capsule, Notification } from './types';

const TimelinePage = lazy(() => import('./pages/TimelinePage'));
const CreatePage = lazy(() => import('./pages/CreatePage'));
const DetailPage = lazy(() => import('./pages/DetailPage'));

interface AppContextType {
  userId: string;
  capsules: Capsule[];
  refreshCapsules: () => Promise<void>;
  notifications: Notification[];
  dismissNotification: (capsuleId: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppContextProvider');
  return ctx;
};

interface AppProps {
  userId: string;
}

const App: React.FC<AppProps> = ({ userId }) => {
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const refreshCapsules = useCallback(async () => {
    try {
      const data = await capsuleApi.getUserCapsules(userId);
      setCapsules(data);
    } catch (e) {
      console.error('加载胶囊失败:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const dismissNotification = useCallback((capsuleId: string) => {
    setNotifications((prev) => prev.filter((n) => n.capsule_id !== capsuleId));
  }, []);

  const handleNotificationClick = useCallback(
    (capsuleId: string) => {
      dismissNotification(capsuleId);
      navigate(`/capsule/${capsuleId}`);
    },
    [dismissNotification, navigate]
  );

  useEffect(() => {
    refreshCapsules();
  }, [refreshCapsules]);

  useEffect(() => {
    const checkNotifs = async () => {
      try {
        const newNotifs = await capsuleApi.checkNotifications(userId);
        if (newNotifs.length > 0) {
          setNotifications((prev) => {
            const existingIds = new Set(prev.map((n) => n.capsule_id));
            const uniqueNew = newNotifs.filter((n) => !existingIds.has(n.capsule_id));
            return [...prev, ...uniqueNew];
          });

          if ('Notification' in window && Notification.permission === 'granted') {
            newNotifs.forEach((notif) => {
              try {
                const n = new Notification('时光胶囊', {
                  body: notif.message || '你的时光胶囊已解锁',
                  tag: notif.capsule_id,
                });
                n.onclick = () => {
                  window.focus();
                  handleNotificationClick(notif.capsule_id);
                  n.close();
                };
              } catch (e) {
                console.error('浏览器通知失败:', e);
              }
            });
          }

          refreshCapsules();
        }
      } catch (e) {
        console.error('检查通知失败:', e);
      }
    };

    checkNotifs();
    const interval = setInterval(checkNotifs, 30000);
    return () => clearInterval(interval);
  }, [userId, handleNotificationClick, refreshCapsules]);

  const contextValue = useMemo(
    () => ({
      userId,
      capsules,
      refreshCapsules,
      notifications,
      dismissNotification,
    }),
    [userId, capsules, refreshCapsules, notifications, dismissNotification]
  );

  return (
    <AppContext.Provider value={contextValue}>
      <div className="app-container">
        <header className="app-header">
          <div className="header-content">
            <div className="logo" onClick={() => navigate('/')}>
              <span className="logo-icon">🏺</span>
              <span className="logo-text">时光胶囊</span>
            </div>
            <nav className="nav-links">
              <button
                className={`nav-btn ${location.pathname === '/' ? 'active' : ''}`}
                onClick={() => navigate('/')}
              >
                时间轴
              </button>
              <button
                className={`nav-btn primary ${location.pathname === '/create' ? 'active' : ''}`}
                onClick={() => navigate('/create')}
              >
                + 创建胶囊
              </button>
            </nav>
          </div>
        </header>

        <main className={`page-transition ${location.pathname}`}>
          <Suspense fallback={<div className="page-loading"><div className="spinner" /></div>}>
            <Routes>
              <Route path="/" element={<TimelinePage loading={loading} />} />
              <Route path="/create" element={<CreatePage />} />
              <Route path="/capsule/:id" element={<DetailPage />} />
            </Routes>
          </Suspense>
        </main>

        {notifications.length > 0 && (
          <div className="notification-stack">
            {notifications.map((notif) => (
              <div
                key={notif.capsule_id}
                className="notification-card"
                onClick={() => handleNotificationClick(notif.capsule_id)}
              >
                <div className="notification-icon">🔓</div>
                <div className="notification-body">
                  <div className="notification-title">{notif.title || '胶囊已解锁'}</div>
                  <div className="notification-message">{notif.message || '你的时光胶囊已解锁，快来查看吧！'}</div>
                </div>
                <button
                  className="notification-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissNotification(notif.capsule_id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
};

export default App;
