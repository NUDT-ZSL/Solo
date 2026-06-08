import React from 'react';
import { GameState, GamePhase, canDraw } from './GameLogic';

interface ControlPanelProps {
  gameState: GameState;
  onReset: () => void;
  onNextLevel: () => void;
  totalLevels: number;
}

const phaseLabels: Record<GamePhase, string> = {
  idle: '等待绘制',
  drawing: '绘制中...',
  simulating: '模拟运行',
  won: '🎉 通关！',
  lost: '💫 重试',
};

const ControlPanel: React.FC<ControlPanelProps> = ({ gameState, onReset, onNextLevel, totalLevels }) => {
  const energyPercent = (gameState.energy / gameState.maxEnergy) * 100;
  const energyColor = energyPercent > 50 ? '#44aaff' : energyPercent > 25 ? '#ffaa44' : '#ff4444';
  const drawEnabled = canDraw(gameState);

  const gatesProgress = gameState.starGates.filter((g) => g.unlocked).length;
  const gatesTotal = gameState.starGates.length;
  const fragmentsProgress = gameState.starFragments.filter((f) => f.collected).length;
  const fragmentsTotal = gameState.starFragments.length;

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 20,
    right: 20,
    width: 240,
    padding: '16px 20px',
    background: 'rgba(15, 15, 40, 0.65)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(100, 150, 255, 0.15)',
    borderRadius: 16,
    color: '#c0d0e8',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    fontSize: 13,
    zIndex: 10,
    userSelect: 'none',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#7888a8',
    marginBottom: 4,
  };

  const energyBarBg: React.CSSProperties = {
    width: '100%',
    height: 8,
    borderRadius: 4,
    background: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: 12,
  };

  const energyBarFill: React.CSSProperties = {
    width: `${energyPercent}%`,
    height: '100%',
    borderRadius: 4,
    background: energyColor,
    transition: 'width 0.15s ease, background 0.3s ease',
    boxShadow: `0 0 8px ${energyColor}44`,
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  };

  const buttonBase: React.CSSProperties = {
    border: '1px solid rgba(100,150,255,0.25)',
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    outline: 'none',
  };

  const resetBtnStyle: React.CSSProperties = {
    ...buttonBase,
    background: 'rgba(255,80,80,0.15)',
    color: '#ff8888',
  };

  const nextBtnStyle: React.CSSProperties = {
    ...buttonBase,
    background: 'rgba(80,255,120,0.15)',
    color: '#88ffaa',
  };

  const phaseBadgeStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 10,
    fontSize: 11,
    background: gameState.phase === 'won'
      ? 'rgba(80,255,120,0.15)'
      : gameState.phase === 'lost'
        ? 'rgba(255,80,80,0.15)'
        : 'rgba(80,150,255,0.15)',
    color: gameState.phase === 'won'
      ? '#88ffaa'
      : gameState.phase === 'lost'
        ? '#ff8888'
        : '#88bbff',
    transition: 'all 0.3s ease',
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#d0e0ff' }}>
          第 {gameState.levelIndex + 1} 关
        </span>
        <span style={phaseBadgeStyle}>{phaseLabels[gameState.phase]}</span>
      </div>

      <div style={labelStyle}>能量</div>
      <div style={energyBarBg}>
        <div style={energyBarFill} />
      </div>
      <div style={{ ...rowStyle, marginTop: -6 }}>
        <span style={{ fontSize: 11, color: '#7888a8' }}>
          {Math.floor(gameState.energy)} / {gameState.maxEnergy}
        </span>
        <span style={{ fontSize: 10, color: drawEnabled ? '#88ffaa' : '#ff8888' }}>
          {drawEnabled ? '● 可绘制' : '● 能量不足'}
        </span>
      </div>

      <div style={{ height: 1, background: 'rgba(100,150,255,0.1)', margin: '10px 0' }} />

      <div style={labelStyle}>关卡进度</div>
      <div style={rowStyle}>
        <span style={{ fontSize: 12 }}>星门</span>
        <span style={{ fontSize: 12, color: gatesProgress === gatesTotal ? '#88ffaa' : '#c0d0e8' }}>
          {gatesProgress} / {gatesTotal}
        </span>
      </div>
      <div style={rowStyle}>
        <span style={{ fontSize: 12 }}>恒星碎片</span>
        <span style={{ fontSize: 12, color: fragmentsProgress === fragmentsTotal ? '#88ffaa' : '#c0d0e8' }}>
          {fragmentsProgress} / {fragmentsTotal}
        </span>
      </div>

      <div style={{ height: 1, background: 'rgba(100,150,255,0.1)', margin: '10px 0' }} />

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          style={resetBtnStyle}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = 'rgba(255,80,80,0.3)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = 'rgba(255,80,80,0.15)';
          }}
          onClick={onReset}
        >
          重置
        </button>
        {gameState.phase === 'won' && gameState.levelIndex < totalLevels - 1 && (
          <button
            style={nextBtnStyle}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = 'rgba(80,255,120,0.3)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'rgba(80,255,120,0.15)';
            }}
            onClick={onNextLevel}
          >
            下一关 →
          </button>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
