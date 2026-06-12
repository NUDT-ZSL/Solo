import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { GameProvider, useGame } from './context/GameContext';
import GalleryPage from './components/GalleryPage';
import BattlePage from './components/BattlePage';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const { progress } = useGame();

  useEffect(() => {
    if (!localStorage.getItem('nature_codex_onboarded')) {
      localStorage.setItem('nature_codex_onboarded', 'true');
    }
  }, []);

  return (
    <div style={appContainerStyle}>
      <Routes>
        <Route path="/" element={<GalleryPage />} />
        <Route path="/battle" element={<BattlePage />} />
      </Routes>
    </div>
  );
};

const appContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: 'linear-gradient(0deg, #16213e 0%, #0f3460 100%)',
  overflow: 'auto',
  position: 'relative'
};

const App: React.FC = () => {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
};

export default App;
