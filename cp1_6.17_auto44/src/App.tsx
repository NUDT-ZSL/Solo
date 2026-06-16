import React, { useState, useMemo, useEffect } from 'react';
import RouteCard from './components/RouteCard';
import RouteDetail from './components/RouteDetail';
import UserCenter from './components/UserCenter';
import NotificationToast from './components/NotificationToast';
import { dataStore, Route } from './data/dataStore';

type ViewType = 'home' | 'detail' | 'user';

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('home');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const routes: Route[] = useMemo(() => {
    if (searchKeyword.trim()) {
      const filtered = dataStore.searchRoutes(searchKeyword.trim());
      if (filtered.length > 0) return filtered;
    }
    return dataStore.getRoutes().slice(0, 3);
  }, [searchKeyword]);

  const handleCardClick = (routeId: string) => {
    setSelectedRouteId(routeId);
    setView('detail');
  };

  const handleBackToHome = () => {
    setView('home');
  };

  const handleGoUserCenter = () => {
    setView('user');
  };

  const handleUserSelectRoute = (routeId: string) => {
    setSelectedRouteId(routeId);
    setView('detail');
  };

  const userId = dataStore.getCurrentUserId();
  const userAppCount = dataStore.getUserApplications(userId).length;

  return (
    <div className={`app-container ${isMobile ? 'mobile' : ''}`}>
      <header className="app-header">
        <div className="header-inner">
          <div className="logo" onClick={handleBackToHome}>
            <span className="logo-icon">🧳</span>
            <span className="logo-text">途伴</span>
          </div>
          <nav className="header-nav">
            <button
              className={`nav-btn ${view === 'home' ? 'nav-active' : ''}`}
              onClick={handleBackToHome}
            >
              路线推荐
            </button>
            <button
              className={`nav-btn ${view === 'user' ? 'nav-active' : ''}`}
              onClick={handleGoUserCenter}
            >
              <span className="nav-user-icon">👤</span>
              个人中心
              {userAppCount > 0 && <span className="nav-badge">{userAppCount}</span>}
            </button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {view === 'home' && (
          <div className="home-view">
            <div className="search-bar-wrap">
              <div className="search-bar">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="搜索目的地城市，如：成都、丽江、厦门..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
                {searchKeyword && (
                  <button className="search-clear" onClick={() => setSearchKeyword('')}>
                    ×
                  </button>
                )}
              </div>
              <p className="search-tip">输入目的地，我们将为您推荐 3 条精选路线</p>
            </div>

            <div className="results-list">
              {routes.map((route) => (
                <RouteCard key={route.id} route={route} onClick={handleCardClick} />
              ))}
            </div>
          </div>
        )}

        {view === 'detail' && (
          <RouteDetail routeId={selectedRouteId} onBack={handleBackToHome} />
        )}

        {view === 'user' && (
          <UserCenter onBack={handleBackToHome} onSelectRoute={handleUserSelectRoute} />
        )}
      </main>

      <NotificationToast />
    </div>
  );
};

export default App;
