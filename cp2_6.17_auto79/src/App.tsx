import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import NewRecordPage from './pages/NewRecordPage';

const navStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  background: '#1b2838',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
  height: '56px',
};

const appTitleStyle: React.CSSProperties = {
  color: '#90caf9',
  fontSize: '20px',
  fontWeight: 700,
  letterSpacing: '2px',
};

const newBtnStyle: React.CSSProperties = {
  background: '#1565c0',
  color: '#fff',
  borderRadius: '8px',
  padding: '8px 20px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 600,
  transition: 'background 0.2s',
};

export default function App() {
  return (
    <HashRouter>
      <nav style={navStyle}>
        <span style={appTitleStyle}>星迹</span>
        <Link
          to="/new"
          style={newBtnStyle}
          onMouseEnter={e => (e.currentTarget.style.background = '#1976d2')}
          onMouseLeave={e => (e.currentTarget.style.background = '#1565c0')}
        >
          新建记录
        </Link>
      </nav>
      <div style={{ marginTop: '56px' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/detail/:id" element={<DetailPage />} />
          <Route path="/new" element={<NewRecordPage />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
