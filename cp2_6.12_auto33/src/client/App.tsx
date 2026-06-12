import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from './store';
import NotificationBell from './components/NotificationBell';
import Home from '@/pages/Home';

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#fdf8f0',
    fontFamily: '"PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, sans-serif',
    color: '#3a2e22',
  },
  navbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 68,
    padding: '0 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 50,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    backgroundColor: 'rgba(255, 252, 245, 0.85)',
    borderBottom: '1px solid rgba(139, 115, 85, 0.1)',
    boxShadow: '0 1px 12px rgba(90, 74, 58, 0.05)',
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 32,
    flex: 1,
    minWidth: 0,
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textDecoration: 'none',
    color: '#5a4a3a',
    flexShrink: 0,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #d4a574 0%, #b8865c 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 20,
    boxShadow: '0 2px 8px rgba(184, 134, 92, 0.3)',
  },
  logoText: {
    fontSize: 19,
    fontWeight: 700,
    letterSpacing: 0.5,
    background: 'linear-gradient(135deg, #5a4a3a 0%, #8b7355 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  searchWrapper: {
    position: 'relative',
    flex: 1,
    maxWidth: 420,
    minWidth: 200,
  },
  searchInput: {
    width: '100%',
    height: 42,
    padding: '0 16px 0 44px',
    borderRadius: 21,
    border: '1.5px solid rgba(139, 115, 85, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    color: '#3a2e22',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#b09e84',
    pointerEvents: 'none',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    flexShrink: 0,
  },
  publishBtn: {
    height: 40,
    padding: '0 22px',
    borderRadius: 20,
    border: 'none',
    background: 'linear-gradient(135deg, #d4a574 0%, #b8865c 100%)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 10px rgba(184, 134, 92, 0.3)',
    textDecoration: 'none',
  },
  avatarLink: {
    display: 'block',
    borderRadius: '50%',
    transition: 'transform 0.15s ease, box-shadow 0.2s ease',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2.5px solid #fff',
    boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
    display: 'block',
  },
  mainContent: {
    paddingTop: 80,
    minHeight: 'calc(100vh - 80px)',
  },
  pagePlaceholder: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '40px 28px',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#5a4a3a',
    marginBottom: 16,
  },
  pageDesc: {
    fontSize: 15,
    color: '#8b7355',
    lineHeight: 1.6,
  },
};

function HomePage() {
  return <Home />;
}

function FurnitureDetail() {
  return (
    <div style={styles.pagePlaceholder}>
      <h1 style={styles.pageTitle}>家具详情</h1>
      <p style={styles.pageDesc}>这里展示家具的详细信息和交换选项。</p>
    </div>
  );
}

function Dashboard() {
  const currentUser = useAppStore((s) => s.currentUser);
  return (
    <div style={styles.pagePlaceholder}>
      <h1 style={styles.pageTitle}>个人中心</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <img
          src={currentUser.avatar}
          alt={currentUser.name}
          style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}
        />
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#3a2e22' }}>{currentUser.name}</div>
          <div style={{ fontSize: 13, color: '#8b7355', marginTop: 4 }}>{currentUser.email}</div>
          <div style={{ fontSize: 13, color: '#8b7355' }}>{currentUser.phone}</div>
        </div>
      </div>
      <p style={styles.pageDesc}>管理您发布的家具、查看交换记录、编辑个人资料。</p>
    </div>
  );
}

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentUser,
    searchKeyword,
    setSearch,
    setShowPublishModal,
  } = useAppStore();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  const handlePublishClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowPublishModal(true);
    navigate('/');
  };

  const handleAvatarHover = (e: React.MouseEvent<HTMLAnchorElement>, isHover: boolean) => {
    if (isHover) {
      e.currentTarget.style.transform = 'scale(1.08)';
    } else {
      e.currentTarget.style.transform = 'scale(1)';
    }
  };

  const handlePublishHover = (e: React.MouseEvent<HTMLAnchorElement>, isHover: boolean) => {
    const el = e.currentTarget as HTMLAnchorElement;
    if (isHover) {
      el.style.transform = 'translateY(-1px)';
      el.style.boxShadow = '0 4px 16px rgba(184, 134, 92, 0.4)';
    } else {
      el.style.transform = 'translateY(0)';
      el.style.boxShadow = '0 2px 10px rgba(184, 134, 92, 0.3)';
    }
  };

  const handlePublishActive = (e: React.MouseEvent<HTMLAnchorElement>, isActive: boolean) => {
    const el = e.currentTarget as HTMLAnchorElement;
    if (isActive) {
      el.style.transform = 'scale(0.97)';
    }
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.navLeft}>
        <Link to="/" style={styles.logoLink}>
          <span style={styles.logoIcon}>🏠</span>
          <span style={styles.logoText}>家居共享</span>
        </Link>

        <div style={styles.searchWrapper}>
          <svg
            style={styles.searchIcon}
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx={11} cy={11} r={8} />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="搜索想要交换的家具..."
            value={searchKeyword}
            onChange={handleSearchChange}
            style={styles.searchInput}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(184, 134, 92, 0.4)';
              e.currentTarget.style.backgroundColor = '#fff';
              e.currentTarget.style.boxShadow = '0 0 0 4px rgba(184, 134, 92, 0.08)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      <div style={styles.navRight}>
        <Link
          to="/"
          style={styles.publishBtn}
          onClick={handlePublishClick}
          onMouseEnter={(e) => handlePublishHover(e, true)}
          onMouseLeave={(e) => handlePublishHover(e, false)}
          onMouseDown={(e) => handlePublishActive(e, true)}
          onMouseUp={(e) => handlePublishActive(e, false)}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1={12} y1={5} x2={12} y2={19} />
            <line x1={5} y1={12} x2={19} y2={12} />
          </svg>
          发布家具
        </Link>

        <NotificationBell />

        <Link
          to="/dashboard"
          style={styles.avatarLink}
          onMouseEnter={(e) => handleAvatarHover(e, true)}
          onMouseLeave={(e) => handleAvatarHover(e, false)}
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            style={styles.avatar}
          />
        </Link>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <div style={styles.app}>
      <Navbar />
      <main style={styles.mainContent}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/furniture/:id" element={<FurnitureDetail />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}
