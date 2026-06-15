import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import Market from './pages/Market';
import Detail from './pages/Detail';
import Profile from './pages/Profile';
import { ToastProvider } from './components/Toast';
import { useEffect, useState } from 'react';
import * as api from './services/api';

export default function App() {
  const navigate = useNavigate();
  const [me, setMe] = useState<{ id: string; name: string; avatar: string } | null>(null);

  useEffect(() => {
    api.fetchMe().then(setMe).catch(() => {});
  }, []);

  return (
    <ToastProvider>
      <div className="app-shell">
        <nav className="top-nav">
          <div className="top-nav-inner">
            <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              <span className="logo-dot" />
              SkillSwap
            </div>
            <div className="nav-links">
              <NavLink
                to="/"
                end
                style={({ isActive }) => ({
                  padding: '8px 14px',
                  borderRadius: 8,
                  color: isActive ? '#6366f1' : '#64748b',
                  fontWeight: isActive ? 600 : 500,
                  background: isActive ? '#eef2ff' : 'transparent',
                  transition: 'all 0.3s ease',
                })}
              >
                技能集市
              </NavLink>
              <NavLink
                to="/profile"
                style={({ isActive }) => ({
                  padding: '8px 14px',
                  borderRadius: 8,
                  color: isActive ? '#6366f1' : '#64748b',
                  fontWeight: isActive ? 600 : 500,
                  background: isActive ? '#eef2ff' : 'transparent',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                })}
              >
                {me && (
                  <img src={me.avatar} alt="" style={{ width: 22, height: 22, borderRadius: '50%' }} />
                )}
                个人中心
              </NavLink>
            </div>
          </div>
        </nav>

        <main className="page-container">
          <Routes>
            <Route path="/" element={<Market me={me} />} />
            <Route path="/skill/:id" element={<Detail me={me} />} />
            <Route path="/profile" element={<Profile me={me} />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}
