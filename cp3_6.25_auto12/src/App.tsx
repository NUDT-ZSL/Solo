import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import WorkList from './components/WorkList';
import Uploader from './components/Uploader';
import { fetchWorks, getStats } from './api/dataService';
import type { Work, StatsResponse } from './types';
import './App.css';

const App: React.FC = () => {
  const [works, setWorks] = useState<Work[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [activeView, setActiveView] = useState<'works' | 'dashboard'>('works');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 600);
      setIsTablet(window.innerWidth < 1024);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  useEffect(() => {
    if (location.pathname === '/dashboard') {
      setActiveView('dashboard');
    } else {
      setActiveView('works');
    }
  }, [location.pathname]);

  const loadData = async () => {
    try {
      const [worksData, statsData] = await Promise.all([
        fetchWorks(),
        getStats(),
      ]);
      setWorks(worksData);
      setStats(statsData);
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUploadSuccess = () => {
    setShowUploader(false);
    loadData();
  };

  const handleNavClick = (view: 'works' | 'dashboard') => {
    setActiveView(view);
    navigate(view === 'works' ? '/' : '/dashboard');
  };

  const sidebarContent = (
    <>
      <div className="logo">
        <div className="logo-icon">🎨</div>
        <h1>艺术视界</h1>
      </div>
      <nav className="nav-menu">
        <div
          className={`nav-item ${activeView === 'works' ? 'active' : ''}`}
          onClick={() => handleNavClick('works')}
        >
          <span className="nav-icon">🖼️</span>
          <span>作品列表</span>
        </div>
        <div
          className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleNavClick('dashboard')}
        >
          <span className="nav-icon">📊</span>
          <span>流量看板</span>
        </div>
      </nav>
      <button className="upload-btn" onClick={() => setShowUploader(true)}>
        <span>+</span> 上传作品
      </button>
    </>
  );

  return (
    <div className="app-container">
      {isTablet ? (
        <header className="top-nav">
          <div className="top-nav-content">
            <div className="logo-mobile">
              <span className="logo-icon">🎨</span>
              <h1>艺术视界</h1>
            </div>
            <nav className="top-nav-menu">
              <div
                className={`nav-item ${activeView === 'works' ? 'active' : ''}`}
                onClick={() => handleNavClick('works')}
              >
                作品列表
              </div>
              <div
                className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleNavClick('dashboard')}
              >
                流量看板
              </div>
            </nav>
            <button className="upload-btn-mobile" onClick={() => setShowUploader(true)}>
              + 上传
            </button>
          </div>
        </header>
      ) : (
        <aside className="sidebar">{sidebarContent}</aside>
      )}

      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={<WorkList works={works} onDataUpdate={loadData} />}
          />
          <Route
            path="/dashboard"
            element={<Dashboard stats={stats} onDataUpdate={loadData} />}
          />
        </Routes>
      </main>

      {showUploader && (
        <Uploader
          onClose={() => setShowUploader(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
};

export default App;
