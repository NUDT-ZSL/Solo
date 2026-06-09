import React, { useMemo } from 'react';
import { BASE_COLORS } from './useVineDraw';

interface ColorPaletteProps {
  colors: string[];
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({ colors, selectedColor, onColorSelect }) => {
  const swatches = useMemo(() => {
    return colors.map((color, idx) => ({ color, idx }));
  }, [colors]);

  const angleStep = (Math.PI * 2) / swatches.length;
  const radius = 18;
  const cx = 30, cy = 30;

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: 'rgba(46, 59, 46, 0.85)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        backdropFilter: 'blur(8px)',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <svg width="60" height="60" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
        <circle cx={cx} cy={cy} r="28" fill="none" stroke="rgba(124, 179, 66, 0.2)" strokeWidth="1" />
      </svg>
      {swatches.map(({ color, idx }) => {
        const angle = angleStep * idx - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        const isSelected = color === selectedColor;
        return (
          <button
            key={color}
            onClick={() => onColorSelect(color)}
            style={{
              position: 'absolute',
              left: x - 9,
              top: y - 9,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: color,
              border: isSelected ? '2px solid #fff' : '2px solid rgba(255,255,255,0.3)',
              boxShadow: isSelected
                ? `0 0 12px ${color}, 0 2px 8px rgba(0,0,0,0.5)`
                : '0 1px 4px rgba(0,0,0,0.4)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              padding: 0,
              transform: isSelected ? 'scale(1.15)' : 'scale(1)'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = isSelected ? 'scale(1.2)' : 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = isSelected ? 'scale(1.15)' : 'scale(1)';
            }}
          />
        );
      })}
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: selectedColor,
          boxShadow: `inset 0 0 4px rgba(0,0,0,0.3), 0 0 8px ${selectedColor}`,
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};

interface SpeedDisplayProps {
  speed: number;
  currentColor: string;
}

export const SpeedDisplay: React.FC<SpeedDisplayProps> = ({ speed, currentColor }) => {
  const clampedSpeed = Math.min(600, Math.max(0, speed));
  const speedRatio = clampedSpeed / 600;
  const hue = 120 - speedRatio * 20;
  const sat = 50 + speedRatio * 30;
  const displayColor = `hsl(${hue}, ${sat}%, 55%)`;

  return (
    <div
      style={{
        position: 'absolute',
        top: 92,
        left: 20,
        padding: '8px 14px',
        background: 'rgba(46, 59, 46, 0.85)',
        borderRadius: 10,
        boxShadow: '0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(8px)',
        zIndex: 10,
        fontSize: 14,
        fontWeight: 600,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: displayColor,
        textShadow: `0 0 8px ${displayColor}40`,
        transition: 'color 0.3s ease',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M7 1C5.5 2.5 5 4 5 5.5C5 7.5 6.5 9 7 13C7.5 9 9 7.5 9 5.5C9 4 8.5 2.5 7 1Z"
          fill={displayColor}
          opacity="0.8"
        />
      </svg>
      <span>{Math.round(speed)} px/s</span>
    </div>
  );
};

interface ActionButtonsProps {
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ onUndo, onRedo, onExport, canUndo, canRedo }) => {
  const buttonStyle = (enabled: boolean): React.CSSProperties => ({
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'rgba(46, 59, 46, 0.85)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
    backdropFilter: 'blur(8px)',
    border: 'none',
    cursor: enabled ? 'pointer' : 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    opacity: enabled ? 1 : 0.4
  });

  const hoverProps = (enabled: boolean) => enabled ? {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = 'scale(1.1)';
      e.currentTarget.style.background = 'rgba(60, 75, 60, 0.9)';
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.background = 'rgba(46, 59, 46, 0.85)';
    },
    onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = 'scale(0.95)';
    },
    onMouseUp: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = 'scale(1.1)';
    }
  } : {};

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        display: 'flex',
        gap: 12,
        zIndex: 10
      }}
    >
      <button
        style={buttonStyle(canUndo)}
        onClick={onUndo}
        disabled={!canUndo}
        title="撤销 (Ctrl+Z)"
        {...hoverProps(canUndo)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A5D6A7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
        </svg>
      </button>

      <button
        style={buttonStyle(canRedo)}
        onClick={onRedo}
        disabled={!canRedo}
        title="重做 (Ctrl+Shift+Z)"
        {...hoverProps(canRedo)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A5D6A7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 15-6.7L21 13" />
        </svg>
      </button>

      <button
        style={buttonStyle(true)}
        onClick={onExport}
        title="导出 SVG"
        {...hoverProps(true)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#81C784" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </div>
  );
};

export const UIControls = {
  ColorPalette,
  SpeedDisplay,
  ActionButtons
};

export default UIControls;
