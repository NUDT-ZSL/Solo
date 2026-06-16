import React, { useState, useEffect, useRef } from 'react';
import TripList from './components/TripList';
import TripDetail from './components/TripDetail';
import type { User } from './types';

type ViewType = 'list' | 'detail' | 'create';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const demoUser: User = {
      id: 'user-1',
      username: 'demo',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    };
    setUser(demoUser);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setNavVisible(false);
      } else {
        setNavVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSelectTrip = (tripId: string) => {
    setSelectedTripId(tripId);
    setCurrentView('detail');
    window.scrollTo(0, 0);
  };

  const handleCreateTrip = () => {
    setSelectedTripId('');
    setCurrentView('create');
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setCurrentView('list');
    setSelectedTripId('');
  };

  return (
    <div className="app">
      <nav className={`nav-bar ${navVisible ? 'visible-nav' : 'hidden-nav'}`}>
        <div className="nav-left">
          {currentView !== 'list' && (
            <button className="nav-back-btn" onClick={handleBack}>
              ←
            </button>
          )}
          <h1 className="nav-title">
            {currentView === 'list' ? '我的旅行笔记' : '行程详情'}
          </h1>
        </div>
        <div className="nav-actions">
          {user && (
            <div className="user-info">
              {user.avatar && (
                <img src={user.avatar} alt={user.username} className="user-avatar" />
              )}
              <span className="user-name">{user.username}</span>
            </div>
          )}
        </div>
      </nav>

      <main className="container">
        {currentView === 'list' && user && (
          <TripList
            userId={user.id}
            onSelectTrip={handleSelectTrip}
            onCreateTrip={handleCreateTrip}
          />
        )}

        {currentView === 'detail' && selectedTripId && (
          <TripDetail tripId={selectedTripId} onBack={handleBack} />
        )}

        {currentView === 'create' && (
          <div className="create-trip-page">
            <h2 className="page-title">创建新行程</h2>
            <p>功能开发中...</p>
            <button className="btn-secondary" onClick={handleBack}>
              返回
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
