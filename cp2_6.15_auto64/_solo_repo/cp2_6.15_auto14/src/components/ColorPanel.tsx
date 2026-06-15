import React, { useRef } from 'react';
import { Plus } from 'lucide-react';
import { usePixelState } from '../PixelState';
import { RGB } from '../types';
import { rgbToString, rgbToHex, hexToRgb, colorsEqual } from '../utils/colorUtils';

const ColorPanel: React.FC<{ collapsed?: boolean; onClose?: () => void }> = ({ collapsed, onClose }) => {
  const { state, dispatch } = usePixelState();
  const { palette, currentColor } = state.color;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleColorSelect = (color: RGB) => {
    dispatch({ type: 'SET_COLOR', payload: color });
  };

  const handleAddCustomColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    if (hex && hex.length === 7) {
      const rgb = hexToRgb(hex);
      dispatch({ type: 'ADD_PALETTE_COLOR', payload: rgb });
      dispatch({ type: 'SET_COLOR', payload: rgb });
    }
  };

  if (collapsed) {
    return (
      <div
        onClick={onClose}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: rgbToString(currentColor),
          border: '3px solid #569cd6',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          position: 'fixed',
          left: '16px',
          top: '70px',
          zIndex: 100
        }}
        title="展开颜色面板"
      />
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>调色板</span>
      </div>

      <div style={styles.currentColorRow}>
        <span style={styles.label}>当前颜色</span>
        <div
          style={{
            ...styles.currentColorBox,
            backgroundColor: rgbToString(currentColor),
            border: '2px solid #ffffff'
          }}
          title={rgbToHex(currentColor)}
        />
        <span style={styles.hexLabel}>{rgbToHex(currentColor).toUpperCase()}</span>
      </div>

      <div style={styles.paletteTitle}>经典 16 色</div>
      <div style={styles.paletteGrid}>
        {palette.slice(0, 16).map((color, i) => {
          const isActive = colorsEqual(color, currentColor);
          return (
            <button
              key={`p-${i}`}
              className={`color-swatch ${isActive ? 'active' : ''}`}
              onClick={() => handleColorSelect(color)}
              style={{
                ...styles.colorSwatch,
                backgroundColor: rgbToString(color),
                ...(isActive ? styles.colorSwatchActive : {})
              }}
              title={rgbToHex(color).toUpperCase()}
            />
          );
        })}
      </div>

      {palette.length > 16 && (
        <>
          <div style={styles.paletteTitle}>自定义颜色</div>
          <div style={styles.paletteGrid}>
            {palette.slice(16).map((color, i) => {
              const isActive = colorsEqual(color, currentColor);
              return (
                <button
                  key={`c-${i}`}
                  className={`color-swatch ${isActive ? 'active' : ''}`}
                  onClick={() => handleColorSelect(color)}
                  style={{
                    ...styles.colorSwatch,
                    backgroundColor: rgbToString(color),
                    ...(isActive ? styles.colorSwatchActive : {})
                  }}
                  title={rgbToHex(color).toUpperCase()}
                />
              );
            })}
          </div>
        </>
      )}

      <button
        style={styles.addColorBtn}
        onClick={() => fileInputRef.current?.click()}
        title="添加自定义颜色"
      >
        <Plus size={16} color="#569cd6" />
        <span style={{ marginLeft: '6px' }}>添加颜色</span>
      </button>
      <input
        ref={fileInputRef}
        type="color"
        style={{ display: 'none' }}
        onChange={handleAddCustomColor}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '220px',
    backgroundColor: '#252526',
    borderRight: '1px solid #3e3e42',
    padding: '14px',
    overflowY: 'auto',
    overflowX: 'hidden',
    boxSizing: 'border-box',
    color: '#ddd',
    height: '100%',
    userSelect: 'none'
  },
  header: {
    marginBottom: '16px',
    paddingBottom: '10px',
    borderBottom: '1px solid #3e3e42'
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#fff',
    letterSpacing: '0.5px'
  },
  currentColorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
    padding: '10px',
    backgroundColor: '#1e1e1e',
    borderRadius: '6px'
  },
  label: {
    fontSize: '12px',
    color: '#999'
  },
  currentColorBox: {
    width: '32px',
    height: '32px',
    borderRadius: '4px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
  },
  hexLabel: {
    fontSize: '11px',
    color: '#888',
    fontFamily: 'monospace'
  },
  paletteTitle: {
    fontSize: '11px',
    color: '#888',
    marginBottom: '8px',
    marginTop: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.8px'
  },
  paletteGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
    marginBottom: '14px'
  },
  colorSwatch: {
    width: '100%',
    aspectRatio: '1',
    border: '2px solid transparent',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'transform 0.1s, border-color 0.1s',
    padding: 0,
    outline: 'none'
  },
  colorSwatchActive: {
    borderColor: '#ffffff',
    transform: 'scale(1.08)',
    boxShadow: '0 0 8px rgba(255,255,255,0.3)'
  },
  addColorBtn: {
    width: '100%',
    padding: '10px',
    marginTop: '8px',
    backgroundColor: '#2d2d2d',
    border: '1px dashed #569cd6',
    borderRadius: '6px',
    color: '#ddd',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s'
  }
};

export default ColorPanel;
