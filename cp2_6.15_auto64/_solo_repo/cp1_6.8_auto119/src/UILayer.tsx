import React, { useEffect, useRef, useCallback } from 'react';
import { GameState, WORLD_W, WORLD_H } from './types';

interface Props {
  state: GameState;
  onRestart: () => void;
  onNextLevel: () => void;
  onRestartGame: () => void;
  onMove: (dx: number, dy: number) => void;
}

export const UILayer: React.FC<Props> = ({ state, onRestart, onNextLevel, onRestartGame, onMove }) => {
  const miniRef = useRef<HTMLCanvasElement>(null);
  const { level, energy, maxEnergy, detected, mechanismsTotal, mechanismsActivated, guards, playerPos, levelWalls, exitPos, gameStatus } = state;

  useEffect(() => {
    const canvas = miniRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sw = 160, sh = 107;
    canvas.width = sw * 2;
    canvas.height = sh * 2;
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, sw, sh);

    const sx = sw / WORLD_W;
    const sy = sh / WORLD_H;

    ctx.fillStyle = 'rgba(10,8,20,0.7)';
    ctx.fillRect(0, 0, sw, sh);

    for (const w of levelWalls) {
      ctx.fillStyle = 'rgba(60,50,40,0.8)';
      ctx.fillRect(w.x * sx, w.y * sy, w.w * sx, w.h * sy);
    }

    ctx.beginPath();
    ctx.arc(exitPos.x * sx, exitPos.y * sy, 4, 0, Math.PI * 2);
    ctx.fillStyle = mechanismsActivated === mechanismsTotal ? 'rgba(80,255,120,0.9)' : 'rgba(80,80,80,0.6)';
    ctx.fill();

    for (const g of guards) {
      ctx.save();
      ctx.translate(g.x * sx, g.y * sy);
      ctx.rotate(g.angle);
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(-3, -3);
      ctx.lineTo(-3, 3);
      ctx.closePath();
      ctx.fillStyle = g.state === 'stunned' ? 'rgba(128,128,128,0.7)' : 'rgba(160,80,200,0.9)';
      ctx.fill();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(playerPos.x * sx, playerPos.y * sy, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(220,235,255,0.95)';
    ctx.shadowColor = 'rgba(200,220,255,0.8)';
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [state]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r') {
        if (gameStatus === 'lost') onRestart();
        if (gameStatus === 'won') onRestartGame();
      }
      if (e.key.toLowerCase() === 'n' && gameStatus === 'levelComplete') {
        onNextLevel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameStatus, onRestart, onNextLevel, onRestartGame]);

  const startTouch = useCallback((dx: number, dy: number) => {
    const iv = setInterval(() => onMove(dx, dy), 16);
    const stop = () => { clearInterval(iv); window.removeEventListener('mouseup', stop); window.removeEventListener('touchend', stop); };
    window.addEventListener('mouseup', stop, { once: true });
    window.addEventListener('touchend', stop, { once: true });
  }, [onMove]);

  const energyPct = energy / maxEnergy;
  const detectionFlash = detected ? 'detect-flash' : '';

  return (
    <>
      <div className={`detect-border ${detectionFlash}`} />

      <div className="panel top-left">
        <div className="panel-label">第 {level + 1} 关</div>
        <div className="energy-bar-container">
          <div className="energy-bar-label">声波能量</div>
          <div className="energy-bar-track">
            <div className="energy-bar-fill" style={{ width: `${energyPct * 100}%` }} />
            <div className="energy-bar-segments">
              {Array.from({ length: maxEnergy }).map((_, i) => (
                <div key={i} className={`energy-segment ${i < energy ? 'active' : ''}`} />
              ))}
            </div>
          </div>
        </div>
        <div className="mechanism-progress">
          机关 {mechanismsActivated}/{mechanismsTotal}
        </div>
        <div className={`detection-indicator ${detected ? 'active' : ''}`}>
          <span className="detect-dot" />
          {detected ? '⚠ 暗影侦测中' : '安全'}
        </div>
      </div>

      <div className="panel bottom-right">
        <canvas ref={miniRef} className="minimap" />
      </div>

      <div className="touch-controls">
        <button className="touch-btn up" onPointerDown={() => startTouch(0, -1)} onTouchStart={(e) => { e.preventDefault(); startTouch(0, -1); }}>▲</button>
        <button className="touch-btn left" onPointerDown={() => startTouch(-1, 0)} onTouchStart={(e) => { e.preventDefault(); startTouch(-1, 0); }}>◀</button>
        <button className="touch-btn right" onPointerDown={() => startTouch(1, 0)} onTouchStart={(e) => { e.preventDefault(); startTouch(1, 0); }}>▶</button>
        <button className="touch-btn down" onPointerDown={() => startTouch(0, 1)} onTouchStart={(e) => { e.preventDefault(); startTouch(0, 1); }}>▼</button>
      </div>

      <style>{`
        .detect-border {
          position: fixed;
          inset: 0;
          pointer-events: none;
          border: 3px solid transparent;
          z-index: 50;
          transition: border-color 0.15s;
        }
        .detect-border.detect-flash {
          animation: detectPulse 0.5s ease-in-out infinite alternate;
        }
        @keyframes detectPulse {
          0% { border-color: rgba(255,40,40,0.7); }
          100% { border-color: rgba(255,40,40,0.15); }
        }

        .panel {
          position: fixed;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          background: rgba(15,12,25,0.65);
          border: 1px solid rgba(100,80,140,0.3);
          border-radius: 12px;
          padding: 14px 18px;
          color: #c8c0d8;
          font-family: 'Segoe UI', system-ui, sans-serif;
          z-index: 100;
        }
        .top-left {
          top: 16px;
          left: 16px;
          min-width: 180px;
        }
        .bottom-right {
          bottom: 16px;
          right: 16px;
          padding: 8px;
        }

        .panel-label {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 10px;
          color: #e8e0f0;
          letter-spacing: 1px;
        }

        .energy-bar-container {
          margin-bottom: 10px;
        }
        .energy-bar-label {
          font-size: 11px;
          color: rgba(160,200,255,0.8);
          margin-bottom: 4px;
        }
        .energy-bar-track {
          position: relative;
          height: 14px;
          background: rgba(30,25,50,0.8);
          border-radius: 7px;
          overflow: hidden;
          border: 1px solid rgba(80,120,180,0.3);
        }
        .energy-bar-fill {
          position: absolute;
          top: 0; left: 0; bottom: 0;
          background: linear-gradient(90deg, rgba(60,140,255,0.6), rgba(100,180,255,0.8));
          border-radius: 7px;
          transition: width 0.3s ease;
        }
        .energy-bar-segments {
          position: absolute;
          inset: 0;
          display: flex;
          gap: 2px;
          padding: 2px;
        }
        .energy-segment {
          flex: 1;
          border-radius: 4px;
          background: rgba(0,0,0,0.3);
          transition: background 0.3s;
        }
        .energy-segment.active {
          background: rgba(120,190,255,0.5);
          box-shadow: 0 0 6px rgba(100,180,255,0.4);
        }

        .mechanism-progress {
          font-size: 12px;
          color: rgba(255,215,0,0.7);
          margin-bottom: 8px;
        }

        .detection-indicator {
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          color: rgba(160,160,180,0.7);
        }
        .detection-indicator.active {
          color: rgba(255,80,80,0.95);
        }
        .detect-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(80,80,100,0.5);
          display: inline-block;
        }
        .detection-indicator.active .detect-dot {
          background: rgba(255,50,50,0.9);
          box-shadow: 0 0 8px rgba(255,50,50,0.6);
          animation: blink 0.4s ease-in-out infinite alternate;
        }
        @keyframes blink {
          0% { opacity: 1; }
          100% { opacity: 0.3; }
        }

        .minimap {
          width: 160px;
          height: 107px;
          border-radius: 6px;
          image-rendering: pixelated;
        }

        .touch-controls {
          position: fixed;
          bottom: 24px;
          left: 24px;
          display: none;
          z-index: 100;
        }
        @media (pointer: coarse) {
          .touch-controls {
            display: grid;
            grid-template-columns: 48px 48px 48px;
            grid-template-rows: 48px 48px;
            gap: 4px;
          }
        }
        .touch-btn {
          width: 48px;
          height: 48px;
          border: 1px solid rgba(100,80,140,0.4);
          border-radius: 10px;
          background: rgba(15,12,25,0.55);
          backdrop-filter: blur(8px);
          color: rgba(200,190,220,0.8);
          font-size: 18px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .touch-btn:active {
          background: rgba(100,80,180,0.3);
          border-color: rgba(140,120,200,0.6);
        }
        .touch-btn.up { grid-column: 2; grid-row: 1; }
        .touch-btn.left { grid-column: 1; grid-row: 2; }
        .touch-btn.right { grid-column: 3; grid-row: 2; }
        .touch-btn.down { grid-column: 2; grid-row: 2; }
      `}</style>
    </>
  );
};
