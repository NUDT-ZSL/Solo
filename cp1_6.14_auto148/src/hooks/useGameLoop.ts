import { useEffect, useRef, useState, useCallback } from 'react';
import { PhysicsEngine } from '../PhysicsEngine';
import { GameRenderer } from '../GameRenderer';
import { InputManager } from '../InputManager';
import { NetworkManager } from '../NetworkManager';
import type { PhysicsState } from '../PhysicsEngine';
import type { OpponentState } from '../NetworkManager';

export interface GameLoopState {
  isRunning: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  currentState: PhysicsState | null;
  opponents: OpponentState[];
}

export interface UseGameLoopReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  minimapRef: React.RefObject<HTMLCanvasElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  state: GameLoopState;
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
}

export function useGameLoop(): UseGameLoopReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const physicsRef = useRef<PhysicsEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  const networkRef = useRef<NetworkManager | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const physicsAccumulatorRef = useRef<number>(0);
  const PHYSICS_STEP = 1000 / 60;

  const [gameState, setGameState] = useState<GameLoopState>({
    isRunning: false,
    isPaused: false,
    isGameOver: false,
    currentState: null,
    opponents: [],
  });

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const opponentsRef = useRef<OpponentState[]>([]);
  const wasBrakingRef = useRef<boolean>(false);

  const initIfNeeded = useCallback(() => {
    if (!canvasRef.current) return false;
    if (physicsRef.current && rendererRef.current && inputRef.current && networkRef.current) {
      return true;
    }

    physicsRef.current = new PhysicsEngine('player');
    rendererRef.current = new GameRenderer(canvasRef.current);
    inputRef.current = new InputManager();
    networkRef.current = new NetworkManager();

    if (minimapRef.current) {
      rendererRef.current.setMinimapCanvas(minimapRef.current);
    }

    inputRef.current.attach(canvasRef.current);

    networkRef.current.on('OpponentUpdate', (opps: OpponentState[]) => {
      opponentsRef.current = opps;
      if (rendererRef.current) {
        rendererRef.current.setOpponents(opps);
      }
      setGameState((prev) => ({ ...prev, opponents: opps }));
    });

    networkRef.current.connect();

    const handleResize = () => {
      rendererRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return true;
  }, []);

  const gameLoop = useCallback((timestamp: number) => {
    if (!physicsRef.current || !rendererRef.current || !inputRef.current || !networkRef.current) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    if (gameStateRef.current.isPaused || !gameStateRef.current.isRunning) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    let deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    if (deltaTime > 100) {
      deltaTime = PHYSICS_STEP;
    }

    physicsAccumulatorRef.current += deltaTime;
    const input = inputRef.current.getInput();

    let latestState: PhysicsState | null = null;
    while (physicsAccumulatorRef.current >= PHYSICS_STEP) {
      latestState = physicsRef.current.update(PHYSICS_STEP, input);
      networkRef.current.updateAI(PHYSICS_STEP, latestState);
      physicsAccumulatorRef.current -= PHYSICS_STEP;

      rendererRef.current.checkCollisions(latestState, (otherX, otherY) => {
        physicsRef.current?.resolveCollision(otherX, otherY);
        rendererRef.current?.triggerEffect({ type: 'flash', duration: 300, intensity: 1 });
        rendererRef.current?.triggerEffect({ type: 'shake', duration: 200, intensity: 2 });
      });

      if (latestState.lap > latestState.totalLaps) {
        setGameState((prev) => ({
          ...prev,
          isRunning: false,
          isGameOver: true,
          currentState: latestState,
        }));
        return;
      }
    }

    if (latestState) {
      rendererRef.current.update(deltaTime, latestState);
      rendererRef.current.render(latestState);
      setGameState((prev) => ({ ...prev, currentState: latestState }));

      if (input.brake && latestState.speed > 25) {
        if (!wasBrakingRef.current) {
          rendererRef.current.triggerEffect({ type: 'tilt', duration: 500, intensity: 1 });
        }
      }
      wasBrakingRef.current = input.brake;
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, []);

  const start = useCallback(() => {
    if (!initIfNeeded()) return;

    physicsRef.current?.reset();
    rendererRef.current?.clearEffects();
    setGameState({
      isRunning: true,
      isPaused: false,
      isGameOver: false,
      currentState: physicsRef.current?.getState() || null,
      opponents: [],
    });

    lastTimeRef.current = performance.now();
    physicsAccumulatorRef.current = 0;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [initIfNeeded, gameLoop]);

  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setGameState((prev) => ({ ...prev, isRunning: false }));
  }, []);

  const pause = useCallback(() => {
    setGameState((prev) => ({ ...prev, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    setGameState((prev) => ({ ...prev, isPaused: false }));
    lastTimeRef.current = performance.now();
  }, []);

  const restart = useCallback(() => {
    stop();
    setTimeout(() => {
      start();
    }, 50);
  }, [stop, start]);

  useEffect(() => {
    const setup = () => {
      if (!canvasRef.current) return;
      initIfNeeded();
      rendererRef.current?.resize();
    };

    setup();

    const timeout = setTimeout(setup, 100);

    return () => {
      clearTimeout(timeout);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      inputRef.current?.detach();
      networkRef.current?.disconnect();
      window.removeEventListener('resize', () => rendererRef.current?.resize());
    };
  }, [initIfNeeded]);

  useEffect(() => {
    if (minimapRef.current && rendererRef.current) {
      rendererRef.current.setMinimapCanvas(minimapRef.current);
    }
  }, [minimapRef, canvasRef]);

  return {
    canvasRef,
    minimapRef,
    containerRef,
    state: gameState,
    start,
    stop,
    pause,
    resume,
    restart,
  };
}
