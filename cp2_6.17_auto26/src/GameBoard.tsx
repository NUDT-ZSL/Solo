import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, CANVAS_SIZE, TRAP_FLASH_DURATION, Direction } from './gameTypes';
import { createInitialState, handleMove, resetLevel, nextLevel, tick } from './gameLogic';
import { render, invalidateStaticCache } from './renderer';
import { levels } from './levels';

const keyToDir: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
};

const FONT_FAMILY = 'Courier New, monospace';

export const GameBoard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState(0));
  const [, setUiTick] = useState(0);
  const [showVictory, setShowVictory] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const forceUpdate = useCallback(() => setUiTick((t) => t + 1), []);

  useEffect(() => {
    let rafId = 0;

    const loop = () => {
      const now = Date.now();
      const state = gameStateRef.current;
      const tickResult = tick(state, now);
      if (tickResult.events.length > 0 || tickResult.state !== state) {
        gameStateRef.current = tickResult.state;
      }

      if (tickResult.state.isFailed) {
        const elapsed = now - tickResult.state.trapFlashStart;
        if (elapsed >= TRAP_FLASH_DURATION) {
          const result = resetLevel(tickResult.state);
          gameStateRef.current = result.state;
          invalidateStaticCache();
          forceUpdate();
        }
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          render(ctx, gameStateRef.current, now);
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [forceUpdate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const dir = keyToDir[e.key];
      if (!dir) return;
      e.preventDefault();
      const now = Date.now();
      const result = handleMove(gameStateRef.current, dir, now);
      gameStateRef.current = result.state;
      invalidateStaticCache();

      if (result.events.some((ev) => ev.type === 'win')) {
        handleWin();
      }
      forceUpdate();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [forceUpdate]);

  const handleWin = useCallback(() => {
    const current = gameStateRef.current;
    const nxt = nextLevel(current);
    if (nxt === null) {
      const elapsedMs = Date.now() - current.startTime;
      setTotalTime(elapsedMs);
      setShowVictory(true);
      invalidateStaticCache();
    } else {
      setTimeout(() => {
        gameStateRef.current = nxt.state;
        invalidateStaticCache();
        forceUpdate();
      }, 300);
    }
  }, [forceUpdate]);

  const restartGame = () => {
    gameStateRef.current = createInitialState(0);
    invalidateStaticCache();
    setShowVictory(false);
    forceUpdate();
  };

  const state = gameStateRef.current;
  const stepRatio = state.stepCount / state.levelData.stepLimit;
  const stepColor = stepRatio >= 0.8 ? '#ef4444' : '#ffcc00';
  const mm = String(Math.floor(totalTime / 60000)).padStart(2, '0');
  const ss = String(Math.floor((totalTime % 60000) / 1000)).padStart(2, '0');

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#1e1b4b',
    fontFamily: FONT_FAMILY,
    position: 'relative',
    margin: 0,
    padding: 0,
  };

  const gameAreaStyle: React.CSSProperties = {
    position: 'relative',
  };

  const uiStyle: React.CSSProperties = {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: '12px 16px',
    background: 'rgba(30, 27, 75, 0.9)',
    border: '2px solid #4338ca',
    borderRadius: 8,
    fontFamily: FONT_FAMILY,
    color: '#aaaaaa',
    fontSize: 14,
    minWidth: 160,
  };

  const labelStyle: React.CSSProperties = { color: '#aaaaaa', marginBottom: 4 };
  const goldStyle = (color: string): React.CSSProperties => ({ color, fontSize: 16, fontWeight: 'bold' });

  const headingStyle: React.CSSProperties = {
    color: '#ffcc00',
    marginBottom: 16,
    fontFamily: FONT_FAMILY,
  };

  const hintStyle: React.CSSProperties = {
    marginTop: 12,
    color: '#aaaaaa',
    textAlign: 'center',
    fontSize: 12,
  };

  const canvasStyle: React.CSSProperties = {
    border: '4px solid #4338ca',
    borderRadius: 8,
    display: 'block',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const popupStyle: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: 12,
    padding: '32px 48px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    textAlign: 'center',
    minWidth: 320,
  };

  const popupH2: React.CSSProperties = {
    color: '#1e1b4b',
    margin: 0,
    marginBottom: 12,
    fontSize: 24,
  };

  const popupTime: React.CSSProperties = {
    color: '#666',
    marginBottom: 20,
    fontSize: 16,
  };

  const timeSpan: React.CSSProperties = {
    color: '#1e1b4b',
    fontWeight: 'bold',
  };

  const btnStyle: React.CSSProperties = {
    padding: '10px 24px',
    fontSize: 14,
    background: '#4338ca',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: FONT_FAMILY,
  };

  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>
        地下城堡逃生
      </h1>
      <div style={gameAreaStyle}>
        <div style={uiStyle}>
          <div style={labelStyle}>关卡</div>
          <div style={goldStyle('#ffcc00')}>{state.levelIndex + 1} / {levels.length}</div>
          <div style={{ ...labelStyle, marginTop: 10 }}>步数</div>
          <div style={goldStyle(stepColor)}>
            {state.stepCount} / {state.levelData.stepLimit}
          </div>
          <div style={{ ...labelStyle, marginTop: 10 }}>已救同伴</div>
          <div style={goldStyle('#ffcc00')}>
            {state.rescuedCount} / {state.totalCompanions}
          </div>
        </div>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={canvasStyle}
        />
        <div style={hintStyle}>
          WASD 或 方向键移动 · 推动石块 · 踩压力板开门 · 解救同伴后前往出口
        </div>
      </div>

      {showVictory && (
        <div style={overlayStyle}>
          <div style={popupStyle}>
            <h2 style={popupH2}>全部解救！逃离成功！</h2>
            <div style={popupTime}>
              总用时：<span style={timeSpan}>{mm}:{ss}</span>
            </div>
            <button onClick={restartGame} style={btnStyle}>
              再玩一次
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
