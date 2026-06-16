import React, { useEffect, useRef } from 'react';
import { GameState, TIDE_RISE_TIME, TIDE_FALL_TIME } from '../game/entities';

interface ToolbarProps {
  gameState: GameState;
}

export const Toolbar: React.FC<ToolbarProps> = ({ gameState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 20;
    const lineWidth = 5;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    const cycleTotal = TIDE_RISE_TIME + TIDE_FALL_TIME;
    let progress = 0;
    if (gameState.tidePhase === 'rising') {
      progress = gameState.tideTimer / TIDE_RISE_TIME;
    } else {
      progress = (TIDE_RISE_TIME + gameState.tideTimer) / cycleTotal;
    }

    const gradient = ctx.createConicGradient
      ? ctx.createConicGradient(-Math.PI / 2, cx, cy)
      : ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
    gradient.addColorStop(0, '#00BFFF');
    gradient.addColorStop(1, '#000080');

    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.ceil(gameState.tideLevel).toString(), cx, cy);
  }, [gameState.tideLevel, gameState.tidePhase, gameState.tideTimer]);

  return (
    <div
      style={{
        height: 60,
        background: '#162240',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        color: '#ffffff',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: '#00FF88',
            boxShadow: '0 0 8px #00FF88',
          }}
        />
        <span style={{ fontWeight: 'bold', fontSize: 20, color: '#ffffff' }}>
          {gameState.energy}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <canvas ref={canvasRef} width={50} height={50} />
        <span
          style={{
            fontSize: 16,
            color: gameState.tidePhase === 'rising' ? '#00BFFF' : '#88AAFF',
            fontWeight: 'bold',
          }}
        >
          {gameState.tidePhase === 'rising' ? '涨潮中' : '退潮中'}
        </span>
        {gameState.warningActive && (
          <span
            style={{
              fontSize: 14,
              color: '#FF6B6B',
              fontWeight: 'bold',
              animation: 'pulse 0.5s infinite',
            }}
          >
            ⚠ 预警
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontWeight: 'bold',
            fontSize: 20,
            color: '#FFD700',
            textShadow: '0 0 5px rgba(255, 215, 0, 0.5)',
          }}
        >
          {gameState.score}
        </span>
        <span style={{ fontSize: 12, color: '#aaa', opacity: 0.7 }}>分</span>
      </div>
    </div>
  );
};
