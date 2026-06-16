import React, { useState, useEffect, useRef } from 'react';
import type { DiceType } from './GameLogic';

interface DicePanelProps {
  dice: DiceType[];
  onDiceClick: (diceId: string) => void;
  onMerge: () => void;
  selectedCount: number;
  canMerge: boolean;
}

const DiceFace: React.FC<{ value: number; size?: number }> = ({ value, size = 50 }) => {
  const dotSize = size * 0.2;
  const padding = size * 0.16;

  const faceStyle: React.CSSProperties = {
    width: size,
    height: size,
    background: '#FFF8E1',
    borderRadius: 6,
    position: 'relative',
  };

  if (value === 0) {
    return (
      <div style={faceStyle}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: size * 0.4,
          fontWeight: 'bold',
          color: '#E74C3C',
        }}>
          ✕
        </div>
      </div>
    );
  }

  const getDotStyle = (pos: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: dotSize,
      height: dotSize,
      background: '#FFFFFF',
      borderRadius: '50%',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    };

    switch (pos) {
      case 'top-left':
        return { ...base, top: padding, left: padding };
      case 'top-right':
        return { ...base, top: padding, right: padding };
      case 'middle-left':
        return { ...base, top: '50%', left: padding, transform: 'translateY(-50%)' };
      case 'middle-right':
        return { ...base, top: '50%', right: padding, transform: 'translateY(-50%)' };
      case 'center':
        return { ...base, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      case 'bottom-left':
        return { ...base, bottom: padding, left: padding };
      case 'bottom-right':
        return { ...base, bottom: padding, right: padding };
      default:
        return base;
    }
  };

  const dotPositions: Record<number, string[]> = {
    1: ['center'],
    2: ['top-left', 'bottom-right'],
    3: ['top-left', 'center', 'bottom-right'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
  };

  const positions = dotPositions[value] || [];

  return (
    <div style={faceStyle}>
      {positions.map((pos, idx) => (
        <div key={idx} style={getDotStyle(pos)} />
      ))}
    </div>
  );
};

const MergeAnimation: React.FC<{
  dice1: DiceType;
  dice2: DiceType;
  onComplete: () => void;
}> = ({ dice1, dice2, onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(onComplete, 800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const flyingDiceStyle = (side: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute',
    top: '50%',
    [side]: 20,
    transform: 'translateY(-50%)',
    width: 60,
    height: 60,
    background: '#3E2723',
    borderRadius: 10,
    border: '2px solid #FFD700',
    boxShadow: '0 0 20px rgba(255, 215, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: side === 'left' ? 'fly-right 0.4s ease-in forwards' : 'fly-left 0.4s ease-in forwards',
    zIndex: 10,
  });

  const flashOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 0,
    height: 0,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255, 215, 0, 0.9) 0%, rgba(255, 165, 0, 0.6) 40%, transparent 70%)',
    animation: 'merge-flash 0.4s 0.35s ease-out forwards',
    pointerEvents: 'none',
    zIndex: 20,
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        borderRadius: 0,
      }}
    >
      <div style={flyingDiceStyle('left')}>
        <DiceFace value={dice1.value} size={44} />
      </div>
      <div style={flyingDiceStyle('right')}>
        <DiceFace value={dice2.value} size={44} />
      </div>
      <div style={flashOverlayStyle} />
    </div>
  );
};

const DicePanel: React.FC<DicePanelProps> = ({
  dice,
  onDiceClick,
  onMerge,
  selectedCount,
  canMerge,
}) => {
  const [showMergeAnimation, setShowMergeAnimation] = useState(false);
  const [mergingPair, setMergingPair] = useState<[DiceType, DiceType] | null>(null);

  const handleMergeClick = () => {
    if (!canMerge) return;
    const selected = dice.filter(d => d.isSelected);
    if (selected.length === 2) {
      setMergingPair([selected[0], selected[1]]);
      setShowMergeAnimation(true);
    }
  };

  const handleMergeComplete = () => {
    setShowMergeAnimation(false);
    setMergingPair(null);
    onMerge();
  };

  useEffect(() => {
    if (showMergeAnimation && mergingPair) {
      const timer = setTimeout(handleMergeComplete, 800);
      return () => clearTimeout(timer);
    }
  }, [showMergeAnimation]);

  const getDiceStyle = (die: DiceType): React.CSSProperties => {
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

    if (die.isSelected) {
      style.borderColor = '#FFD700';
      style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.6)';
    }

    if (die.isNew) {
      style.animation = 'dice-roll 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    }

    return style;
  };

  const mergeButtonStyle: React.CSSProperties = {
    padding: '12px 24px',
    fontSize: 16,
    fontWeight: 'bold',
    color: canMerge ? '#1A1A2E' : '#888',
    background: canMerge
      ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
      : '#555',
    border: 'none',
    borderRadius: 8,
    cursor: canMerge ? 'pointer' : 'not-allowed',
    transition: 'all 0.2s ease',
    boxShadow: canMerge ? '0 4px 15px rgba(255, 215, 0, 0.4)' : 'none',
  };

  return (
    <div
      style={{
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
      }}
    >
      {showMergeAnimation && mergingPair && (
        <MergeAnimation
          dice1={mergingPair[0]}
          dice2={mergingPair[1]}
          onComplete={() => {}}
        />
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {dice.map((die) => {
          const isMergingDie = showMergeAnimation && mergingPair &&
            (die.id === mergingPair[0].id || die.id === mergingPair[1].id);

          if (isMergingDie) {
            return (
              <div
                key={die.id}
                style={{
                  width: 60,
                  height: 60,
                  background: '#3E2723',
                  borderRadius: 10,
                  opacity: 0.3,
                  border: '2px solid #5D4037',
                }}
              />
            );
          }

          return (
            <div
              key={die.id}
              style={getDiceStyle(die)}
              onClick={() => onDiceClick(die.id)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
              }}
            >
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <DiceFace value={die.value} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginLeft: 30 }}>
        <button
          style={mergeButtonStyle}
          onClick={handleMergeClick}
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
