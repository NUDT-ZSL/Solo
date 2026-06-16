import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GameEngine } from '../game/GameEngine';
import type { GameState, InputState } from '../game/types';

interface GameContextType {
  gameState: GameState | null;
  engine: GameEngine | null;
  setInput: (input: Partial<InputState>) => void;
}

const GameContext = createContext<GameContextType | null>(null);

function deepCloneState(state: GameState): GameState {
  return {
    ...state,
    player: { ...state.player },
    enemies: state.enemies.map(e => ({ ...e, patrolPoints: [...e.patrolPoints] })),
    map: {
      ...state.map,
      rooms: [...state.map.rooms],
      corridors: [...state.map.corridors],
      walls: [...state.map.walls],
      floorTiles: [...state.map.floorTiles],
      mushrooms: state.map.mushrooms.map(m => ({ ...m })),
      torches: state.map.torches.map(t => ({ ...t })),
      potions: state.map.potions.map(p => ({ ...p })),
      isWall: state.map.isWall,
      isFloor: state.map.isFloor,
    },
    lightSources: state.lightSources.map(l => ({ ...l })),
    screenEffect: { ...state.screenEffect },
  };
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const throttleMs = 16;

  useEffect(() => {
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }

    const engine = new GameEngine(offscreenCanvasRef.current);
    engineRef.current = engine;

    const unsubscribe = engine.subscribe((state) => {
      const now = performance.now();
      if (now - lastUpdateRef.current >= throttleMs) {
        lastUpdateRef.current = now;
        setGameState(deepCloneState(state));
      }
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

  const contextValue = useMemo(() => ({
    gameState,
    engine: engineRef.current,
    setInput,
  }), [gameState, setInput]);

  return React.createElement(
    GameContext.Provider,
    { value: contextValue },
    children
  );
}

export function useGameState() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return context;
}
