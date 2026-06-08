import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { GameEngine } from './GameEngine';
import UILayer from './UILayer';
import { TOTAL_CONSTELLATIONS } from './ConstellationUnlocker';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [collected, setCollected] = useState(0);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [justUnlockedName, setJustUnlockedName] = useState<string | null>(null);
  const unlockTimerRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, {
      onCollect: (count) => {
        setCollected(count);
        setUnlockedCount(engine.getUnlockCount());
        setCompletedCount(engine.getCompletedCount());
      },
      onUnlock: (idx) => {
        const names = ['北斗', '仙后', '天琴', '天鹰', '织女'];
        const name = names[idx] || `星座${idx + 1}`;
        setJustUnlockedName(name);
        setUnlockedCount(engine.getUnlockCount());
        setCompletedCount(engine.getCompletedCount());
        if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
        unlockTimerRef.current = window.setTimeout(() => {
          setJustUnlockedName(null);
        }, 2200);
      },
      onComplete: () => {
        setGameComplete(true);
        setCompletedCount(TOTAL_CONSTELLATIONS);
      },
    });

    engineRef.current = engine;
    engine.start();

    return () => {
      engine.stop();
    };
  }, []);

  const handleReset = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.reset();
    setCollected(0);
    setUnlockedCount(0);
    setCompletedCount(0);
    setGameComplete(false);
    setJustUnlockedName(null);
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'crosshair',
        }}
      />
      <UILayer
        collected={collected}
        unlockedCount={unlockedCount}
        completedCount={completedCount}
        gameComplete={gameComplete}
        onReset={handleReset}
        justUnlockedName={justUnlockedName}
      />
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
