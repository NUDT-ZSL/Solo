import { useState, useEffect } from 'react';
import MapPage from './MapPage';

const USER_KEY = 'scent_map_user';

export default function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginInput, setLoginInput] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) setUserId(stored);
  }, []);

  const handleLogin = () => {
    const id = loginInput.trim();
    if (!id) return;
    localStorage.setItem(USER_KEY, id);
    setUserId(id);
    setShowLogin(false);
    setLoginInput('');
  };

  const handleLogout = () => {
    localStorage.removeItem(USER_KEY);
    setUserId(null);
  };

  return (
    <>
      <MapPage userId={userId} onLoginClick={() => setShowLogin(true)} onLogout={handleLogout} />

      {showLogin && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.3)', zIndex: 3000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowLogin(false); }}
        >
          <div style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 24,
            padding: 36,
            width: '100%',
            maxWidth: 380,
            boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
            border: '1px solid rgba(255,255,255,0.6)',
            textAlign: 'center',
            animation: 'modalIn 0.35s ease-out',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌸</div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, color: '#3d5a3a', fontWeight: 700 }}>气味地图</h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#999' }}>输入你的昵称开始探索</p>
            <input
              value={loginInput}
              onChange={e => setLoginInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="你的昵称…"
              autoFocus
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 12,
                border: '2px solid rgba(168,201,127,0.3)', fontSize: 15,
                background: 'rgba(255,255,255,0.6)', outline: 'none',
                marginBottom: 16, boxSizing: 'border-box',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(168,201,127,0.6)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(168,201,127,0.3)'}
            />
            <button
              onClick={handleLogin}
              disabled={!loginInput.trim()}
              style={{
                width: '100%', padding: '12px', borderRadius: 12,
                border: 'none',
                background: loginInput.trim()
                  ? 'linear-gradient(135deg, #a8c97f, #7da654)'
                  : '#ddd',
                color: '#fff', fontSize: 15,
                fontWeight: 600, cursor: loginInput.trim() ? 'pointer' : 'default',
                boxShadow: loginInput.trim() ? '0 4px 16px rgba(125,166,84,0.35)' : 'none',
                transition: 'all 0.2s',
              }}
            >开始探索</button>
          </div>
        </div>
      )}
    </>
  );
}
