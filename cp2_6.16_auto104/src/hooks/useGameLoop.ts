import { useRef, useEffect, useCallback } from 'react';
import { Player, Platform, Spike, GameSwitch, TimeClone, playCrashSound } from '../game/entities';
import { Recorder } from '../game/recorder';
import { Renderer } from '../game/renderer';

interface LevelData {
  platforms: { x: number; y: number; width: number; height: number; movable?: boolean }[];
  spikes: { x: number; y: number }[];
  switches: { x: number; y: number; targetPlatformIndex: number }[];
  start: { x: number; y: number };
  goal: { x: number; y: number };
  worldWidth: number;
  worldHeight: number;
}

interface GameState {
  isRunning: boolean;
  cloneRemainingTime: number;
  hasActiveClone: boolean;
}

export function useGameLoop(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  levelData: LevelData | null,
  onLevelComplete: () => void,
  onReset: () => void
) {
  const playerRef = useRef<Player | null>(null);
  const platformsRef = useRef<Platform[]>([]);
  const spikesRef = useRef<Spike[]>([]);
  const switchesRef = useRef<GameSwitch[]>([]);
  const clonesRef = useRef<TimeClone[]>([]);
  const recorderRef = useRef<Recorder | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const gameStateRef = useRef<GameState>({
    isRunning: true,
    cloneRemainingTime: 0,
    hasActiveClone: false
  });

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const gameTimeRef = useRef<number>(0);
  const fpsTimeRef = useRef<number>(0);
  const fpsCountRef = useRef<number>(0);
  const fpsWarningShownRef = useRef<boolean>(false);

  const rPressedRef = useRef<boolean>(false);

  const initGame = useCallback(() => {
    if (!levelData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    playerRef.current = new Player(levelData.start.x, levelData.start.y);

    platformsRef.current = levelData.platforms.map(
      p => new Platform(p.x, p.y, p.width, p.height, p.movable || false)
    );

    spikesRef.current = levelData.spikes.map(s => new Spike(s.x, s.y));

    switchesRef.current = levelData.switches.map(
      s => new GameSwitch(s.x, s.y, s.targetPlatformIndex)
    );

    clonesRef.current = [];

    recorderRef.current = new Recorder();

    rendererRef.current = new Renderer(ctx, levelData.worldWidth, levelData.worldHeight);

    gameStateRef.current = {
      isRunning: true,
      cloneRemainingTime: 0,
      hasActiveClone: false
    };

    gameTimeRef.current = 0;
    fpsTimeRef.current = performance.now();
    fpsCountRef.current = 0;
    fpsWarningShownRef.current = false;
  }, [levelData]);

  const spawnClone = useCallback(() => {
    if (!playerRef.current || !recorderRef.current) return;

    const frames = recorderRef.current.getLast3Seconds();
    if (frames.length === 0) return;

    const clone = new TimeClone(
      frames,
      playerRef.current.x,
      playerRef.current.y
    );

    clonesRef.current.push(clone);

    gameStateRef.current.hasActiveClone = true;
    gameStateRef.current.cloneRemainingTime = 6;
  }, []);

  const resetLevel = useCallback(() => {
    if (levelData) {
      playerRef.current?.reset(levelData.start.x, levelData.start.y);
      platformsRef.current.forEach(p => p.reset());
      switchesRef.current.forEach(s => s.reset());
      clonesRef.current = [];
      recorderRef.current?.clear();
      rendererRef.current?.resetCamera();
      gameStateRef.current.hasActiveClone = false;
      gameStateRef.current.cloneRemainingTime = 0;
      gameStateRef.current.isRunning = true;
      onReset();
    }
  }, [levelData, onReset]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.add(key);

      if (key === 'r' && !rPressedRef.current) {
        rPressedRef.current = true;
        spawnClone();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.delete(key);

      if (key === 'r') {
        rPressedRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spawnClone]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    if (!levelData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const gameLoop = (currentTime: number) => {
      if (!running) return;

      const dt = Math.min((currentTime - lastTimeRef.current) / 1000, 1/30);
      lastTimeRef.current = currentTime;

      fpsCountRef.current++;
      if (currentTime - fpsTimeRef.current >= 1000) {
        const fps = fpsCountRef.current;
        if (fps < 45 && !fpsWarningShownRef.current) {
          console.warn(`Low FPS: ${fps}`);
          fpsWarningShownRef.current = true;
          rendererRef.current?.setLowPerformanceMode(true);
        } else if (fps >= 45) {
          fpsWarningShownRef.current = false;
          rendererRef.current?.setLowPerformanceMode(false);
        }
        fpsCountRef.current = 0;
        fpsTimeRef.current = currentTime;
      }

      if (gameStateRef.current.isRunning) {
        gameTimeRef.current += dt;

        if (playerRef.current) {
          playerRef.current.update(dt, keysRef.current);
          playerRef.current.applyGravity(dt);
          playerRef.current.checkCollision(platformsRef.current);

          if (playerRef.current.checkSpikeCollision(spikesRef.current)) {
            resetLevel();
          }

          playerRef.current.checkSwitchCollision(switchesRef.current, platformsRef.current);

          if (playerRef.current.y > levelData.worldHeight) {
            resetLevel();
          }

          if (playerRef.current.x < 0) {
            playerRef.current.x = 0;
          }
          if (playerRef.current.x + playerRef.current.width > levelData.worldWidth) {
            playerRef.current.x = levelData.worldWidth - playerRef.current.width;
          }

          if (playerRef.current.checkGoal(levelData.goal)) {
            gameStateRef.current.isRunning = false;
            onLevelComplete();
          }

          recorderRef.current?.recordFrame(playerRef.current);
        }

        clonesRef.current = clonesRef.current.filter(clone => {
          const alive = clone.update(dt);

          if (alive && !clone.dissipating) {
            if (clone.checkSpikeCollision(spikesRef.current)) {
              playCrashSound();
            }
            clone.checkSwitchCollision(switchesRef.current, platformsRef.current);
          }

          if (!alive && !clone.dissipating) {
            clone.startDissipate();
            gameStateRef.current.hasActiveClone = false;
            gameStateRef.current.cloneRemainingTime = 0;
            return true;
          }

          if (clone.dissipating && clone.particles.length === 0) {
            return false;
          }

          return alive || clone.dissipating;
        });

        if (gameStateRef.current.hasActiveClone) {
          gameStateRef.current.cloneRemainingTime = Math.max(0, gameStateRef.current.cloneRemainingTime - dt);
          if (gameStateRef.current.cloneRemainingTime <= 0) {
            gameStateRef.current.hasActiveClone = false;
          }
        }

        rendererRef.current?.updateCamera(
          playerRef.current?.x || 0,
          playerRef.current?.y || 0
        );

        rendererRef.current?.render(
          dt,
          playerRef.current!,
          platformsRef.current,
          spikesRef.current,
          switchesRef.current,
          clonesRef.current,
          levelData.goal,
          gameTimeRef.current
        );
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      running = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [levelData, onLevelComplete, resetLevel]);

  const getGameState = useCallback(() => {
    return {
      cloneRemainingTime: gameStateRef.current.cloneRemainingTime,
      hasActiveClone: gameStateRef.current.hasActiveClone,
      isRunning: gameStateRef.current.isRunning
    };
  }, []);

  return { getGameState, resetLevel };
}
