import { useRef, useEffect, useCallback } from 'react';
import { GameEngine } from '@/engine/GameEngine';
import { useGameStore } from '@/store/gameStore';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const setCanvasSize = useGameStore((s) => s.setCanvasSize);
  const updateFromEngine = useGameStore((s) => s.updateFromEngine);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth;
    const h = parent.clientHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    setCanvasSize({ width: w, height: h });

    if (engineRef.current) {
      engineRef.current.resize(w, h);
    }
  }, [setCanvasSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const engine = new GameEngine();
    engineRef.current = engine;

    handleResize();
    engine.init(ctx, canvas.clientWidth, canvas.clientHeight);
    engine.setOnStateChange(updateFromEngine);
    engine.start();

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      engine.handleKeyDown(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      engine.handleKeyUp(e.code);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', handleResize);

    return () => {
      engine.stop();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize, updateFromEngine]);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full"
    />
  );
}
