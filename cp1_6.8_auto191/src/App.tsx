import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine, GameState } from './GameEngine';
import UILayer from './UILayer';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    orbCount: 0,
    teleportCharges: 0,
    isGameOver: false,
    isPaused: false,
  });

  const handleReset = useCallback(() => {
    engineRef.current?.reset();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const engine = new GameEngine(canvas);
    engineRef.current = engine;

    engine.onStateChange((state) => {
      setGameState({ ...state });
    });

    engine.start();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      engine.resize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      engine.stop();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
      <UILayer gameState={gameState} onReset={handleReset} />
    </div>
  );
};

export default App;
