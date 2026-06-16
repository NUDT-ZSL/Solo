import { useEffect, useRef, useState } from 'react';
import { GameEngine, type Microbe, type ChemicalType } from '../engine/GameEngine';
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
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [, forceRender] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const engine = new GameEngine(width, height, config);
    engineRef.current = engine;
    onEngineReady?.(engine);

    let lastTime = performance.now();
    let animationId = 0;

    const loop = (time: number) => {
      const dt = Math.min(50, time - lastTime);
      lastTime = time;
      engine.update(dt);
      engine.render(ctx, hoveredRef.current, mousePosRef.current.x, mousePosRef.current.y);
      forceRender((n) => n + 1);
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [width, height, config, onEngineReady]);

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
    mousePosRef.current = { x, y };
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

  void ChemicalType;

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
