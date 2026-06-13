import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ReviewPage from './components/ReviewPage';
import CardManager from './components/CardManager';
import { statsApi, UserStats } from './api';

interface AuthContextType {
  user: { name: string } | null;
  stats: UserStats | null;
  refreshStats: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

function AnimatedCounter({ value, duration = 500 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);

  return <>{count}</>;
}

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { stats } = useAuth();

  const navItems = [
    { id: 'dashboard', label: '仪表盘', icon: '📊', path: '/' },
    { id: 'manager', label: '单词管理', icon: '📝', path: '/manager' },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/review');
    }
    return location.pathname === path;
  };

  const handleLogout = () => {
    alert('已退出登录');
  };

  return (
    <aside className="sidebar">
      <div className="logo-section">
        <div className="logo">
          <div className="logo-icon">⚡</div>
          <span>FlashCardForge</span>
        </div>
      </div>

      <nav className="nav-section">
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      <div className="stats-overview-sidebar">
        <div className="stats-title">学习概览</div>
        <div className="stat-item">
          <span className="stat-label">今日学习</span>
          <span className="stat-value">
            <AnimatedCounter value={stats?.todayLearned || 0} />
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">总卡片数</span>
          <span className="stat-value">
            <AnimatedCounter value={stats?.totalCards || 0} />
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">连续天数</span>
          <span className="stat-value">
            <AnimatedCounter value={stats?.streakDays || 0} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}> 天</span>
          </span>
        </div>
      </div>

      <button className="logout-btn" onClick={handleLogout}>
        <span>🚪</span>
        <span>退出登录</span>
      </button>
    </aside>
  );
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user] = useState({ name: '学习者' });
  const [stats, setStats] = useState<UserStats | null>(null);

  const refreshStats = async () => {
    try {
      const data = await statsApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    refreshStats();
  }, []);

  return (
    <AuthContext.Provider value={{ user, stats, refreshStats }}>
      {children}
    </AuthContext.Provider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="app-container">
        <div className="glow-background" />
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/review/:deckId" element={<ReviewPage />} />
            <Route path="/manager" element={<CardManager />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}
