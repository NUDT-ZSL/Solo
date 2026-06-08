import React from 'react';

interface HUDProps {
  levelId: number;
  levelName: string;
  soulStones: number;
  totalSoulStones: number;
  onPause: () => void;
  onSettings: () => void;
  paused: boolean;
}

const hudStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 56,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 20px',
  pointerEvents: 'none',
  zIndex: 10,
};

const glassBase: React.CSSProperties = {
  background: 'rgba(15, 10, 30, 0.55)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.1)',
  padding: '6px 14px',
  color: '#e0d8f0',
  fontFamily: '"Press Start 2P", "Courier New", monospace',
  fontSize: 12,
  letterSpacing: 1,
  userSelect: 'none',
};

const leftStyle: React.CSSProperties = {
  ...glassBase,
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  pointerEvents: 'auto',
};

const rightStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  pointerEvents: 'auto',
};

const btnStyle: React.CSSProperties = {
  ...glassBase,
  cursor: 'pointer',
  padding: '6px 10px',
  fontSize: 14,
  pointerEvents: 'auto',
  transition: 'background 0.2s',
};

const soulDot: React.CSSProperties = {
  display: 'inline-block',
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: 'radial-gradient(circle, #a78bfa, #6d28d9)',
  boxShadow: '0 0 6px #a78bfa',
  marginRight: 4,
  verticalAlign: 'middle',
};

const soulDotEmpty: React.CSSProperties = {
  ...soulDot,
  background: 'rgba(100,80,140,0.3)',
  boxShadow: 'none',
};

const bottomStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 12,
  left: '50%',
  transform: 'translateX(-50%)',
  ...glassBase,
  fontSize: 10,
  color: 'rgba(200,190,220,0.7)',
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
};

const HUD: React.FC<HUDProps> = ({ levelId, levelName, soulStones, totalSoulStones, onPause, onSettings, paused }) => {
  const dots = [];
  for (let i = 0; i < totalSoulStones; i++) {
    dots.push(
      <span key={i} style={i < soulStones ? soulDot : soulDotEmpty} />
    );
  }

  return (
    <>
      <div style={hudStyle}>
        <div style={leftStyle}>
          <span>第{levelId}关</span>
          <span style={{ color: '#9f8ac0' }}>{levelName}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {dots}
          </span>
        </div>
        <div style={rightStyle}>
          <button style={btnStyle} onClick={onPause}>
            {paused ? '▶' : '❚❚'}
          </button>
          <button style={btnStyle} onClick={onSettings}>
            ⚙
          </button>
        </div>
      </div>
      <div style={bottomStyle}>
        WASD / 方向键移动 &nbsp;·&nbsp; E 推方块 &nbsp;·&nbsp; 空格跳跃 &nbsp;·&nbsp; 鼠标拖拽方块
      </div>
    </>
  );
};

export default HUD;
