import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameState } from './GameEngine';
import UILayer from './UILayer';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    currentLevel: 1,
    totalLevels: 3,
    levelName: '',
    steps: 0,
    isCompleted: false,
    isLevelComplete: false,
    playerGridPos: { x: 0, y: 0, z: 0 },
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    const unsubscribe = engine.onStateChange((state) => {
      setGameState({ ...state });
    });

    engine.start();

    return () => {
      unsubscribe();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleReset = useCallback(() => {
    engineRef.current?.resetLevel();
  }, []);

  const handleNextLevel = useCallback(() => {
    engineRef.current?.nextLevel();
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
      <UILayer
        gameState={gameState}
        onReset={handleReset}
        onNextLevel={handleNextLevel}
      />
    </div>
  );
};

export default App;
