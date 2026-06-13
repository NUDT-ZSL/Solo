import { useEffect, useRef, useCallback } from 'react';
import { GameCore, GameData } from '../game/core';
import { GameRenderer } from '../game/renderer';

interface GameCanvasProps {
  gameCore: GameCore;
  onGameUpdate: (data: GameData) => void;
  width?: number;
  height?: number;
}

export default function GameCanvas({
  gameCore,
  onGameUpdate,
  width = 800,
  height = 600,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const animationFrameRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.add(key);

      if (key === 'j') {
        gameCore.triggerAttack();
      }

      if (['w', 'a', 's', 'd', 'j'].includes(key)) {
        e.preventDefault();
      }
    },
    [gameCore]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    keysRef.current.delete(key);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    rendererRef.current = new GameRenderer(ctx, width, height);
    gameCore.start();

    const gameLoop = () => {
      const input = {
        up: keysRef.current.has('w'),
        down: keysRef.current.has('s'),
        left: keysRef.current.has('a'),
        right: keysRef.current.has('d'),
      };
      gameCore.setInput(input);

      const data = gameCore.update();

      if (rendererRef.current) {
        rendererRef.current.render(data);
      }

      onGameUpdate(data);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameCore, onGameUpdate, width, height]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.resize(width, height);
    }
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      tabIndex={0}
      style={{
        display: 'block',
        borderRadius: '8px',
      }}
    />
  );
}
