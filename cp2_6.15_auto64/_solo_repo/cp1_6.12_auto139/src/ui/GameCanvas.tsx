import { useEffect, useRef, useCallback } from 'react';
import { GameEngine, EngineStats } from '../game/GameEngine';
import { WorldManager } from '../game/WorldManager';
import { PlayerController } from '../game/PlayerController';

type ReactMouseEvent = React.MouseEvent<HTMLCanvasElement>;

interface GameCanvasProps {
  world: WorldManager;
  player: PlayerController;
  onEngineReady: (engine: GameEngine) => void;
  onStatsUpdate: (stats: EngineStats) => void;
  currentBlock: number;
  showGrid: boolean;
}

export default function GameCanvas({
  world,
  player,
  onEngineReady,
  onStatsUpdate,
  currentBlock,
  showGrid,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: ReactMouseEvent) => {
    if (engineRef.current) {
      engineRef.current.handleMouseMove(e.clientX, e.clientY);
    }
  }, []);

  const handleMouseDown = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    if (engineRef.current) {
      engineRef.current.handleMouseDown(e.button, e.clientX, e.clientY);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.handleMouseUp();
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.handleMouseLeave();
    }
  }, []);

  const handleContextMenu = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (engineRef.current) {
      engineRef.current.handleKeyDown(e.key);
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (engineRef.current) {
      engineRef.current.handleKeyUp(e.key);
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, world, player, 32);
    engine.setStatsCallback(onStatsUpdate);
    engine.setCurrentBlock(currentBlock);
    engine.setShowGrid(showGrid);
    engineRef.current = engine;
    onEngineReady(engine);

    engine.start();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      engine.stop();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [world, player, onEngineReady, onStatsUpdate, handleKeyDown, handleKeyUp]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setCurrentBlock(currentBlock);
    }
  }, [currentBlock]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setShowGrid(showGrid);
    }
  }, [showGrid]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          border: '4px solid #2d2d3f',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
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
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleContextMenu}
        />
      </div>
    </div>
  );
}
