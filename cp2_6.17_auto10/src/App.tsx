import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameBoard } from '@/components/GameBoard';
import { ScoreBoard } from '@/components/ScoreBoard';
import { gameEngine } from '@/GameEngine';
import { useGameLoop } from '@/hooks/useGameLoop';
import type { GameSnapshot } from '@/types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameSnapshot>(gameEngine.getState());
  const [isRunning, setIsRunning] = useState(true);
  const renderCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(0);
  const fpsRef = useRef(0);

  const update = useCallback((deltaTime: number) => {
    gameEngine.update(deltaTime);
  }, []);

  const render = useCallback(() => {
    setGameState(gameEngine.getState());

    renderCountRef.current++;
    const now = performance.now();
    if (now - lastFpsUpdateRef.current >= 1000) {
      fpsRef.current = renderCountRef.current;
      renderCountRef.current = 0;
      lastFpsUpdateRef.current = now;
    }
  }, []);

  const handleRenderComplete = useCallback(() => {
  }, []);

  useGameLoop(isRunning, update, render);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      gameEngine.handleKeyPress(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <GameBoard
        gameState={gameState}
        onRender={handleRenderComplete}
      />
      {gameState.gameState !== 'idle' && (
        <ScoreBoard gameState={gameState} />
      )}

      <div
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          fontSize: '12px',
          color: 'rgba(139, 115, 85, 0.5)',
          fontFamily: "'Noto Sans SC', sans-serif",
          zIndex: 100,
        }}
      >
        {fpsRef.current} FPS
      </div>
    </div>
  );
};

export default App;
