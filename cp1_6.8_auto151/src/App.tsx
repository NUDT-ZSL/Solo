import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from './GameEngine';
import { BoardRenderer } from './BoardRenderer';
import { PlayerManager, PlayerState } from './PlayerManager';
import { UILayer } from './UILayer';

const initialState: PlayerState = {
  currentPlayer: 'blue',
  turn: 1,
  bluePieceCount: 0,
  orangePieceCount: 0,
  blueRemaining: 10,
  orangeRemaining: 10,
  selectedPiece: null,
  isGameOver: false,
  winner: null,
};

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<BoardRenderer | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const playerManagerRef = useRef<PlayerManager | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [state, setState] = useState<PlayerState>(initialState);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine();
    const renderer = new BoardRenderer(canvas);
    const pm = new PlayerManager(engine, renderer);

    engineRef.current = engine;
    rendererRef.current = renderer;
    playerManagerRef.current = pm;

    pm.setOnStateChange((newState) => {
      setState(newState);
    });

    setState(pm.getState());

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      const pieces = Array.from(engine.pieces.values());
      const selectedId = pm.getSelectedPieceId();
      renderer.render(pieces, dt, selectedId);

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      renderer.destroy();
    };
  }, []);

  const handleReset = useCallback(() => {
    playerManagerRef.current?.resetGame();
    setState(playerManagerRef.current?.getState() || initialState);
  }, []);

  const handleEndTurn = useCallback(() => {
    playerManagerRef.current?.endTurn();
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
      <UILayer state={state} onReset={handleReset} onEndTurn={handleEndTurn} />
    </div>
  );
};
