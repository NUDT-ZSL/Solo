import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Grid } from './core/Grid';
import { Player, GridPos } from './core/Player';
import { Renderer } from './render/Renderer';
import { AudioManager } from './audio/AudioManager';

const CELL_SIZE = 80;
const WIN_TEXT_DURATION = 2000;
const WIN_BURST_DURATION = 1000;
const NEXT_LEVEL_DELAY = 3500;

function getGridSizeForLevel(level: number): number {
  return Math.min(4 + Math.floor((level - 1) / 1), 6);
}

function getStartPos(size: number): GridPos {
  return { row: -1, col: 0 };
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<Grid | null>(null);
  const playerRef = useRef<Player | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const rafRef = useRef<number | null>(null);
  const winTimerRef = useRef<number | null>(null);
  const nextLevelTimerRef = useRef<number | null>(null);

  const [level, setLevel] = useState<number>(1);
  const [moveCount, setMoveCount] = useState<number>(0);
  const [undoRemaining, setUndoRemaining] = useState<number>(10);
  const [isWin, setIsWin] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [, forceRender] = useState(0);

  const winPhaseRef = useRef<number>(0);
  const winStartRef = useRef<number>(0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const initGame = useCallback((lvl: number) => {
    const size = getGridSizeForLevel(lvl);
    const grid = new Grid(lvl);
    const start = getStartPos(size);
    const player = new Player(start.row, start.col);
    gridRef.current = grid;
    playerRef.current = player;
    setMoveCount(0);
    setUndoRemaining(10);
    setIsWin(false);
    winPhaseRef.current = 0;
    if (winTimerRef.current) { clearTimeout(winTimerRef.current); winTimerRef.current = null; }
    if (nextLevelTimerRef.current) { clearTimeout(nextLevelTimerRef.current); nextLevelTimerRef.current = null; }
    if (canvasRef.current && rendererRef.current) {
      setTimeout(() => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const ox = rect.width / 2;
        const oy = rect.height / 2;
        const totalW = size * CELL_SIZE;
        const cx = ox - totalW / 2 + (start.col + 0.5) * CELL_SIZE;
        const cy = oy - totalW / 2 + (start.row + 0.5) * CELL_SIZE;
        player.setInitialRenderPos(cx, cy);
      }, 0);
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    rendererRef.current = new Renderer(canvas);
    initGame(1);
    const handleResize = () => {
      rendererRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    const startTime = performance.now();
    const loop = (now: number) => {
      const grid = gridRef.current;
      const player = playerRef.current;
      const renderer = rendererRef.current;
      if (grid && player && renderer) {
        const t = now;
        if (!isPaused) {
          grid.updateBrightness(t);
          const rect = canvas.getBoundingClientRect();
          player.update(t, grid, rect.width / 2, rect.height / 2);
          if (isWin) {
            const elapsed = t - winStartRef.current;
            if (elapsed <= WIN_TEXT_DURATION) {
              winPhaseRef.current = elapsed / WIN_TEXT_DURATION;
            } else if (elapsed <= WIN_TEXT_DURATION + WIN_BURST_DURATION) {
              winPhaseRef.current = 0.5 + ((elapsed - WIN_TEXT_DURATION) / WIN_BURST_DURATION) * 0.5;
            } else {
              winPhaseRef.current = 1;
            }
          }
        }
        const levelProgress = Math.min(1, (level - 1) / 2);
        renderer.render(grid, player, {
          win: isWin,
          winPhase: winPhaseRef.current,
          paused: isPaused,
          levelProgress,
        }, t);
        const newMoves = player.moveCounter;
        const newUndo = player.undoRemaining;
        setMoveCount((prev) => (prev !== newMoves ? newMoves : prev));
        setUndoRemaining((prev) => (prev !== newUndo ? newUndo : prev));
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [initGame, isWin, isPaused, level]);

  const tryMove = useCallback((dr: number, dc: number) => {
    const grid = gridRef.current;
    const player = playerRef.current;
    if (!grid || !player || isWin || isPaused) return;
    const pos = player.currentGridPos;
    const to: GridPos = { row: pos.row + dr, col: pos.col + dc };
    if (!player.canMove(to, grid)) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const res = player.startMove(to, grid, performance.now(), rect.width / 2, rect.height / 2);
    if (res.moved) {
      AudioManager.instance.playMove();
      if (res.pillarHit) {
        AudioManager.instance.playExtinguish();
        setTimeout(() => {
          if (grid.isAllExtinguished()) {
            winStartRef.current = performance.now();
            setIsWin(true);
            AudioManager.instance.playWin();
            nextLevelTimerRef.current = window.setTimeout(() => {
              const nextLevel = level + 1;
              setLevel(nextLevel);
              initGame(nextLevel);
            }, NEXT_LEVEL_DELAY);
          }
        }, 50);
      }
    }
  }, [isWin, isPaused, level, initGame]);

  const doUndo = useCallback(() => {
    const grid = gridRef.current;
    const player = playerRef.current;
    if (!grid || !player || isWin || isPaused) return;
    if (player.undoRemaining <= 0) return;
    const ok = player.startUndo(grid, performance.now());
    if (ok) {
      AudioManager.instance.playUndo();
    }
  }, [isWin, isPaused]);

  const resetLevel = useCallback(() => {
    initGame(level);
  }, [level, initGame]);

  const togglePause = useCallback(() => {
    setIsPaused((p) => !p);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          tryMove(-1, 0);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          tryMove(1, 0);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          tryMove(0, -1);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          tryMove(0, 1);
          break;
        case 'z':
        case 'Z':
          e.preventDefault();
          doUndo();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          resetLevel();
          break;
        case ' ':
        case 'Escape':
          e.preventDefault();
          togglePause();
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tryMove, doUndo, resetLevel, togglePause]);

  const joystickRef = useRef<HTMLDivElement | null>(null);
  const joystickKnobRef = useRef<HTMLDivElement | null>(null);
  const joystickActiveRef = useRef<boolean>(false);
  const lastDirRef = useRef<{ dr: number; dc: number } | null>(null);
  const joystickMoveTimerRef = useRef<number | null>(null);

  const onJoystickStart = useCallback((clientX: number, clientY: number) => {
    if (!joystickRef.current || !joystickKnobRef.current) return;
    joystickActiveRef.current = true;
    lastDirRef.current = null;
    onJoystickMove(clientX, clientY);
  }, []);

  const onJoystickMove = useCallback((clientX: number, clientY: number) => {
    if (!joystickActiveRef.current || !joystickRef.current || !joystickKnobRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const baseX = rect.left + rect.width / 2;
    const baseY = rect.top + rect.height / 2;
    let dx = clientX - baseX;
    let dy = clientY - baseY;
    const maxR = 40;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 15) {
      joystickKnobRef.current.style.transform = `translate(${0}px, ${0}px)`;
      lastDirRef.current = null;
      return;
    }
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    joystickKnobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    let dr = 0, dc = 0;
    if (absX > absY) {
      dc = dx > 0 ? 1 : -1;
    } else {
      dr = dy > 0 ? 1 : -1;
    }
    const newDir = { dr, dc };
    if (!lastDirRef.current || lastDirRef.current.dr !== newDir.dr || lastDirRef.current.dc !== newDir.dc) {
      lastDirRef.current = newDir;
      tryMove(dr, dc);
      if (joystickMoveTimerRef.current) { clearInterval(joystickMoveTimerRef.current); }
      joystickMoveTimerRef.current = window.setInterval(() => {
        if (lastDirRef.current) {
          tryMove(lastDirRef.current.dr, lastDirRef.current.dc);
        }
      }, 350);
    }
  }, [tryMove]);

  const onJoystickEnd = useCallback(() => {
    joystickActiveRef.current = false;
    lastDirRef.current = null;
    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = 'translate(0px, 0px)';
    }
    if (joystickMoveTimerRef.current) {
      clearInterval(joystickMoveTimerRef.current);
      joystickMoveTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const el = joystickRef.current;
    const knob = joystickKnobRef.current;
    if (!el || !knob) return;
    const onTouchStart = (e: TouchEvent) => { e.preventDefault(); const t = e.touches[0]; onJoystickStart(t.clientX, t.clientY); };
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); const t = e.touches[0]; onJoystickMove(t.clientX, t.clientY); };
    const onTouchEnd = (e: TouchEvent) => { e.preventDefault(); onJoystickEnd(); };
    const onMouseDown = (e: MouseEvent) => { onJoystickStart(e.clientX, e.clientY); };
    const onMouseMove = (e: MouseEvent) => { onJoystickMove(e.clientX, e.clientY); };
    const onMouseUp = (e: MouseEvent) => { onJoystickEnd(); };
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    el.addEventListener('touchcancel', onTouchEnd, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (joystickMoveTimerRef.current) clearInterval(joystickMoveTimerRef.current);
    };
  }, [onJoystickStart, onJoystickMove, onJoystickEnd]);

  const BTN_BOX_SHADOW = '0 2px 8px rgba(46, 204, 113, 0.3)';
  const BTN_HOVER_BOX_SHADOW = '0 4px 16px rgba(46, 204, 113, 0.5)';

  const btnStyle: React.CSSProperties = {
    padding: '10px 22px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: BTN_BOX_SHADOW,
    minWidth: '90px',
    letterSpacing: '0.5px',
  };

  const btnHover: React.CSSProperties = {
    transform: 'scale(1.1)',
    boxShadow: BTN_HOVER_BOX_SHADOW,
  };

  const hudText: React.CSSProperties = {
    color: '#fff',
    fontFamily: '"Consolas", "Courier New", monospace',
    fontSize: '18px',
    fontWeight: 700,
    textShadow: '0 0 10px rgba(255,255,255,0.5)',
    letterSpacing: '1px',
    pointerEvents: 'none',
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#0B0C1E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none',
        }}
      />

      <div style={{
        position: 'absolute', top: 20, left: 24, ...hudText,
      }}>
        关卡 {level}
      </div>
      <div style={{
        position: 'absolute', top: 20, right: 24, ...hudText,
      }}>
        步数 {moveCount}
      </div>
      <div style={{
        position: 'absolute', bottom: isMobile ? 180 : 24, right: 24, ...hudText,
        opacity: undoRemaining > 0 ? 1 : 0.4,
      }}>
        撤销 {undoRemaining}
      </div>

      <div style={{
        position: 'absolute',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 14,
      }}>
        <button
          onClick={resetLevel}
          style={btnStyle}
          onMouseEnter={(e) => { Object.assign(e.currentTarget.style, btnHover); }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = btnStyle.boxShadow; }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
          onMouseUp={(e) => { Object.assign(e.currentTarget.style, btnHover); }}
        >
          重置
        </button>
        <button
          onClick={togglePause}
          style={btnStyle}
          onMouseEnter={(e) => { Object.assign(e.currentTarget.style, btnHover); }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = btnStyle.boxShadow; }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
          onMouseUp={(e) => { Object.assign(e.currentTarget.style, btnHover); }}
        >
          {isPaused ? '继续' : '暂停'}
        </button>
      </div>

      {!isMobile && (
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.5)',
          fontFamily: '"Consolas", monospace',
          fontSize: '13px',
          textAlign: 'center',
          lineHeight: 1.8,
          pointerEvents: 'none',
        }}>
          <div>方向键 / WASD 移动 · Z 撤销 · R 重置 · 空格 暂停</div>
          <div style={{ opacity: 0.7, marginTop: 4 }}>让所有光柱同时熄灭即可通关</div>
        </div>
      )}

      {isMobile && (
        <div
          ref={joystickRef}
          style={{
            position: 'absolute',
            left: 32,
            bottom: 80,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'rgba(58, 60, 94, 0.5)',
            border: '2px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'none',
            userSelect: 'none',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)',
          }}
        >
          <div
            ref={joystickKnobRef}
            style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ffffff 0%, #cccccc 100%)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.8)',
              transition: joystickActiveRef.current ? 'none' : 'transform 0.15s ease-out',
              willChange: 'transform',
            }}
          />
        </div>
      )}

      {isPaused && !isWin && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(11, 12, 30, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            fontSize: '60px',
            fontWeight: 700,
            color: '#fff',
            textShadow: '0 0 30px rgba(255,255,255,0.5)',
            marginBottom: 20,
            letterSpacing: '8px',
          }}>
            暂 停
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.7)',
            fontFamily: 'Consolas, monospace',
            fontSize: '14px',
          }}>
            按空格或点击继续按钮
          </div>
        </div>
      )}
    </div>
  );
};

import { createRoot } from 'react-dom/client';
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}

export default App;
