import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine, UIState } from './GameEngine';
import UILayer from './UILayer';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [uiState, setUIState] = useState<UIState>({
    score: 0,
    level: 1,
    treasuresCollected: 0,
    treasuresTotal: 0,
    exitUnlocked: false,
    gamePhase: 'playing',
    frequency: 'mid',
    intensity: 50,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (engineRef.current) {
        engineRef.current.onResize();
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const engine = new GameEngine(canvas, (state: UIState) => {
      setUIState({ ...state });
    });
    engineRef.current = engine;

    return () => {
      window.removeEventListener('resize', resize);
      engine.destroy();
    };
  }, []);

  const handleFrequencyChange = useCallback((freq: string) => {
    engineRef.current?.setFrequency(freq as 'low' | 'mid' | 'high');
  }, []);

  const handleIntensityChange = useCallback((val: number) => {
    engineRef.current?.setIntensity(val);
  }, []);

  const handleReset = useCallback(() => {
    engineRef.current?.resetLevel();
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block', cursor: 'crosshair' }} />
      <UILayer
        state={uiState}
        onFrequencyChange={handleFrequencyChange}
        onIntensityChange={handleIntensityChange}
        onReset={handleReset}
      />
    </div>
  );
};

export default App;
