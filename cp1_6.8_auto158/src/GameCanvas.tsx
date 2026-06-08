import { useRef, useEffect, useCallback } from 'react';
import { GameEngine } from './GameEngine';

interface GameCanvasProps {
  engineRef: React.MutableRefObject<GameEngine | null>;
}

export default function GameCanvas({ engineRef }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new GameEngine();
    engine.init(canvasRef.current);
    engine.start();
    engineRef.current = engine;

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      engine.stop();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    engineRef.current?.handlePointerDown(e.clientX, e.clientY);
  }, [engineRef]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    engineRef.current?.handlePointerMove(e.clientX, e.clientY);
  }, [engineRef]);

  const handlePointerUp = useCallback(() => {
    engineRef.current?.handlePointerUp();
  }, [engineRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ cursor: 'grab' }}
    />
  );
}
