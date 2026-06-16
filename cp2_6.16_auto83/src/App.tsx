import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { GalleryProvider } from './context/GalleryContext';
import Gallery from './components/Gallery';
import Admin from './components/Admin';

const Navbar: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="nav-content">
        <div className="nav-brand">虚拟画廊</div>
        <div className="nav-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            画廊
          </Link>
          <Link
            to="/admin"
            className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
          >
            管理
          </Link>
        </div>
      </div>
    </nav>
  );
};

const AppContent: React.FC = () => {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Gallery />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Gallery />} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <GalleryProvider>
        <AppContent />
      </GalleryProvider>
    </BrowserRouter>
  );
};

export default App;
