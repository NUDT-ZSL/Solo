import React, { useState, useEffect } from 'react';
import {
  Routes,
  Route,
  Navigate,
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import NotificationBar from './components/NotificationBar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MyReports from './pages/MyReports';
import TeamReports from './pages/TeamReports';

interface MenuItem {
  path: string;
  label: string;
  icon: string;
}

const menuItems: MenuItem[] = [
  { path: '/dashboard', label: '仪表盘', icon: '📊' },
  { path: '/my-reports', label: '我的汇报', icon: '📝' },
  { path: '/team-reports', label: '团队汇报', icon: '👥' },
];

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [animatedKey, setAnimatedKey] = useState(location.pathname);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setAnimatedKey(location.pathname);
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const Sidebar = () => (
    <div
      style={{
        width: isMobile ? '100%' : 220,
        height: isMobile ? 'auto' : '100vh',
        background: '#ffffff',
        borderRight: isMobile ? 'none' : '1px solid #e0e0e0',
        borderBottom: isMobile ? '1px solid #e0e0e0' : 'none',
        position: isMobile ? 'sticky' : 'fixed',
        top: 0,
        left: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        overflowY: isMobile ? 'visible' : 'auto',
      }}
    >
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isMobile ? 'space-between' : 'flex-start',
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#3949ab',
            letterSpacing: -0.5,
          }}
        >
          TeamReport
        </div>
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'transparent',
              fontSize: 24,
              padding: 4,
              color: '#424242',
            }}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        )}
      </div>

      {(!isMobile || sidebarOpen) && (
        <>
          <nav style={{ padding: '12px 0', flex: 1 }}>
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#3949ab' : '#424242',
                  background: isActive ? '#e8eaf6' : 'transparent',
                  borderLeft: isActive ? '4px solid #3949ab' : '4px solid transparent',
                  transition: 'all 0.15s ease',
                  textDecoration: 'none',
                })}
                onMouseEnter={(e) => {
                  if (!(e.currentTarget as HTMLElement).style.background.includes('#e8eaf6')) {
                    (e.currentTarget as HTMLElement).style.background = '#fafafa';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(e.currentTarget as HTMLElement).style.background.includes('#e8eaf6')) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {user && (
            <div
              style={{
                padding: 16,
                borderTop: '1px solid #f0f0f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 12,
                  padding: '8px 12px',
                  background: '#fafafa',
                  borderRadius: 8,
                }}
              >
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: '2px solid #e0e0e0',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#212121',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#757575' }}>
                    {user.role === 'manager' ? '管理者' : '团队成员'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  background: '#f5f5f5',
                  color: '#424242',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#ffcdd2';
                  (e.currentTarget as HTMLButtonElement).style.color = '#c62828';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5';
                  (e.currentTarget as HTMLButtonElement).style.color = '#424242';
                }}
                onMouseDown={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                }}
              >
                🚪 退出登录
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#f5f5f5',
        flexDirection: isMobile ? 'column' : 'row',
      }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : 220,
          minHeight: '100vh',
          overflowX: 'hidden',
        }}
      >
        <div key={animatedKey}>
          <Routes location={location}>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-reports"
              element={
                <ProtectedRoute>
                  <MyReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team-reports"
              element={
                <ProtectedRoute>
                  <TeamReports />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <NotificationBar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<Layout />} />
        </Routes>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
