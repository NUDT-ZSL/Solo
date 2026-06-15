import React, { createContext, useState, useEffect, useContext } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Music from './pages/Music';
import Guestbook from './pages/Guestbook';

interface User {
  id: string;
  nickname: string;
  role: 'admin' | 'fan';
}

interface Band {
  name: string;
  logo: string;
}

const UserContext = createContext<{
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}>({ user: null, setUser: () => {} });

const BandContext = createContext<{
  band: Band;
  setBand: React.Dispatch<React.SetStateAction<Band>>;
}>({
  band: { name: 'CYBER PUNK BAND', logo: '' },
  setBand: () => {},
});

export { UserContext, BandContext };

function NavBar() {
  const location = useLocation();
  const navItems = [
    { to: '/', label: '演出', exact: true },
    { to: '/music', label: '乐谱' },
    { to: '/guestbook', label: '留言' },
  ];

  const getActiveIndex = () => {
    const path = location.pathname;
    if (path === '/') return 0;
    if (path === '/music') return 1;
    if (path === '/guestbook') return 2;
    if (path === '/dashboard') return 0;
    return 0;
  };

  const activeIndex = getActiveIndex();

  return (
    <nav style={navStyle}>
      <div style={navInnerStyle}>
        <div style={logoStyle}>
          <div style={logoCircleStyle}>🎸</div>
          <span style={bandNameStyle}>CYBER BAND</span>
        </div>
        <div style={navLinksStyle}>
          {navItems.map((item, idx) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              style={({ isActive }) => ({
                ...navLinkStyle,
                color: isActive ? '#a78bfa' : '#e2e8f0',
              })}
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/dashboard" style={adminLinkStyle}>
            ⚙ 管理
          </NavLink>
          <div
            style={{
              ...underlineStyle,
              transform: `translateX(${activeIndex * 80}px)`,
            }}
          />
        </div>
      </div>
    </nav>
  );
}

const navStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: 64,
  background: 'rgba(15, 14, 23, 0.95)',
  backdropFilter: 'blur(10px)',
  borderBottom: '1px solid #1e1b4b',
  zIndex: 1000,
};

const navInnerStyle: React.CSSProperties = {
  maxWidth: 1400,
  margin: '0 auto',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
};

const logoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const logoCircleStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #a78bfa, #38bdf8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
};

const bandNameStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 16,
  letterSpacing: 1,
  color: '#e2e8f0',
};

const navLinksStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 32,
  position: 'relative',
};

const navLinkStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 500,
  padding: '4px 0',
  transition: 'color 0.2s ease-in-out',
  width: 48,
  textAlign: 'center',
};

const adminLinkStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#64748b',
  padding: '6px 12px',
  borderRadius: 8,
  transition: 'all 0.2s ease-in-out',
  marginLeft: 8,
};

const underlineStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: -2,
  left: 0,
  width: 48,
  height: 2,
  background: '#a78bfa',
  borderRadius: 1,
  transition: 'transform 0.3s ease-in-out',
  pointerEvents: 'none',
};

function App() {
  const [user, setUser] = useState<User | null>({
    id: '1',
    nickname: '管理员',
    role: 'admin',
  });
  const [band, setBand] = useState<Band>({
    name: 'CYBER PUNK BAND',
    logo: '',
  });

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <BandContext.Provider value={{ band, setBand }}>
        <BrowserRouter>
          <NavBar />
          <main style={{ paddingTop: 64, minHeight: '100vh' }}>
            <Routes>
              <Route path="/" element={<Events />} />
              <Route path="/music" element={<Music />} />
              <Route path="/guestbook" element={<Guestbook />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </main>
        </BrowserRouter>
      </BandContext.Provider>
    </UserContext.Provider>
  );
}

export default App;
