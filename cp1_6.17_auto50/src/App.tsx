import { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { mockArtworks } from './data/mockData';
import type { Artwork } from './data/mockData';
import PortfolioGrid from './components/PortfolioGrid';
import CommissionForm from './components/CommissionForm';
import TaskBoard from './components/TaskBoard';
import DetailPanel from './components/DetailPanel';
import NotificationBell from './components/NotificationBell';

export default function App() {
  const initArtworks = useStore((state) => state.initArtworks);
  const currentView = useStore((state) => state.currentView);
  const setCurrentView = useStore((state) => state.setCurrentView);
  const selectedCommissionId = useStore((state) => state.selectedCommissionId);
  const setSelectedCommission = useStore((state) => state.setSelectedCommission);

  const [commissionArtwork, setCommissionArtwork] = useState<Artwork | null>(null);

  useEffect(() => {
    initArtworks(mockArtworks);
  }, [initArtworks]);

  const handleCommission = (artwork: Artwork) => {
    setCommissionArtwork(artwork);
  };

  const handleCommissionSuccess = () => {
    setCurrentView('board');
  };

  const handleSelectCommission = (id: string) => {
    setSelectedCommission(id);
  };

  const handleCloseDetail = () => {
    setSelectedCommission(null);
  };

  return (
    <div className="app-container">
      <nav className="app-nav">
        <div className="nav-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#2D4A3E" />
            <path d="M8 22L12 12L16 18L20 10L24 22" stroke="#F5F0EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>艺作工坊</span>
        </div>
        <div className="nav-links">
          <button
            className={`nav-link ${currentView === 'portfolio' ? 'active' : ''}`}
            onClick={() => setCurrentView('portfolio')}
          >
            作品展示
          </button>
          <button
            className={`nav-link ${currentView === 'board' ? 'active' : ''}`}
            onClick={() => setCurrentView('board')}
          >
            委托看板
          </button>
        </div>
        <NotificationBell />
      </nav>

      <main className="app-main">
        {currentView === 'portfolio' && (
          <PortfolioGrid onCommission={handleCommission} />
        )}
        {currentView === 'board' && (
          <TaskBoard onSelectCommission={handleSelectCommission} />
        )}
      </main>

      {commissionArtwork && (
        <CommissionForm
          artwork={commissionArtwork}
          onClose={() => setCommissionArtwork(null)}
          onSuccess={handleCommissionSuccess}
        />
      )}

      {selectedCommissionId && (
        <DetailPanel
          commissionId={selectedCommissionId}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
