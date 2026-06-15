import React from 'react';

interface GameButtonsProps {
  onReset: () => void;
  onMenu: () => void;
}

export default function GameButtons({ onReset, onMenu }: GameButtonsProps) {
  const buttonStyle: React.CSSProperties = {
    width: 105,
    height: 32,
    borderRadius: 8,
    background: '#334155',
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: 'sans-serif',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = '#475569';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = '#334155';
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: 12,
        display: 'flex',
        gap: 10,
      }}
    >
      <button
        style={buttonStyle}
        onClick={onReset}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        重置关卡
      </button>
      <button
        style={buttonStyle}
        onClick={onMenu}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        返回菜单
      </button>
    </div>
  );
}
