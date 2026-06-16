import React, { useState } from 'react';
import { GamePhase } from '../types';
import MainMenu from './components/MainMenu';
import GameBoard from './GameBoard';
import Leaderboard from './components/Leaderboard';

const App: React.FC = () => {
  const [gamePhase, setGamePhase] = useState<GamePhase>('menu');

  const handleStart = () => {
    setGamePhase('playing');
  };

  const handleBackToMenu = () => {
    setGamePhase('menu');
  };

  const handleViewLeaderboard = () => {
    setGamePhase('leaderboard');
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {gamePhase === 'menu' && (
        <MainMenu
          onStart={handleStart}
          onLeaderboard={handleViewLeaderboard}
        />
      )}
      {(gamePhase === 'playing' || gamePhase === 'battle' || gamePhase === 'victory' || gamePhase === 'defeat') && (
        <GameBoard
          onBackToMenu={handleBackToMenu}
          onViewLeaderboard={handleViewLeaderboard}
        />
      )}
      {gamePhase === 'leaderboard' && (
        <Leaderboard onBack={handleBackToMenu} />
      )}
    </div>
  );
};

export default App;
