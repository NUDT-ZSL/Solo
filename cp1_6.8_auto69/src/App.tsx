import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from './GameEngine';
import { UILayer } from './UILayer';
import { GameUIState } from './types';

const defaultState: GameUIState = {
  phase: 'countdown',
  countdown: 3,
  speed: 0,
  maxSpeed: 420,
  item: null,
  shieldActive: false,
  nitroActive: false,
  cooldown: 0,
  lap: 0,
  totalLaps: 3,
  rank: 1,
  rankings: [],
  elapsed: 0,
  result: null,
  track: [],
  vehicles: [],
};

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [uiState, setUiState] = useState<GameUIState>(defaultState);

  const handleRestart = useCallback(() => {
    engineRef.current?.restart();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const engine = new GameEngine(canvas, setUiState);
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.stop();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#0a0a0a' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      <UILayer state={uiState} onRestart={handleRestart} />
    </div>
  );
};
