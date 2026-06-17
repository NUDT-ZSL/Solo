import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { SharePage } from './pages/SharePage';
import { PawPrint } from 'lucide-react';

const Navbar: React.FC = () => {
  const location = useLocation();
  const isSharePage = location.pathname.startsWith('/share/');

  if (isSharePage) {
    return null;
  }

  return (
    <nav 
      style={{
        backgroundColor: '#fff',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}
    >
      <Link 
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
          color: '#f57c00',
          fontFamily: 'Roboto, sans-serif'
        }}
      >
        <PawPrint size={28} color="#f57c00" />
        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>宠物健康档案</span>
      </Link>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', color: '#999', fontFamily: 'Roboto, sans-serif' }}>
          管理您爱宠的健康
        </span>
      </div>
    </nav>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div 
        style={{
          minHeight: '100vh',
          backgroundColor: '#fafafa',
          fontFamily: 'Roboto, sans-serif'
        }}
      >
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pet/:id" element={<ProfilePage />} />
          <Route path="/share/:token" element={<SharePage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
