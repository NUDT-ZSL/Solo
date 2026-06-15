import { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, GamePhase } from '../game/types';
import {
  createInitialState,
  tryMovePlayer,
  cleanupFloatingTexts,
  clearEffects,
} from '../game/gameEngine';

export function useGameEngine() {
  const [gameState, setGameState] = useState<GameState>(() => createInitialState());
  const effectTimers = useRef<Record<string, number | null>>({});

  const restartGame = useCallback(() => {
    setGameState(createInitialState());
    Object.values(effectTimers.current).forEach((t) => {
      if (t) window.clearTimeout(t);
    });
    effectTimers.current = {};
  }, []);

  const movePlayer = useCallback((dx: number, dy: number) => {
    setGameState((prev) => {
      if (prev.phase !== GamePhase.EXPLORING && prev.phase !== GamePhase.BOSS) {
        return prev;
      }
      const next = tryMovePlayer(prev, dx, dy);
      if (next !== prev) {
        if (next.isShaking && !effectTimers.current.shake) {
          effectTimers.current.shake = window.setTimeout(() => {
            setGameState((s) => clearEffects(s));
            effectTimers.current.shake = null;
          }, 200);
        }
        if (next.isBossSpecialAttack && !effectTimers.current.special) {
          effectTimers.current.special = window.setTimeout(() => {
            setGameState((s) => ({ ...s, isBossSpecialAttack: false }));
            effectTimers.current.special = null;
          }, 400);
        }
        if (next.monsters.some((m) => m.isBlinking) && !effectTimers.current.blink) {
          effectTimers.current.blink = window.setTimeout(() => {
            setGameState((s) => ({
              ...s,
              monsters: s.monsters.map((m) => ({ ...m, isBlinking: false })),
            }));
            effectTimers.current.blink = null;
          }, 300);
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setGameState((prev) => cleanupFloatingTexts(prev));
    }, 100);
    return () => window.clearInterval(interval);
  }, []);

  return {
    gameState,
    movePlayer,
    restartGame,
  };
}
