import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine, LEVELS } from './GameEngine';
import { GameState, Level } from './types';
import { UILayer } from './UILayer';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    currentLevelIndex: 0,
    steps: 0,
    isLevelComplete: false,
    isGameComplete: false,
    isShowingHint: false,
    lightSegments: [],
    particles: [],
    lightWaves: [],
    time: 0,
    levelCompleteTime: 0,
    score: [],
  });
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    engine.setOnStateChange(() => {
      setGameState({ ...engine.getState() });
      setCurrentLevel(engine.getCurrentLevel());
    });

    engine.start();

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      engine.stop();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleReset = useCallback(() => {
    engineRef.current?.reset();
  }, []);

  const handleHint = useCallback(() => {
    engineRef.current?.toggleHint();
  }, []);

  const handleNextLevel = useCallback(() => {
    engineRef.current?.nextLevel();
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: 'default',
        }}
      />
      <UILayer
        state={gameState}
        level={currentLevel}
        onReset={handleReset}
        onHint={handleHint}
        onNextLevel={handleNextLevel}
      />
    </div>
  );
};

export default App;
