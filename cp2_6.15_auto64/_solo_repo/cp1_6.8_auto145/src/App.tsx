import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  GameState,
  LEVELS,
  CELL_SIZE,
  createGameState,
  updateGameState,
  rotateMirror,
  selectMirrorAtPos,
  gridToPixel,
} from './GameEngine';
import { MirrorManager } from './MirrorManager';
import { LaserRenderer } from './LaserRenderer';
import { UILayer } from './UILayer';

let audioCtx: AudioContext | null = null;

function playVictorySound() {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    const ctx = audioCtx;

    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    osc1.frequency.setValueAtTime(659.25, now + 0.12);
    osc1.frequency.setValueAtTime(783.99, now + 0.24);
    osc1.frequency.setValueAtTime(1046.5, now + 0.36);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.8);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1046.5, now + 0.36);
    osc2.frequency.exponentialRampToValueAtTime(1568, now + 0.6);
    gain2.gain.setValueAtTime(0.12, now + 0.36);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.36);
    osc2.stop(now + 1.2);

    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(2093, now + 0.5);
    gain3.gain.setValueAtTime(0.06, now + 0.5);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.5);
    osc3.stop(now + 1.5);
  } catch (_e) {
    // audio not available
  }
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const mirrorManagerRef = useRef<MirrorManager | null>(null);
  const laserRendererRef = useRef<LaserRenderer | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const victoryPlayedRef = useRef<Set<number>>(new Set());

  const [currentLevel, setCurrentLevel] = useState(0);
  const [moveCount, setMoveCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [attempts, setAttempts] = useState(1);
  const [levelComplete, setLevelComplete] = useState(false);
  const [selectedMirrorId, setSelectedMirrorId] = useState<string | null>(null);

  const initLevel = useCallback((levelIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const state = createGameState(levelIndex, w, h);
    gameStateRef.current = state;
    victoryPlayedRef.current.delete(levelIndex);

    setCurrentLevel(levelIndex);
    setMoveCount(0);
    setElapsedTime(0);
    setAttempts(1);
    setLevelComplete(false);
    setSelectedMirrorId(null);

    if (laserRendererRef.current) {
      laserRendererRef.current.clearParticles();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';

      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (gameStateRef.current) {
        const levelIdx = gameStateRef.current.currentLevel;
        const newState = createGameState(levelIdx, w, h);
        newState.moveCount = gameStateRef.current.moveCount;
        newState.elapsedTime = gameStateRef.current.elapsedTime;
        newState.attempts = gameStateRef.current.attempts;
        newState.levelComplete = gameStateRef.current.levelComplete;
        for (let i = 0; i < newState.mirrors.length && i < gameStateRef.current.mirrors.length; i++) {
          newState.mirrors[i].angle = gameStateRef.current.mirrors[i].angle;
          newState.mirrors[i].targetAngle = gameStateRef.current.mirrors[i].targetAngle;
        }
        gameStateRef.current = newState;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d')!;
    mirrorManagerRef.current = new MirrorManager(ctx);
    laserRendererRef.current = new LaserRenderer(ctx);

    initLevel(0);

    const gameLoop = (timestamp: number) => {
      if (!gameStateRef.current) {
        animFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const dt = Math.min(timestamp - lastTimeRef.current, 50);
      lastTimeRef.current = timestamp;

      const state = updateGameState(gameStateRef.current, dt);
      gameStateRef.current = state;

      setMoveCount(state.moveCount);
      setElapsedTime(state.elapsedTime);
      setLevelComplete(state.levelComplete);
      setSelectedMirrorId(state.selectedMirrorId);

      if (state.levelComplete && !victoryPlayedRef.current.has(state.currentLevel)) {
        victoryPlayedRef.current.add(state.currentLevel);
        playVictorySound();
      }

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      ctx.clearRect(0, 0, w, h);

      const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      bgGrad.addColorStop(0, '#141e26');
      bgGrad.addColorStop(1, '#0a1014');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      mirrorManagerRef.current!.drawGrid(state.offsetX, state.offsetY, state.gridCols, state.gridRows);

      const srcPos = gridToPixel(state.source.gridX, state.source.gridY, state.offsetX, state.offsetY);
      mirrorManagerRef.current!.drawLaserSource(srcPos.x, srcPos.y, state.source.direction.x, state.source.direction.y);

      mirrorManagerRef.current!.drawTargetCrystal(
        state.target.gridX, state.target.gridY,
        state.target.pulsePhase, state.offsetX, state.offsetY,
        state.target.exploding, state.target.hit
      );

      mirrorManagerRef.current!.drawAllMirrors(state.mirrors, state.offsetX, state.offsetY);

      laserRendererRef.current!.drawLaser(state.laserPath, dt);
      laserRendererRef.current!.drawCrystalExplosion(state.target.explodeParticles);

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [initLevel]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const state = gameStateRef.current;
    if (!state || state.levelComplete) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newState = selectMirrorAtPos(state, x, y);
    gameStateRef.current = newState;
    setSelectedMirrorId(newState.selectedMirrorId);
  }, []);

  const handleRotateLeft = useCallback(() => {
    const state = gameStateRef.current;
    if (!state) return;
    rotateMirror(state, -1);
    gameStateRef.current = state;
    setMoveCount(state.moveCount);
  }, []);

  const handleRotateRight = useCallback(() => {
    const state = gameStateRef.current;
    if (!state) return;
    rotateMirror(state, 1);
    gameStateRef.current = state;
    setMoveCount(state.moveCount);
  }, []);

  const handleReset = useCallback(() => {
    const state = gameStateRef.current;
    if (!state) return;
    const newAttempts = state.attempts + 1;
    initLevel(state.currentLevel);
    if (gameStateRef.current) {
      gameStateRef.current.attempts = newAttempts;
      setAttempts(newAttempts);
    }
  }, [initLevel]);

  const handleSelectLevel = useCallback((level: number) => {
    initLevel(level);
  }, [initLevel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      if (!state || state.levelComplete) return;

      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        rotateMirror(state, -1);
        setMoveCount(state.moveCount);
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        rotateMirror(state, 1);
        setMoveCount(state.moveCount);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      <UILayer
        currentLevel={currentLevel}
        moveCount={moveCount}
        elapsedTime={elapsedTime}
        attempts={attempts}
        levelComplete={levelComplete}
        selectedMirrorId={selectedMirrorId}
        onRotateLeft={handleRotateLeft}
        onRotateRight={handleRotateRight}
        onReset={handleReset}
        onSelectLevel={handleSelectLevel}
      />
    </div>
  );
};

export default App;
