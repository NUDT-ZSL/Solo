import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import GardenPage from './GardenPage';
import PlotDetail from './PlotDetail';

function Navbar({
  currentUser,
  onToggleMenu,
}: {
  currentUser: { id: string; name: string; avatar: string };
  onToggleMenu: () => void;
}) {
  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        width: '100%',
        height: '56px',
        background: '#2e7d32',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
        🌿 阳光社区花园
      </h1>
      <div className="nav-links" style={{ marginLeft: '24px' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', marginRight: '16px' }}>
          首页
        </Link>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>{currentUser.avatar}</span>
        <span>{currentUser.name}</span>
      </div>
      <span
        className="hamburger"
        onClick={onToggleMenu}
        style={{ marginLeft: '16px' }}
      >
        ☰
      </span>
    </nav>
  );
}

export default function App() {
  const [currentUser] = useState({ id: 'user-1', name: '小明', avatar: '🧑‍🌾' });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <BrowserRouter>
      <Navbar currentUser={currentUser} onToggleMenu={() => setMobileMenuOpen((v) => !v)} />
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: '56px',
            left: 0,
            width: '100%',
            height: 'calc(100% - 56px)',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '32px',
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <Link
            to="/"
            style={{ color: 'white', fontSize: '20px', textDecoration: 'none', marginBottom: '16px' }}
            onClick={() => setMobileMenuOpen(false)}
          >
            首页
          </Link>
        </div>
      )}
      <div style={{ paddingTop: '56px' }}>
        <Routes>
          <Route path="/" element={<GardenPage currentUser={currentUser} />} />
          <Route path="/plot/:id" element={<PlotDetail currentUser={currentUser} />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
