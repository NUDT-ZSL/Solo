import { useRef, useEffect, useCallback } from 'react';
import { GameEngine } from './GameEngine';
import { UILayer } from './UILayer';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new GameEngine();
    engine.init(canvasRef.current);
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleReset = useCallback(() => {
    engineRef.current?.resetGrid();
  }, []);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: 'crosshair' }}
      />
      <UILayer onReset={handleReset} />
    </div>
  );
}
