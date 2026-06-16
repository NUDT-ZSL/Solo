import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './components/Header';
import FavoriteSidebar from './components/FavoriteSidebar';
import HomePage from './pages/HomePage';
import ArtistPage from './pages/ArtistPage';
import TourPage from './pages/TourPage';
import ArtistCard from './components/ArtistCard';
import { useStore } from './store/useStore';
import { useFavorites } from './hooks/useData';

function ScrollToTop() {
  const { pathname, key } = useLocation();
  useEffect(() => {
    if (key !== 'default') {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, [pathname, key]);
  return null;
}

function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav">
      <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''} end>
        🏠<div>首页</div>
      </NavLink>
      <NavLink to="/tour" className={({ isActive }) => isActive ? 'active' : ''}>
        🗺️<div>巡演</div>
      </NavLink>
      <NavLink to="/favorites" className={({ isActive }) => isActive ? 'active' : ''}>
        ❤️<div>收藏</div>
      </NavLink>
    </nav>
  );
}

function FavoritesPage() {
  const { favorites, loading } = useFavorites();
  return (
    <div className="container">
      <h1 className="page-title">❤️ 我的收藏</h1>
      <p className="page-subtitle">你收藏的音乐人都在这里</p>
      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : favorites.length === 0 ? (
        <div className="empty-state">还没有收藏任何音乐人，快去首页发现吧！</div>
      ) : (
        <div className="artist-grid">
          {favorites.map((f, i) => (
            <ArtistCard key={f.id} artist={f.artist as any} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { sidebarOpen } = useStore();
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="app-layout">
        <div className="main-content" style={{ marginRight: sidebarOpen ? '320px' : '0' }}>
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/artist/:id" element={<ArtistPage />} />
            <Route path="/tour" element={<TourPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
          </Routes>
          <MobileBottomNav />
        </div>
        <FavoriteSidebar />
      </div>
    </BrowserRouter>
  );
}
