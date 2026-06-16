import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, type Microbe } from '../engine/GameEngine';
import type { GameConfig } from '../services/api';

interface GameCanvasProps {
  width: number;
  height: number;
  config: GameConfig;
  onEngineReady?: (engine: GameEngine) => void;
}

export function GameCanvas({ width, height, config, onEngineReady }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const hoveredRef = useRef<Microbe | null>(null);
  const [, forceRender] = useState(0);

  const handleEngineReady = useCallback((engine: GameEngine) => {
    onEngineReady?.(engine);
  }, [onEngineReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const engine = new GameEngine(width, height, config);
    engineRef.current = engine;
    handleEngineReady(engine);

    let lastTime = performance.now();
    let animationId = 0;

    const loop = (time: number) => {
      const dt = Math.min(50, time - lastTime);
      lastTime = time;
      engine.update(dt);
      engine.render(ctx, hoveredRef.current);
      forceRender((n) => (n + 1) % 1000000);
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [width, height, config, handleEngineReady]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    hoveredRef.current = engineRef.current?.getMicrobeAt(x, y) ?? null;
  };

  const handleMouseLeave = () => {
    hoveredRef.current = null;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    engineRef.current?.addChemical(x, y, 'attractor');
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    engineRef.current?.addChemical(x, y, 'repellent');
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="game-canvas"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      style={{ cursor: 'crosshair' }}
    />
  );
}
