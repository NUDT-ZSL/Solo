import React, { useState, useCallback } from 'react';
import { PALETTE } from '../GameEngine';

interface BottomPanelProps {
  onFeed: () => void;
  onBath: () => void;
  onPlay: () => void;
  onSleep: () => void;
  isNightMode: boolean;
}

interface ButtonConfig {
  icon: string;
  bgColor: string;
  action: () => void;
  disabled?: boolean;
}

const ActionButton: React.FC<ButtonConfig> = ({ icon, bgColor, action, disabled }) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = useCallback(() => {
    if (disabled) return;
    setIsPressed(true);
    action();
    setTimeout(() => {
      setIsPressed(false);
    }, 150);
  }, [action, disabled]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsPressed(true);
  }, [disabled]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (disabled) return;
    action();
    setTimeout(() => {
      setIsPressed(false);
    }, 150);
  }, [action, disabled]);

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      disabled={disabled}
      style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: '2px solid rgba(0,0,0,0.3)',
        backgroundColor: disabled ? '#666666' : bgColor,
        fontSize: '20px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: isPressed ? 'scale(0.85)' : 'scale(1)',
        transition: 'transform 0.1s ease-out',
        opacity: disabled ? 0.5 : 1,
        boxShadow: disabled ? 'none' : '0 4px 0 rgba(0,0,0,0.3), inset 0 -2px 0 rgba(0,0,0,0.2)',
        fontFamily: "'Press Start 2P', cursive",
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {icon}
    </button>
  );
};

const BottomPanel: React.FC<BottomPanelProps> = ({ onFeed, onBath, onPlay, onSleep, isNightMode }) => {
  return (
    <div
      style={{
        backgroundColor: PALETTE.uiBg,
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        gap: '16px',
      }}
    >
      <ActionButton
        icon="🍔"
        bgColor={PALETTE.red}
        action={onFeed}
        disabled={isNightMode}
      />
      <ActionButton
        icon="🚿"
        bgColor={PALETTE.blue}
        action={onBath}
      />
      <ActionButton
        icon="🎮"
        bgColor={PALETTE.brightGreen}
        action={onPlay}
        disabled={isNightMode}
      />
      <ActionButton
        icon="🌙"
        bgColor={PALETTE.purple}
        action={onSleep}
      />
    </div>
  );
};

export default BottomPanel;
