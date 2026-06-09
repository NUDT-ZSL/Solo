import { useEffect, useRef } from 'react';
import { initGame, updateGame, drawGame, handleInput } from './gameEngine';
import type { GameState } from './types';

const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const w = Math.max(window.innerWidth, MIN_WIDTH);
      const h = Math.max(window.innerHeight, MIN_HEIGHT);
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (gameStateRef.current) {
        gameStateRef.current.canvasWidth = w;
        gameStateRef.current.canvasHeight = h;
        const trackMargin = 120;
        gameStateRef.current.trackX1 = trackMargin;
        gameStateRef.current.trackX2 = w - trackMargin;
      } else {
        gameStateRef.current = initGame(w, h);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const getCanvasCoords = (e: MouseEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const onMouseDown = (e: MouseEvent) => {
      if (!gameStateRef.current) return;
      const coords = getCanvasCoords(e);
      handleInput(gameStateRef.current, 'mousedown', coords);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!gameStateRef.current) return;
      const coords = getCanvasCoords(e);
      handleInput(gameStateRef.current, 'mousemove', coords);
    };
    const onMouseUp = () => {
      if (!gameStateRef.current) return;
      handleInput(gameStateRef.current, 'mouseup', {});
    };
    const onMouseLeave = () => {
      if (!gameStateRef.current) return;
      handleInput(gameStateRef.current, 'mouseleave', {});
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!gameStateRef.current) return;
      if (e.key === ' ' || e.key === 'Space') e.preventDefault();
      handleInput(gameStateRef.current, 'keydown', { key: e.key });
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('keydown', onKeyDown);

    lastTimeRef.current = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(now - lastTimeRef.current, 50);
      lastTimeRef.current = now;
      if (gameStateRef.current) {
        updateGame(gameStateRef.current, dt);
        drawGame(ctx, gameStateRef.current);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('keydown', onKeyDown);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0A0A1A',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          cursor: 'crosshair',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}
