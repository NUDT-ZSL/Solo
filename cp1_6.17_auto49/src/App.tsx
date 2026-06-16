import React from 'react';
import { useDataStore } from './modules/data/DataStore';
import { Navigation } from './modules/navigation/Navigation';
import { MapScene } from './modules/map/MapScene';
import { Register } from './modules/register/Register';
import { Portfolio } from './modules/portfolio/Portfolio';
import { UserReport } from './modules/report/UserReport';

const App: React.FC = () => {
  const { currentPage, setCurrentPage, userName, currentMusicianId } = useDataStore();

  if (!userName || currentPage === 'register') {
    return <Register />;
  }

  if (!currentMusicianId) {
    return <Register />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'map':
        return <MapScene />;
      case 'portfolio':
        return <Portfolio />;
      case 'report':
        return <UserReport />;
      default:
        return <MapScene />;
    }
  };

  return (
    <div className="app">
      <Navigation currentPage={currentPage as 'map' | 'portfolio' | 'report'} onNavigate={setCurrentPage} />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
};

export default App;
