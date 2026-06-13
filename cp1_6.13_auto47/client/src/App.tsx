import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameState } from './game/types';
import { GameUI } from './ui/GameUI';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const menuAnimRef = useRef<number>(0);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [speedUpActive, setSpeedUpActive] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new GameEngine(canvasRef.current, {
      onScoreChange: setScore,
      onLivesChange: setLives,
      onGameOver: () => setGameState('gameover'),
      onSpeedUp: () => {
        setSpeedUpActive(true);
        setTimeout(() => setSpeedUpActive(false), 1000);
      },
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      cancelAnimationFrame(menuAnimRef.current);
    };
  }, []);

  useEffect(() => {
    if (gameState === 'menu' && engineRef.current) {
      const animateMenu = () => {
        if (gameState !== 'menu') return;
        engineRef.current?.drawMenuBackground();
        menuAnimRef.current = requestAnimationFrame(animateMenu);
      };
      animateMenu();
      return () => cancelAnimationFrame(menuAnimRef.current);
    }
  }, [gameState]);

  const handleStart = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    engineRef.current?.startGame();
  }, []);

  const handleRestart = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    engineRef.current?.startGame();
  }, []);

  const handleSubmitScore = useCallback((_name: string) => {
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          maxWidth: '100vw',
          maxHeight: '100vh',
        }}
      />
      <GameUI
        gameState={gameState}
        score={score}
        lives={lives}
        speedUpActive={speedUpActive}
        onStart={handleStart}
        onRestart={handleRestart}
        onSubmitScore={handleSubmitScore}
      />
    </div>
  );
};

export default App;
