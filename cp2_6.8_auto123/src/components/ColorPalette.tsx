import React from 'react';
import { Color } from '../utils/colorMapper';

interface ColorPaletteProps {
  palette: Color[];
  locked: boolean[];
  onToggleLock: (index: number) => void;
  onPickColor: (index: number) => void;
  paletteRef: React.RefObject<HTMLDivElement>;
}

const ColorPalette: React.FC<ColorPaletteProps> = ({
  palette,
  locked,
  onToggleLock,
  onPickColor,
  paletteRef,
}) => {
  return (
    <div
      ref={paletteRef}
      data-palette
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      {palette.map((color, index) => (
        <div
          key={index}
          style={{
            width: '18%',
            marginBottom: 24,
            background: '#FFFFFF',
            borderRadius: 8,
            boxShadow: '0 1px 3px #CBD5E0, 0 1px 2px #CBD5E0',
            border: locked[index] ? '2px solid #D69E2E' : '2px solid transparent',
            animation: 'fadeIn 0.3s ease both',
            animationDelay: `${index * 0.05}s`,
            overflow: 'hidden',
            position: 'relative',
            transition: 'transform 0.2s ease',
          }}
        >
          <button
            onClick={() => onToggleLock(index)}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 28,
              height: 28,
              borderRadius: 6,
              background: locked[index] ? '#D69E2E' : 'rgba(255,255,255,0.85)',
              color: locked[index] ? '#fff' : '#2D3748',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              transition: 'background 0.2s ease, transform 0.1s ease',
            }}
            onMouseEnter={(e) => {
              if (!locked[index]) (e.currentTarget as HTMLButtonElement).style.background = '#EDF2F7';
            }}
            onMouseLeave={(e) => {
              if (!locked[index]) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.85)';
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
            title={locked[index] ? '取消锁定' : '锁定颜色'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              {locked[index] ? (
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
              ) : (
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2c0-1.66 1.34-3 3-3s3 1.34 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
              )}
            </svg>
          </button>

          <button
            onClick={() => !locked[index] && onPickColor(index)}
            style={{
              display: 'block',
              width: '100%',
              height: 200,
              background: color.hex,
              cursor: locked[index] ? 'default' : 'pointer',
              border: 'none',
              padding: 0,
            }}
            title={locked[index] ? '已锁定' : '点击选择颜色'}
          />

          <div style={{ padding: '12px 14px 14px', textAlign: 'left' }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#2D3748',
                marginBottom: 4,
              }}
            >
              {color.name}
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#718096',
                fontFamily: 'Menlo, Consolas, monospace',
                letterSpacing: 0.3,
                textTransform: 'uppercase',
              }}
            >
              {color.hex.toUpperCase()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ColorPalette;
