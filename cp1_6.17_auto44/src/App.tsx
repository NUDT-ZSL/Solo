import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  const [searchInput, setSearchInput] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [hasSearched, setHasSearched] = useState(false);
  const [cardVisible, setCardVisible] = useState<boolean[]>([]);
  const searchTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const routes: Route[] = useMemo(() => {
    if (searchKeyword.trim()) {
      const filtered = dataStore.searchRoutes(searchKeyword.trim());
      if (filtered.length > 0) return filtered;
    }
    return dataStore.getRoutes().slice(0, 3);
  }, [searchKeyword]);

  useEffect(() => {
    searchTimersRef.current.forEach((t) => clearTimeout(t));
    searchTimersRef.current = [];
    setCardVisible(new Array(routes.length).fill(false));
    routes.forEach((_, idx) => {
      const timer = setTimeout(() => {
        setCardVisible((prev) => {
          const next = [...prev];
          next[idx] = true;
          return next;
        });
      }, 100 + idx * 150);
      searchTimersRef.current.push(timer);
    });
    return () => {
      searchTimersRef.current.forEach((t) => clearTimeout(t));
    };
  }, [routes]);

  const handleSearch = () => {
    setSearchKeyword(searchInput);
    setHasSearched(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setSearchKeyword(value);
      setHasSearched(true);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchInput('');
    setSearchKeyword('');
    setHasSearched(false);
  };

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
                  value={searchInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                />
                {searchInput && (
                  <button className="search-clear" onClick={handleClearSearch}>
                    ×
                  </button>
                )}
                <button className="search-btn" onClick={handleSearch}>
                  搜索
                </button>
              </div>
              <p className="search-tip">输入目的地，我们将为您推荐 3 条精选路线</p>
            </div>

            {hasSearched && routes.length > 0 && (
              <div className="results-hint">
                ✨ 为您找到 <strong>{routes.length}</strong> 条路线
              </div>
            )}

            {hasSearched && routes.length === 0 && (
              <div className="results-hint results-empty">
                😔 未找到相关路线，试试其他关键词
              </div>
            )}

            <div className="results-list">
              {routes.map((route, idx) => (
                <div
                  key={route.id}
                  className={`card-fade-wrap ${cardVisible[idx] ? 'card-visible' : ''}`}
                  style={{ transitionDelay: `${idx * 0.1}s` }}
                >
                  <RouteCard route={route} onClick={handleCardClick} index={idx} />
                </div>
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
