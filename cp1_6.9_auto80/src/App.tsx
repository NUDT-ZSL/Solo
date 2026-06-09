import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameState } from './gameEngine';
import {
  CocoonColor,
  GRID_COLS, GRID_ROWS, CELL_SIZE, LOGICAL_W, LOGICAL_H,
  COCOON_COST, COCOON_COLORS, UPGRADE_COSTS
} from './entities';

const COLORS: CocoonColor[] = ['red', 'green', 'blue'];
const COLOR_LABELS: Record<CocoonColor, string> = { red: '红', green: '绿', blue: '蓝' };

const MIN_W = 1024;
const MIN_H = 768;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);

  const [gameState, setGameState] = useState<GameState>({
    score: 100,
    lives: 10,
    wave: 0,
    waveActive: false,
    gameOver: false,
    victory: false
  });
  const [selectedColor, setSelectedColor] = useState<CocoonColor>('red');
  const [selectedCocoonInfo, setSelectedCocoonInfo] = useState<{ id: number; level: number; color: CocoonColor } | null>(null);
  const [viewport, setViewport] = useState({ w: 1024, h: 768, scale: 1, offsetX: 0, offsetY: 0 });
  const [uiScale, setUiScale] = useState(1);

  const computeLayout = useCallback(() => {
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    const availW = winW;
    const availH = winH;

    const baseW = LOGICAL_W;
    const baseH = LOGICAL_H;

    const scaleW = availW / baseW;
    const scaleH = availH / baseH;
    const scale = Math.min(scaleW, scaleH, 3.0);

    const canvasW = Math.floor(baseW * scale);
    const canvasH = Math.floor(baseH * scale);

    const offsetX = Math.floor((availW - canvasW) / 2;
    const offsetY = Math.floor((availH - canvasH) / 2;

    setViewport({ w: canvasW, h: canvasH, scale, offsetX, offsetY });
    setUiScale(Math.max(0.75, Math.min(1.4, scale / 2.0)));
  }, []);

  useEffect(() => {
    const engine = new GameEngine({
      onStateChange: (s) => { setGameState(s); }
    });
    engineRef.current = engine;
    engine.start();
    computeLayout();

    const handleResize = () => computeLayout();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [computeLayout]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = engineRef.current;
    if (!engine) engine.start();
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const loop = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;

      engine.update(dt);

      canvas.width = viewport.w;
      canvas.height = viewport.h;
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(viewport.scale, 0, 0, viewport.scale, 0, 0);
      engine.render(ctx, viewport.scale);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = 0;
    };
  }, [viewport.w, viewport.h, viewport.scale]);

  const clientToLogical = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left);
    const y = (clientY - rect.top);
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
    const localX = x / rect.width * LOGICAL_W;
    const localY = y / rect.height * LOGICAL_H;
    return { x: localX, y: localY };
  }, []);

  const updateSelectedCocoonInfo = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.selectedCocoonId !== null) {
      const c = engine.getCocoonById(engine.selectedCocoonId);
      if (c) setSelectedCocoonInfo({ id: c.id, level: c.level, color: c.color });
      else setSelectedCocoonInfo(null);
    } else {
      setSelectedCocoonInfo(null);
    }
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.getState().gameOver) return;

    const pos = clientToLogical(e.clientX, e.clientY);
    if (!pos) return;

    const existing = engine.findCocoonAtLogical(pos.x, pos.y);
    if (existing) {
      engine.selectedCocoonId = existing.id;
      updateSelectedCocoonInfo();
      return;
    }

    const cell = engine.cellFromLogical(pos.x, pos.y);
    const atCell = engine.getCocoonAt(cell.col, cell.row);
    if (atCell) {
      engine.selectedCocoonId = atCell.id;
      updateSelectedCocoonInfo();
      return;
    }

    const placed = engine.placeCocoon(cell.col, cell.row, selectedColor);
    if (placed) {
      setGameState(engine.getState());
      updateSelectedCocoonInfo();
    }
  }, [clientToLogical, selectedColor, updateSelectedCocoonInfo]);

  const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    if (!engine) return;
    const pos = clientToLogical(e.clientX, e.clientY);
    if (!pos) {
      engine.setHoverCell(null);
      return;
    }
    const cell = engine.cellFromLogical(pos.x, pos.y);
    if (cell.col >= 0 && cell.col < GRID_COLS && cell.row >= 0 && cell.row < GRID_ROWS) {
      engine.setHoverCell(cell);
    } else {
      engine.setHoverCell(null);
    }
  }, [clientToLogical]);

  const handleCanvasLeave = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) engine.setHoverCell(null);
  }, []);

  const handleUpgrade = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !selectedCocoonInfo) return;
    if (engine.upgradeCocoon(selectedCocoonInfo.id)) {
      setGameState(engine.getState());
      updateSelectedCocoonInfo();
    }
  }, [selectedCocoonInfo, updateSelectedCocoonInfo]);

  const handleRestart = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.reset();
    setSelectedCocoonInfo(null);
  }, []);

  const topFont = `${Math.round(12 * uiScale)}px "Press Start 2P", monospace`;

  const canUpgrade = selectedCocoonInfo
    ? selectedCocoonInfo.level < 3 && gameState.score >= UPGRADE_COSTS[selectedCocoonInfo.level]
    : false;
  const upgradeCost = selectedCocoonInfo
    ? (selectedCocoonInfo.level < 3 ? UPGRADE_COSTS[selectedCocoonInfo.level] : null
    : null;

  const livesDisplay = '❤ '.repeat(Math.max(0, gameState.lives)).trim();

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        overflow: 'hidden'
      }}
    >
      <div style={{
        position: 'absolute',
        left: `${viewport.offsetX}px`,
        top: `${viewport.offsetY}px`,
        width: `${viewport.w}px`,
        height: `${viewport.h}px`,
        boxShadow: '0 0 80px rgba(80,255,160,0.15) inset'
      }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            cursor: 'crosshair'
          }}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMove}
          onMouseLeave={handleCanvasLeave}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          padding: `${Math.round(10 * uiScale)}px ${Math.round(16 * uiScale)}px`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          background: 'rgba(0,0,0,0.6)',
          borderBottom: '1px solid rgba(120,255,160,0.15)',
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        <div style={{ fontSize: topFont, color: '#FFDD55', textShadow: '0 0 8px rgba(255,200,50,0.6)', letterSpacing: 1 }}>
          积分 {gameState.score}
        </div>
        <div style={{ fontSize: topFont, color: '#AADDFF', textShadow: '0 0 8px rgba(100,180,255,0.6)', letterSpacing: 1 }}>
          波次 {gameState.wave} / 10
          {gameState.waveActive && (
            <span style={{
              display: 'inline-block',
              marginLeft: `${Math.round(12 * uiScale)}px`,
              color: '#FF88AA',
              animation: 'pulse 1.2s infinite'
            }}>
              进攻中
            </span>
          )}
        </div>
        <div style={{ fontSize: topFont, color: '#FF6688', textShadow: '0 0 8px rgba(255,100,140,0.6)', letterSpacing: 1 }}>
          生命 {gameState.lives}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: `${Math.round(16 * uiScale)}px`,
          display: 'flex',
          gap: `${Math.round(16 * uiScale)}px`,
          alignItems: 'center',
          padding: `${Math.round(12 * uiScale)}px ${Math.round(20 * uiScale)}px`,
          borderRadius: `${Math.round(14 * uiScale)}px`,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(120,255,160,0.2)',
          zIndex: 10
        }}
      >
        {COLORS.map(c => {
          const selected = selectedColor === c;
          const hex = COCOON_COLORS[c];
          return (
            <button
              key={c}
              onClick={() => setSelectedColor(c)}
              style={{
                position: 'relative',
                width: `${Math.round(56 * uiScale)}px`,
                height: `${Math.round(56 * uiScale)}px`,
                borderRadius: '50%',
                border: selected ? `3px solid #FFFFFF` : '3px solid transparent',
                background: hex,
                boxShadow: selected
                  ? `0 0 ${Math.round(18 * uiScale)}px ${hex}, inset 0 0 ${Math.round(10 * uiScale)}px rgba(255,255,255,0.4)`
                  : `0 0 ${Math.round(8 * uiScale)}px ${hex}`,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                transform: 'scale(1)',
                fontFamily: '"Press Start 2P", monospace'
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }}
              onMouseDown={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
              }}
              onMouseUp={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
              }}
            >
              <div style={{
              position: 'absolute',
              left: '50%',
              transform: 'translate(-50%, 50%)',
              bottom: `-${Math.round(22 * uiScale)}px`,
              whiteSpace: 'nowrap',
              fontSize: `${Math.round(9 * uiScale)}px`,
              color: gameState.score < COCOON_COST ? '#888888' : '#CCCCCC',
              letterSpacing: 1
            }}>
                {COLOR_LABELS[c]} {COCOON_COST}
              </div>
            </button>
          );
        })}

        {selectedCocoonInfo && (
            <div style={{
            height: `${Math.round(40 * uiScale)}px`,
            width: '1px',
            background: 'rgba(255,255,255,0.15)',
            marginLeft: `${Math.round(8 * uiScale)}px`
          }} />
          )}

        {selectedCocoonInfo && (
            <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: `${Math.round(6 * uiScale)}px`,
            alignItems: 'flex-start'
          }}>
              <div style={{
              fontSize: `${Math.round(8 * uiScale)}px`,
              color: COCOON_COLORS[selectedCocoonInfo.color],
              letterSpacing: 1
            }}>
              {COLOR_LABELS[selectedCocoonInfo.color]}光茧 L{selectedCocoonInfo.level}
              </div>
              {upgradeCost !== null ? (
                <button
                  onClick={handleUpgrade}
                  disabled={!canUpgrade}
                  style={{
                    padding: `${Math.round(6 * uiScale)}px ${Math.round(12 * uiScale)}px`,
                    fontSize: `${Math.round(8 * uiScale)}px`,
                    fontFamily: '"Press Start 2P", monospace',
                    color: canUpgrade ? '#000' : '#555',
                    background: canUpgrade ? '#00FF88' : '#333',
                    border: canUpgrade ? '2px solid #00CC66' : '2px solid #555',
                    borderRadius: '4px',
                    cursor: canUpgrade ? 'pointer' : 'not-allowed',
                    letterSpacing: 1,
                    transition: 'all 0.12s ease',
                    boxShadow: canUpgrade ? '0 0 8px rgba(0,255,100,0.5)' : 'none'
                  }}
                  onMouseEnter={e => {
                    if (canUpgrade) (e.currentTarget as HTMLButtonElement).style.background = '#00CC66';
                  }}
                  onMouseLeave={e => {
                    if (canUpgrade) (e.currentTarget as HTMLButtonElement).style.background = '#00FF88';
                  }}
                >
                  升级 {upgradeCost}
                </button>
              ) : (
                <div style={{ fontSize: `${Math.round(8 * uiScale)}px`, color: '#888', letterSpacing: 1 }}>已满级</div>
              )}
            </div>
          )}
      </div>

      {gameState.gameOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            animation: 'fadeIn 0.4s ease'
          }}
        >
          <div
            style={{
              minWidth: `${Math.round(340 * uiScale)}px`,
              padding: `${Math.round(40 * uiScale)}px ${Math.round(48 * uiScale)}px`,
              background: 'rgba(10, 18, 14)',
              border: '2px solid rgba(120,255,160,0.3)',
              borderRadius: `${Math.round(8 * uiScale)}px`,
              boxShadow: '0 0 40px rgba(0,255,120,0.15)',
              textAlign: 'center'
            }}
          >
            <h1
              style={{
                fontSize: `${Math.round(20 * uiScale)}px`,
                color: gameState.victory ? '#88FFAA' : '#FF88AA',
                textShadow: gameState.victory
                  ? '0 0 20px rgba(120,255,170,0.8)'
                  : '0 0 20px rgba(255,100,140,0.8)',
                marginBottom: `${Math.round(24 * uiScale)}px`,
                letterSpacing: 2,
                fontFamily: '"Press Start 2P", monospace'
              }}
            >
              {gameState.victory ? '胜 利 !' : '游戏结束'}
            </h1>
            <div
              style={{
                fontSize: `${Math.round(10 * uiScale)}px`,
                color: '#FFDD55',
                marginBottom: `${Math.round(10 * uiScale)}px`,
                letterSpacing: 1,
                lineHeight: 2
              }}
            >
              最终积分：{gameState.score}
            </div>
            <div
              style={{
                fontSize: `${Math.round(10 * uiScale)}px`,
                color: '#AADDFF',
                marginBottom: `${Math.round(32 * uiScale)}px`,
                letterSpacing: 1
              }}
            >
              到达波次：{gameState.wave} / 10
            </div>
            <button
              onClick={handleRestart}
              style={{
                padding: `${Math.round(14 * uiScale)}px ${Math.round(32 * uiScale)}px`,
                fontSize: `${Math.round(11 * uiScale)}px`,
                fontFamily: '"Press Start 2P", monospace',
                background: '#00FF00',
                color: '#001100',
                border: 'none',
                borderRadius: `${Math.round(4 * uiScale)}px`,
                cursor: 'pointer',
                letterSpacing: 2,
                transition: 'all 0.12s ease',
                boxShadow: '0 0 16px rgba(0,255,0,0.5)',
                transform: 'scale(1)'
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#00CC00';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#00FF00';
              }}
              onMouseDown={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
              }}
              onMouseUp={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.0)';
              }}
            >
              再试一次
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }
      `}</style>
    </div>
  );
}
