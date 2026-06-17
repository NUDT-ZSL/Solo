import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import GameCanvas from './renderer/gameCanvas';
import UIPanel from './renderer/uiPanel';
import { useGameStore } from './store/gameStore';
import { generatePath, generateCheckpoints } from './gameEngine/pathManager';
import type { Point, Checkpoint } from './gameEngine/pathManager';

const App: React.FC = () => {
  const { addEnemy, updateGame } = useGameStore();

  const spawnTimerRef = useRef<number>(0);
  const pathRef = useRef<Point[]>(generatePath());
  const checkpointsRef = useRef<Checkpoint[]>([]);

  useEffect(() => {
    checkpointsRef.current = generateCheckpoints(pathRef.current);
  }, []);

  useEffect(() => {
    let animationId: number;
    let lastFrame = performance.now();

    const gameLoop = (currentTime: number) => {
      const deltaTime = Math.min(currentTime - lastFrame, 50);
      lastFrame = currentTime;

      const state = useGameStore.getState();
      if (!state.gameOver) {
        spawnTimerRef.current += deltaTime;
        if (spawnTimerRef.current >= 1500) {
          spawnTimerRef.current = 0;
          addEnemy();
        }

        updateGame(deltaTime, pathRef.current, checkpointsRef.current);
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => cancelAnimationFrame(animationId);
  }, [addEnemy, updateGame]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#0a0a0a',
        minHeight: '100vh',
        padding: 20,
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <UIPanel />
        <GameCanvas />
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
