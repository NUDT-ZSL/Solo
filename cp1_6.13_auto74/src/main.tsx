import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import AdoptPage from './pages/AdoptPage';
import AdminPage from './pages/AdminPage';

function NavBar() {
  const location = useLocation();
  const linkBase =
    'px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ease';
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const update = () => {
      document.documentElement.style.setProperty(
        '--navbar-height',
        `${el.offsetHeight}px`
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <nav
      ref={navRef}
      id="app-navbar"
      style={{
        background: '#ffffff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        padding: '14px 0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #f97316, #34d399)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            🐾
          </div>
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#1f2937',
            }}
          >
            宠物救助站
          </span>
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link
            to="/"
            className={linkBase}
            style={{
              background:
                location.pathname === '/' ? '#f97316' : 'transparent',
              color: location.pathname === '/' ? '#ffffff' : '#4b5563',
            }}
          >
            🏠 领养中心
          </Link>
          <Link
            to="/admin"
            className={linkBase}
            style={{
              background:
                location.pathname === '/admin' ? '#34d399' : 'transparent',
              color: location.pathname === '/admin' ? '#ffffff' : '#4b5563',
            }}
          >
            ⚙️ 管理后台
          </Link>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div
        style={{
          minHeight: '100vh',
          background: '#f1f5f9',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
        }}
      >
        <NavBar />
        <Routes>
          <Route path="/" element={<AdoptPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
