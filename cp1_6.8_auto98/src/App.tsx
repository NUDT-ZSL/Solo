import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine, GameState } from './GameEngine';
import { UILayer } from './UILayer';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('menu');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [darts, setDarts] = useState(30);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [comboFlash, setComboFlash] = useState(0);
  const [screenShake, setScreenShake] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, {
      onStateChange: (s) => setGameState(s),
      onScoreChange: (s) => setScore(s),
      onComboChange: (c) => setCombo(c),
      onDartsChange: (d) => setDarts(d),
      onTimeChange: (r) => setTimeRemaining(r),
      onComboFlash: () => setComboFlash((p) => p + 1),
      onScreenShake: () => setScreenShake((p) => p + 1),
    });

    engineRef.current = engine;

    const handleResize = () => {
      engine.resize(window.innerWidth, window.innerHeight);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    engine.startLoop();

    return () => {
      engine.stopLoop();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleInteraction = useCallback(
    (clientX: number, clientY: number) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (gameState === 'menu' || gameState === 'gameover') {
        engine.handleMenuClick(clientX, clientY);
        return;
      }

      if (gameState === 'playing') {
        engine.launchDart(clientX, clientY);
      }
    },
    [gameState]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      handleInteraction(e.clientX, e.clientY);
    },
    [handleInteraction]
  );

  const handleTouch = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        handleInteraction(touch.clientX, touch.clientY);
      }
    },
    [handleInteraction]
  );

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        cursor: gameState === 'playing' ? 'crosshair' : 'pointer',
        background: '#0a0402',
      }}
      onClick={handleClick}
      onTouchStart={handleTouch}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
      <UILayer
        score={score}
        combo={combo}
        darts={darts}
        timeRemaining={timeRemaining}
        totalTime={60}
        gameState={gameState}
        comboFlash={comboFlash}
        screenShake={screenShake}
      />
    </div>
  );
};

export default App;
