import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Recognition } from './pages/Recognition';
import { Encyclopedia } from './pages/Encyclopedia';
import { PlantDetail } from './pages/PlantDetail';
import { Favorites } from './pages/Favorites';
import { Discovery } from './pages/Discovery';
import { Comparison } from './pages/Comparison';
import { BottomNav } from './components/BottomNav';
import type { PageKey } from './types';

function pageKeyFromPath(path: string): PageKey {
  if (path.startsWith('/encyclopedia')) return 'encyclopedia';
  if (path.startsWith('/favorites')) return 'favorites';
  if (path.startsWith('/discovery') || path.startsWith('/comparison')) return 'discovery';
  return 'recognition';
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState<PageKey>(pageKeyFromPath(location.pathname));
  const [transitionKey, setTransitionKey] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  useEffect(() => {
    const key = pageKeyFromPath(location.pathname);
    const order: PageKey[] = ['recognition', 'encyclopedia', 'favorites', 'discovery'];
    const prevIdx = order.indexOf(activePage);
    const nextIdx = order.indexOf(key);
    if (nextIdx !== prevIdx) {
      setDirection(nextIdx > prevIdx ? 'right' : 'left');
    }
    setActivePage(key);
    setTransitionKey((k) => k + 1);
  }, [location.pathname]);

  const handleNavChange = (page: PageKey) => {
    const routes: Record<PageKey, string> = {
      recognition: '/recognition',
      encyclopedia: '/encyclopedia',
      favorites: '/favorites',
      discovery: '/discovery',
    };
    navigate(routes[page]);
  };

  const isDetailPage = location.pathname.startsWith('/encyclopedia/') && location.pathname !== '/encyclopedia';
  const isComparisonPage = location.pathname.startsWith('/comparison');
  const showBottomNav = !isDetailPage && !isComparisonPage;

  return (
    <div className="relative min-h-screen bg-bg">
      <Routes location={location} key={transitionKey}>
        <Route path="/" element={<Navigate to="/recognition" replace />} />
        <Route path="/recognition" element={<Recognition />} />
        <Route path="/encyclopedia" element={<Encyclopedia />} />
        <Route path="/encyclopedia/:id" element={<PlantDetail />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/discovery" element={<Discovery />} />
        <Route path="/comparison" element={<Comparison />} />
      </Routes>
      {showBottomNav && <BottomNav active={activePage} onChange={handleNavChange} />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
