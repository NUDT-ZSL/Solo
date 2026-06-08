import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine, GameState } from './GameEngine';
import UILayer from './UILayer';

const defaultState: GameState = {
  score: 0,
  timeLeft: 90,
  energyBalls: 15,
  maxEnergyBalls: 15,
  isGameOver: false,
  isStarted: false,
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>(defaultState);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine();
    engineRef.current = engine;
    engine.onStateChange(setGameState);
    engine.init(canvasRef.current);
    engine.start();

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.destroy();
    };
  }, []);

  const handleReset = useCallback(() => {
    engineRef.current?.reset();
  }, []);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: '#000',
  };

  const canvasStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    height: '100%',
    cursor: 'crosshair',
  };

  return (
    <div style={containerStyle}>
      <canvas ref={canvasRef} style={canvasStyle} />
      <UILayer state={gameState} onReset={handleReset} />
    </div>
  );
};

export default App;
