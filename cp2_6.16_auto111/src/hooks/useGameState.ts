import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../game/GameEngine';
import type { GameState, InputState } from '../game/types';

interface GameContextType {
  gameState: GameState | null;
  engine: GameEngine | null;
  setInput: (input: Partial<InputState>) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    const unsubscribe = engine.subscribe((state) => {
      setGameState({ ...state });
    });

    engine.start();

    return () => {
      unsubscribe();
      engine.stop();
    };
  }, []);

  const setInput = useCallback((input: Partial<InputState>) => {
    if (engineRef.current) {
      engineRef.current.setInput(input);
    }
  }, []);

  return (
    <GameContext.Provider value={{ gameState, engine: engineRef.current, setInput }}>
      <div ref={(el) => { canvasRef.current = el; }} style={{ display: 'none' }} />
      {children}
    </GameContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return context;
}
