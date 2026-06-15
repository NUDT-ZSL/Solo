import React from 'react';
import ReactDOM from 'react-dom/client';
import { GameBoard } from './components/GameBoard';
import { StatusPanel } from './components/StatusPanel';
import { useGameEngine } from './hooks/useGameEngine';

function App() {
  const { gameState, movePlayer, restartGame } = useGameEngine();

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        padding: '16px',
        gap: '16px',
        overflow: 'hidden',
      }}
    >
      <GameBoard
        gameState={gameState}
        movePlayer={movePlayer}
        restartGame={restartGame}
      />
      <StatusPanel gameState={gameState} />
    </div>
  );
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
