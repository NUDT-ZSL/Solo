import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Menu, X, Sparkles } from 'lucide-react';
import SearchPanel from './components/SearchPanel';
import PlanFeed from './components/PlanFeed';
import { TravelProvider } from './context/TravelContext';

const AppContent: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="app-container">
      {isMobile && (
        <header className="mobile-topbar">
          <div className="mobile-topbar-inner">
            <div className="mobile-logo">
              <Sparkles size={22} className="logo-icon" />
              <span className="logo-text">旅行规划</span>
            </div>
            <button
              className={`hamburger-btn ${isMobileMenuOpen ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>
      )}

      <div className="main-layout">
        <div
          className={`sidebar-wrapper ${isMobile ? 'mobile' : ''} ${isMobileMenuOpen ? 'open' : ''}`}
        >
          <SearchPanel />
          {isMobile && isMobileMenuOpen && (
            <div
              className="mobile-backdrop"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
        </div>

        <div className="content-wrapper">
          <PlanFeed />
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <TravelProvider>
        <Routes>
          <Route path="/" element={<AppContent />} />
        </Routes>
      </TravelProvider>
    </Router>
  );
};

export default App;
