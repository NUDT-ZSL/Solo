import { Suspense, lazy } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const Record = lazy(() => import('./pages/Record'));
const History = lazy(() => import('./pages/History'));
const Profile = lazy(() => import('./pages/Profile'));
const Detail = lazy(() => import('./pages/Detail'));

function Nav() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <div className="nav-logo">
          <span>🍜</span>
          <span>风味日志</span>
        </div>
        <div className="nav-links">
          <NavLink to="/" className="nav-link" end>
            首页
          </NavLink>
          <NavLink to="/record" className="nav-link">
            记录
          </NavLink>
          <NavLink to="/history" className="nav-link">
            历史
          </NavLink>
          <NavLink to="/profile" className="nav-link">
            我的
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 0',
        color: 'var(--color-text-light)',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: '3px solid var(--color-gray-200)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginRight: 12,
        }}
      />
      <span>加载中...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <main className="container">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/record" element={<Record />} />
            <Route path="/history" element={<History />} />
            <Route path="/history/:id" element={<Detail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
