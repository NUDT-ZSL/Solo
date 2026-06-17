import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import axios from 'axios';
import CalendarView from './components/CalendarView';
import DevicePanel from './components/DevicePanel';
import Dashboard from './components/Dashboard';

interface Member {
  id: string;
  name: string;
  role: string;
  city: string;
  isAdmin: boolean;
}

interface Notification {
  id: string;
  userId: string;
  type: 'borrow_due' | 'request_approved' | 'request_rejected';
  message: string;
  isRead: boolean;
  createdAt: string;
}

const App = () => {
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    }
  }, [currentUser]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const fetchCurrentUser = async () => {
    try {
      const res = await axios.get('/api/auth/current');
      setCurrentUser(res.data);
    } catch (err) {
      console.error('获取用户失败:', err);
    }
  };

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await axios.get(`/api/notifications/${currentUser.id}`);
      setNotifications(res.data.filter((n: Notification) => !n.isRead));
    } catch (err) {
      console.error('获取通知失败:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderNavIcon = (path: string) => {
    switch (path) {
      case '/':
        return '📊';
      case '/calendar':
        return '📅';
      case '/devices':
        return '🎸';
      default:
        return '📁';
    }
  };

  return (
    <div className="app-layout">
      <div
        className={`mobile-backdrop ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      <div className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          ☰
        </button>
        <div className="mobile-title">巡演管家</div>
        <div style={{ width: 40 }} />
      </div>

      <aside className={`sidebar ${mobileMenuOpen ? 'active' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">🎵</div>
          <div className="sidebar-title">巡演管家</div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className="nav-item">
            <span className="nav-icon">{renderNavIcon('/')}</span>
            <span>仪表盘</span>
            {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
          </NavLink>
          <NavLink to="/calendar" className="nav-item">
            <span className="nav-icon">{renderNavIcon('/calendar')}</span>
            <span>日历排期</span>
          </NavLink>
          <NavLink to="/devices" className="nav-item">
            <span className="nav-icon">{renderNavIcon('/devices')}</span>
            <span>设备管理</span>
          </NavLink>
        </nav>

        {currentUser && (
          <div className="sidebar-user">
            <div className="user-avatar">
              {currentUser.name.charAt(0)}
            </div>
            <div className="user-info">
              <div className="user-name">
                {currentUser.name}
                {currentUser.isAdmin && (
                  <span
                    style={{
                      background: 'var(--accent)',
                      color: 'white',
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                      marginLeft: 6,
                      fontWeight: 600,
                    }}
                  >
                    管理员
                  </span>
                )}
              </div>
              <div className="user-role">
                {currentUser.role} · {currentUser.city}
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={<Dashboard currentUser={currentUser} onRefresh={fetchNotifications} />}
          />
          <Route
            path="/calendar"
            element={<CalendarView currentUser={currentUser} />}
          />
          <Route
            path="/devices"
            element={<DevicePanel currentUser={currentUser} />}
          />
        </Routes>
      </main>
    </div>
  );
};

export default App;
