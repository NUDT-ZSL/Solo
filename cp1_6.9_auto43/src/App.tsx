import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Shard,
  generateShards,
  hitTest,
  checkSnap,
  snapToCorrect,
  checkVictory,
  rotateShard,
  isRotationAligned
} from './shapes';
import { AudioManager } from './audio';
import {
  RendererState,
  RippleEffect,
  renderFrame,
  initRenderer,
  createRipple
} from './renderer';

const CANVAS_SIZE = 800;

interface GameState {
  shards: Shard[];
  selectedId: number | null;
  dragOffset: { x: number; y: number };
  victory: boolean;
  victoryStartTime: number;
  ripples: RippleEffect[];
  flashAlpha: number;
  flashStartTime: number;
  showMirrorImage: boolean;
  mirrorImageAlpha: number;
  elapsedStartTime: number;
  elapsedOffset: number;
  paused: boolean;
  snapHighlights: Map<number, number>;
  brightnessTimers: Map<number, number>;
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<AudioManager>(new AudioManager());
  const gameStateRef = useRef<GameState | null>(null);
  const animFrameRef = useRef<number>(0);
  const [, forceRender] = useState(0);

  const initGameState = useCallback((): GameState => {
    const shards = generateShards();
    return {
      shards,
      selectedId: null,
      dragOffset: { x: 0, y: 0 },
      victory: false,
      victoryStartTime: 0,
      ripples: [],
      flashAlpha: 0,
      flashStartTime: 0,
      showMirrorImage: false,
      mirrorImageAlpha: 0,
      elapsedStartTime: performance.now(),
      elapsedOffset: 0,
      paused: false,
      snapHighlights: new Map(),
      brightnessTimers: new Map()
    };
  }, []);

  const resetGame = useCallback(() => {
    gameStateRef.current = initGameState();
    forceRender(v => v + 1);
  }, [initGameState]);

  useEffect(() => {
    initRenderer();
    gameStateRef.current = initGameState();
  }, [initGameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const getCanvasCoords = (e: MouseEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    const handleMouseDown = (e: MouseEvent) => {
      audioRef.current.init();
      const state = gameStateRef.current;
      if (!state || state.victory) return;
      const { x, y } = getCanvasCoords(e);

      if (e.button === 2) {
        e.preventDefault();
        for (let i = state.shards.length - 1; i >= 0; i--) {
          if (hitTest(state.shards[i], x, y)) {
            rotateShard(state.shards[i]);
            audioRef.current.playRotateClick();
            state.snapHighlights.set(state.shards[i].id, 0);
            return;
          }
        }
        return;
      }

      if (e.button === 0) {
        for (let i = state.shards.length - 1; i >= 0; i--) {
          const shard = state.shards[i];
          if (hitTest(shard, x, y) && !shard.isPlaced) {
            state.selectedId = shard.id;
            state.dragOffset = {
              x: x - shard.position.x,
              y: y - shard.position.y
            };
            const moved = state.shards.splice(i, 1)[0];
            state.shards.push(moved);
            return;
          }
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const state = gameStateRef.current;
      if (!state || state.selectedId === null || state.victory) return;
      const { x, y } = getCanvasCoords(e);
      const shard = state.shards.find(s => s.id === state.selectedId);
      if (!shard || shard.isPlaced) return;
      shard.position.x = x - state.dragOffset.x;
      shard.position.y = y - state.dragOffset.y;
    };

    const handleMouseUp = (e: MouseEvent) => {
      const state = gameStateRef.current;
      if (!state || state.selectedId === null || state.victory) return;
      const selectedId = state.selectedId;
      const shard = state.shards.find(s => s.id === selectedId);

      if (shard) {
        const rotOk = isRotationAligned(shard, 0.15);
        if (rotOk) {
          const dx = shard.position.x - shard.correctPosition.x;
          const dy = shard.position.y - shard.correctPosition.y;
          if (Math.hypot(dx, dy) < 25) {
            snapToCorrect(shard);
            audioRef.current.playSnapHum();
            audioRef.current.playResonanceNote(shard.id);
            state.snapHighlights.set(shard.id, 1);
            state.brightnessTimers.set(shard.id, 400);
            shard.edgeBrightness = 2.0;
            state.selectedId = null;

            if (checkVictory(state.shards)) {
              triggerVictory(state);
            }
            return;
          }
        }

        const snap = checkSnap(state.shards, selectedId);
        if (snap.shouldSnap && rotOk) {
          audioRef.current.playSnapHum();
          state.snapHighlights.set(selectedId, 1);
          state.brightnessTimers.set(selectedId, 400);
          shard.edgeBrightness = 2.0;

          const tgtDx = shard.correctPosition.x - shard.position.x;
          const tgtDy = shard.correctPosition.y - shard.position.y;
          shard.position.x += tgtDx * 0.15;
          shard.position.y += tgtDy * 0.15;
        }
      }

      state.selectedId = null;
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const triggerVictory = (state: GameState) => {
      state.victory = true;
      state.victoryStartTime = performance.now();
      state.ripples.push(createRipple());
      state.flashAlpha = 0.3;
      state.flashStartTime = performance.now();
      state.paused = true;
      setTimeout(() => {
        audioRef.current.playVictoryChord();
      }, 1500);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);

    const gameLoop = () => {
      const state = gameStateRef.current;
      if (!state) {
        animFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      const now = performance.now();

      const dt = 16;
      for (const [id, t] of state.brightnessTimers.entries()) {
        const newT = t - dt;
        if (newT <= 0) {
          state.brightnessTimers.delete(id);
          const shard = state.shards.find(s => s.id === id);
          if (shard) shard.edgeBrightness = 1.0;
        } else {
          state.brightnessTimers.set(id, newT);
          const shard = state.shards.find(s => s.id === id);
          if (shard) {
            const k = newT / 400;
            shard.edgeBrightness = 1 + k * 1;
          }
        }
      }

      for (const [id, h] of state.snapHighlights.entries()) {
        const nh = h - 0.03;
        if (nh <= 0) {
          state.snapHighlights.delete(id);
        } else {
          state.snapHighlights.set(id, nh);
        }
      }

      for (const shard of state.shards) {
        if (shard.flashWhite > 0) {
          shard.flashWhite = Math.max(0, shard.flashWhite - 0.04);
        }
      }

      if (state.victory) {
        const t = (now - state.victoryStartTime);
        if (t < 300) {
          state.flashAlpha = 0.3 * (1 - t / 300);
        } else {
          state.flashAlpha = 0;
        }
        if (t > 1500) {
          state.showMirrorImage = true;
          const imgT = t - 1500;
          state.mirrorImageAlpha = Math.min(1, imgT / 1000);
        }
      }

      const elapsedMs = state.paused
        ? state.elapsedOffset
        : state.elapsedOffset + (now - state.elapsedStartTime);
      const elapsedSec = elapsedMs / 1000;

      const rendererState: RendererState = {
        shards: state.shards,
        selectedId: state.selectedId,
        victory: state.victory,
        victoryProgress: 0,
        ripples: state.ripples,
        flashAlpha: state.flashAlpha,
        elapsedSeconds: elapsedSec,
        showMirrorImage: state.showMirrorImage,
        mirrorImageAlpha: state.mirrorImageAlpha
      };

      renderFrame(ctx, rendererState, state.snapHighlights, now);
      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        resetGame();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [resetGame]);

  const handleReset = () => {
    audioRef.current.init();
    resetGame();
  };

  const state = gameStateRef.current;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0B0B1A',
      gap: '16px',
      padding: '20px'
    }}>
      <h1 style={{
        color: '#FFFFFF',
        fontSize: '28px',
        fontWeight: 300,
        letterSpacing: '8px',
        textShadow: '0 0 20px rgba(0, 229, 255, 0.6)',
        margin: 0
      }}>
        镜 面 碎 响
      </h1>
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{
            border: '1px solid rgba(0, 229, 255, 0.2)',
            borderRadius: '8px',
            boxShadow: '0 0 60px rgba(0, 229, 255, 0.15)',
            cursor: state?.selectedId !== null ? 'grabbing' : 'default',
            maxWidth: '90vh',
            maxHeight: '90vh',
            userSelect: 'none'
          }}
        />
        {state?.victory && (
          <div style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#FFD700',
            fontSize: '22px',
            fontWeight: 500,
            letterSpacing: '4px',
            textShadow: '0 0 20px rgba(255, 215, 0, 0.8)',
            pointerEvents: 'none',
            animation: 'fadeIn 1s ease-in'
          }}>
            ✦ 镜面复原 ✦
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <button
          onClick={handleReset}
          style={{
            background: 'rgba(0, 229, 255, 0.1)',
            border: '1px solid rgba(0, 229, 255, 0.4)',
            color: '#00E5FF',
            padding: '10px 24px',
            borderRadius: '6px',
            fontSize: '14px',
            letterSpacing: '2px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 229, 255, 0.25)';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 229, 255, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 229, 255, 0.1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          重置 (R)
        </button>
        <div style={{
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '13px',
          letterSpacing: '1px'
        }}>
          左键拖拽 · 右键旋转 · R键重置
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default App;
