import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine, GameSnapshot } from './GameEngine';
import { UILayer } from './UILayer';

const containerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
  background: '#f5f0e1',
};

const canvasStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  height: '100%',
  cursor: 'grab',
};

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot>({
    state: 'menu',
    score: 0,
    highScore: 0,
    energy: 0,
    maxEnergy: 100,
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine();
    engineRef.current = engine;

    engine.init(canvasRef.current, (snap) => {
      setSnapshot(snap);
    });

    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleRestart = useCallback(() => {
    engineRef.current?.startGame();
  }, []);

  return (
    <div style={containerStyle}>
      <canvas ref={canvasRef} style={canvasStyle} />
      <UILayer snapshot={snapshot} onRestart={handleRestart} />
    </div>
  );
};
