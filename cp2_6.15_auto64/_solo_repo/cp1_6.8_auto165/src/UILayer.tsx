import React from 'react';
import type { GameState } from './GameEngine';

interface UILayerProps {
  state: GameState;
  onReset: () => void;
}

const UILayer: React.FC<UILayerProps> = ({ state, onReset }) => {
  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timePercent = state.timeLeft / 90;

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    fontFamily: "'Segoe UI', sans-serif",
    userSelect: 'none',
  };

  const infoPanelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 24,
    left: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  const scoreStyle: React.CSSProperties = {
    fontSize: 36,
    fontWeight: 700,
    color: '#c0a0ff',
    textShadow: '0 0 20px rgba(160, 120, 255, 0.6)',
    letterSpacing: 2,
  };

  const timeStyle: React.CSSProperties = {
    fontSize: 22,
    color: timePercent > 0.3 ? '#9080cc' : '#ff6060',
    textShadow: '0 0 10px rgba(160, 120, 255, 0.4)',
  };

  const energyBarStyle: React.CSSProperties = {
    display: 'flex',
    gap: 6,
    marginTop: 4,
  };

  const energyDotStyle = (filled: boolean): React.CSSProperties => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: filled
      ? 'rgba(100, 140, 255, 0.9)'
      : 'rgba(60, 50, 100, 0.4)',
    boxShadow: filled ? '0 0 6px rgba(100, 140, 255, 0.6)' : 'none',
    transition: 'all 0.3s ease',
  });

  const resetBtnStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 24,
    right: 24,
    pointerEvents: 'auto',
    padding: '10px 24px',
    border: '1px solid rgba(160, 120, 255, 0.3)',
    borderRadius: 12,
    background: 'rgba(40, 20, 80, 0.4)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: '#b090ee',
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    letterSpacing: 1,
  };

  const hintStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 24,
    left: 24,
    fontSize: 13,
    color: 'rgba(140, 120, 200, 0.5)',
    maxWidth: 220,
    lineHeight: 1.6,
  };

  return (
    <div style={containerStyle}>
      <div style={infoPanelStyle}>
        <div style={scoreStyle}>{state.score}</div>
        <div style={timeStyle}>{formatTime(state.timeLeft)}</div>
        <div style={energyBarStyle}>
          {Array.from({ length: state.maxEnergyBalls }, (_, i) => (
            <div key={i} style={energyDotStyle(i < state.energyBalls)} />
          ))}
        </div>
      </div>

      <button
        style={resetBtnStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(60, 30, 120, 0.6)';
          e.currentTarget.style.borderColor = 'rgba(160, 120, 255, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(40, 20, 80, 0.4)';
          e.currentTarget.style.borderColor = 'rgba(160, 120, 255, 0.3)';
        }}
        onClick={onReset}
      >
        ↺ 重置
      </button>

      {!state.isStarted && !state.isGameOver && (
        <div style={hintStyle}>
          从能量球拖拽以发射黑洞，黑洞会吸引并收集粒子，坍缩爆炸后获得分数
        </div>
      )}
    </div>
  );
};

export default UILayer;
