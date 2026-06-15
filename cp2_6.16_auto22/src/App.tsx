import React, { useState, useEffect } from 'react';
import BudgetInput from './components/BudgetInput';
import ItineraryPanel from './components/ItineraryPanel';
import ItineraryDetail from './components/ItineraryDetail';
import MapView from './components/MapView';
import ShareButton from './components/ShareButton';
import { useItinerary } from './context/ItineraryContext';
import { getItineraryById } from './services/budgetService';
import './App.css';

const App: React.FC = () => {
  const { itinerary, setItinerary, setSelectedDay } = useItinerary();
  const [showResults, setShowResults] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (itinerary) {
      const timer = setTimeout(() => {
        setShowResults(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [itinerary]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const itineraryId = urlParams.get('id');
    
    if (itineraryId && !itinerary) {
      setIsLoading(true);
      getItineraryById(itineraryId)
        .then((data) => {
          setItinerary(data);
          setSelectedDay(1);
        })
        .catch((err) => {
          console.error('加载行程失败:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, []);

  const handleReset = () => {
    setShowResults(false);
    setTimeout(() => {
      setItinerary(null);
    }, 400);
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>加载行程中...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {!showResults && <BudgetInput />}

      {showResults && itinerary && (
        <div className="results-container">
          <button className="back-button" onClick={handleReset}>
            ← 重新规划
          </button>

          <div className="mobile-header">
            <button
              className={`mobile-menu-btn ${mobileMenuOpen ? 'open' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <h2 className="mobile-title">行程计划</h2>
            <button
              className="mobile-map-btn"
              onClick={() => setMobileMapOpen(!mobileMapOpen)}
            >
              🗺️
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
              <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
                <ItineraryPanel />
              </div>
            </div>
          )}

          <div className="main-content">
            <div className="left-panel">
              <ItineraryPanel />
            </div>

            <div className="center-panel">
              <ItineraryDetail />
            </div>

            <div className="right-panel">
              <MapView />
            </div>
          </div>

          {mobileMapOpen && (
            <div className="mobile-map-overlay" onClick={() => setMobileMapOpen(false)}>
              <div className="mobile-map-content" onClick={(e) => e.stopPropagation()}>
                <div className="mobile-map-header">
                  <h3>地图路线</h3>
                  <button onClick={() => setMobileMapOpen(false)}>×</button>
                </div>
                <MapView />
              </div>
            </div>
          )}

          <ShareButton />
        </div>
      )}
    </div>
  );
};

export default App;
