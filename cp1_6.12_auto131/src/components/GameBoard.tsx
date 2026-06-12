import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameState, UpgradeData, HEX_HORIZ_SPACING, HEX_VERT_SPACING, ROWS, BUBBLE_RADIUS, ItemDef } from '../game/GameEngine';
import { Renderer } from '../game/Renderer';

interface Props {
  engine: GameEngine;
  upgradeData: UpgradeData | null;
  onGameOver: (engine: GameEngine) => void;
  onBack: () => void;
}

const GameBoard: React.FC<Props> = ({ engine, upgradeData, onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const rafRef = useRef<number>(0);
  const [stateVersion, setStateVersion] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const gameOverFiredRef = useRef(false);
  const stateRef = useRef<GameState>(engine.state);

  useEffect(() => {
    stateRef.current = engine.state;
  }, [stateVersion]);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 432) setScale(0.5);
      else if (w < 768) setScale(0.75);
      else setScale(1);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gridW = COLS * HEX_HORIZ_SPACING;
    const gridH = ROWS * HEX_VERT_SPACING + BUBBLE_RADIUS * 2 + 40;
    canvas.width = Math.floor(gridW * scale);
    canvas.height = Math.floor(gridH * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    const renderer = new Renderer(canvas);
    renderer.setScale(scale);
    rendererRef.current = renderer;

    const loop = () => {
      if (!paused) {
        const res = engine.update();
        if (engine.state.gameOver && !gameOverFiredRef.current) {
          gameOverFiredRef.current = true;
          setTimeout(() => onGameOver(engine), 300);
        }
        if (engine.state.levelComplete && !gameOverFiredRef.current) {
          gameOverFiredRef.current = true;
          setTimeout(() => onGameOver(engine), 300);
        }
      }

      renderer.clear();
      renderer.render(stateRef.current, engine.getAimLinePoints(), false);

      setStateVersion(v => (v + 1) & 0xffff);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(rafRef.current);
  }, [engine, paused, scale, onGameOver]);

  useEffect(() => {
    engine.onStateChange = () => {
      stateRef.current = engine.state;
    };
    return () => { engine.onStateChange = undefined; };
  }, [engine]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (paused) return;
    if (e.key === 'ArrowLeft') {
      engine.setAimAngle(engine.state.launcherAngle - 1);
    } else if (e.key === 'ArrowRight') {
      engine.setAimAngle(engine.state.launcherAngle + 1);
    } else if (e.key === ' ') {
      e.preventDefault();
      engine.toggleAimLineWithLog(true);
    } else if (e.key === 'Enter') {
      engine.shoot();
    }
  }, [engine, paused]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === ' ') {
      engine.toggleAimLineWithLog(false);
    }
  }, [engine]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKey, handleKeyUp]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (paused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    const launcher = engine.getLauncherPosition();
    const dx = x - launcher.x;
    const dy = launcher.y - y;
    let angle = Math.atan2(dx, dy) * 180 / Math.PI;
    engine.setAimAngle(angle);
  }, [engine, paused, scale]);

  const handleClick = useCallback(() => {
    if (paused) return;
    engine.shoot();
  }, [engine, paused]);

  const s = stateRef.current;
  const progressPct = Math.min(100, s.eliminateProgress * 100);

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0b0b1a 0%, #1a1a3a 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '16px',
    gap: 16,
    color: 'white',
    fontFamily: "'Segoe UI', sans-serif",
    position: 'relative',
  };

  const panelStyle: React.CSSProperties = {
    width: 180,
    padding: 16,
    background: '#1e1332',
    borderRadius: 12,
    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  };

  const itemIconStyle: React.CSSProperties = {
    width: 40,
    height: 40,
    transform: 'rotate(45deg)',
    background: 'linear-gradient(135deg, rgba(170,68,255,0.4), rgba(68,136,255,0.4))',
    border: '1px solid rgba(255,255,255,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform 0.15s',
  };

  const itemInnerStyle: React.CSSProperties = {
    transform: 'rotate(-45deg)',
    fontSize: 18,
  };

  const progressBarStyle: React.CSSProperties = {
    width: '100%',
    height: 6,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  };

  const progressFillStyle: React.CSSProperties = {
    height: '100%',
    width: `${progressPct}%`,
    background: 'linear-gradient(90deg, #ff4466, #aa44ff)',
    transition: 'width 0.3s',
  };

  const pauseBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: paused ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.25)',
    border: 'none',
    cursor: 'pointer',
    color: '#1a1a3a',
    fontSize: 14,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.15s, background 0.15s',
  };

  const handleNextLevel = () => {
    gameOverFiredRef.current = false;
    engine.advanceLevel();
  };

  return (
    <div style={containerStyle}>
      <div style={panelStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            onClick={onBack}
            style={{
              alignSelf: 'flex-start',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ← 菜单
          </button>
          <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1 }}>关卡</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{s.level}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>得分</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{s.score.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>连击 x{s.combo}</div>
          <div style={progressBarStyle}><div style={progressFillStyle} /></div>
          <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>消除进度 {progressPct.toFixed(0)}%</div>
        </div>
        <div>
          <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>本局道具</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {s.items.map((it: ItemDef) => (
              <div
                key={it.id}
                style={itemStyle}
                onMouseEnter={() => setHoveredItem(it.id)}
                onMouseLeave={() => setHoveredItem(null)}
                onMouseDown={() => {
                  const el = (event as unknown as React.MouseEvent).currentTarget as HTMLElement;
                  el.style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1) rotate(45deg)';
                }}
              >
                <div style={itemIconStyle} className="item-icon-hover">
                  <span style={itemInnerStyle}>{it.icon}</span>
                </div>
                {hoveredItem === it.id && (
                  <div style={{
                    background: 'rgba(0,0,0,0.85)',
                    padding: '6px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    maxWidth: 170,
                    textAlign: 'center',
                    position: 'absolute',
                    left: 210,
                    zIndex: 10,
                    whiteSpace: 'nowrap',
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{it.name}</div>
                    <div style={{ opacity: 0.8 }}>{it.description}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 'auto', fontSize: 10, opacity: 0.5, lineHeight: 1.5 }}>
          ← → 瞄准 1°<br />
          空格 显示轨迹<br />
          回车/点击 发射
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          style={{
            display: 'block',
            borderRadius: 12,
            cursor: 'crosshair',
            boxShadow: '0 0 40px rgba(170, 68, 255, 0.15)',
          }}
        />
        <button
          style={pauseBtnStyle}
          onClick={() => setPaused(p => !p)}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.95)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = paused ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {paused ? '▶' : '❚❚'}
        </button>

        {(s.gameOver || s.levelComplete) && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            borderRadius: 12,
            animation: 'fadeIn 0.3s ease-out',
          }}>
            <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
              {s.levelComplete ? '🎉 关卡通过!' : '💀 游戏结束'}
            </div>
            <div style={{ fontSize: 16, opacity: 0.8, marginBottom: 4 }}>得分: {s.score.toLocaleString()}</div>
            <div style={{ fontSize: 20, marginBottom: 20 }}>获得 ⭐ {engine.calculateStars()}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {s.levelComplete && (
                <button
                  onClick={handleNextLevel}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #44dd66, #22aa88)',
                    color: 'white',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: 14,
                    transition: 'transform 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  下一关
                </button>
              )}
              <button
                onClick={() => { gameOverFiredRef.current = false; onBack(); }}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 14,
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                返回菜单
              </button>
            </div>
          </div>
        )}

        {paused && !s.gameOver && !s.levelComplete && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>暂停中</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .item-icon-hover:hover { transform: rotate(45deg) scale(1.08) !important; }
        .item-icon-hover:active { transform: rotate(45deg) scale(0.95) !important; }
        button:active { transform: scale(0.95); }
      `}</style>
    </div>
  );
};

const COLS = 8;
export default GameBoard;
