import React from 'react';
import type { DiceType } from './GameLogic';

interface DicePanelProps {
  dice: DiceType[];
  onDiceClick: (diceId: string) => void;
  onMerge: () => void;
  selectedCount: number;
  canMerge: boolean;
}

const dicePanelStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  height: 120,
  background: 'rgba(62, 39, 35, 0.95)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 20px',
  zIndex: 100,
  borderTop: '2px solid #5D4037',
};

const diceContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
};

const getDiceStyle = (isSelected: boolean, isNew: boolean, isMerging: boolean): React.CSSProperties => {
  let style: React.CSSProperties = {
    width: 60,
    height: 60,
    background: '#3E2723',
    borderRadius: 10,
    cursor: 'pointer',
    position: 'relative',
    transition: 'transform 0.1s ease',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.5)',
    border: '2px solid #5D4037',
  };

  if (isSelected) {
    style.borderColor = '#FFD700';
    style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.6)';
  }

  if (isNew) {
    style.animation = 'dice-roll 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
  }

  if (isMerging) {
    style.animation = 'merge-pulse 0.3s ease-out';
  }

  return style;
};

const diceInnerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const diceFaceStyle: React.CSSProperties = {
  width: 50,
  height: 50,
  background: '#FFF8E1',
  borderRadius: 6,
  position: 'relative',
  padding: 6,
  boxSizing: 'border-box',
};

const getDotStyle = (position: string): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 10,
    height: 10,
    background: '#FFFFFF',
    borderRadius: '50%',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
  };

  switch (position) {
    case 'top-left':
      return { ...base, top: 8, left: 8 };
    case 'top-right':
      return { ...base, top: 8, right: 8 };
    case 'middle-left':
      return { ...base, top: '50%', left: 8, transform: 'translateY(-50%)' };
    case 'middle-right':
      return { ...base, top: '50%', right: 8, transform: 'translateY(-50%)' };
    case 'center':
      return { ...base, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    case 'bottom-left':
      return { ...base, bottom: 8, left: 8 };
    case 'bottom-right':
      return { ...base, bottom: 8, right: 8 };
    default:
      return base;
  }
};

const mergeGlowStyle: React.CSSProperties = {
  position: 'absolute',
  top: -5,
  left: -5,
  right: -5,
  bottom: -5,
  borderRadius: 12,
  background: 'radial-gradient(circle, rgba(255, 215, 0, 0.6) 0%, transparent 70%)',
  animation: 'glow-effect 0.3s ease-out',
  pointerEvents: 'none',
};

const panelActionsStyle: React.CSSProperties = {
  marginLeft: 30,
};

const mergeButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  fontSize: 16,
  fontWeight: 'bold',
  color: '#1A1A2E',
  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
};

const disabledButtonStyle: React.CSSProperties = {
  ...mergeButtonStyle,
  background: '#555',
  color: '#888',
  cursor: 'not-allowed',
  boxShadow: 'none',
};

const DiceFace: React.FC<{ value: number }> = ({ value }) => {
  if (value === 0) {
    return (
      <div style={diceFaceStyle}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 20,
          fontWeight: 'bold',
          color: '#E74C3C',
        }}>
          ✕
        </div>
      </div>
    );
  }

  const dotPositions: Record<number, string[]> = {
    1: ['center'],
    2: ['top-left', 'bottom-right'],
    3: ['top-left', 'center', 'bottom-right'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
  };

  const positions = dotPositions[value] || [];

  return (
    <div style={diceFaceStyle}>
      {positions.map((pos, idx) => (
        <div key={idx} style={getDotStyle(pos)} />
      ))}
    </div>
  );
};

const DicePanel: React.FC<DicePanelProps> = ({ dice, onDiceClick, onMerge, selectedCount, canMerge }) => {
  return (
    <div style={dicePanelStyle}>
      <div style={diceContainerStyle}>
        {dice.map((die) => (
          <div
            key={die.id}
            style={getDiceStyle(die.isSelected, die.isNew, die.isMerging)}
            onClick={() => onDiceClick(die.id)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
            }}
          >
            <div style={diceInnerStyle}>
              <DiceFace value={die.value} />
            </div>
            {die.isMerging && <div style={mergeGlowStyle} />}
          </div>
        ))}
      </div>
      <div style={panelActionsStyle}>
        <button
          style={canMerge ? mergeButtonStyle : disabledButtonStyle}
          onClick={onMerge}
          disabled={!canMerge}
          onMouseEnter={(e) => {
            if (canMerge) {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = canMerge
              ? '0 4px 15px rgba(255, 215, 0, 0.4)'
              : 'none';
          }}
        >
          合成骰子 ({selectedCount}/2)
        </button>
      </div>
    </div>
  );
};

export default DicePanel;
