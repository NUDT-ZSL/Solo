import React from 'react';

interface ControlPanelProps {
  growthSpeed: number;
  flowerDensity: number;
  onSpeedChange: (speed: number) => void;
  onDensityChange: (density: number) => void;
  onPlantNew: () => void;
  vineCount: number;
  flowerCount: number;
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: '20px',
  left: '20px',
  padding: '20px 24px',
  borderRadius: '16px',
  background: 'rgba(10, 30, 10, 0.65)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(144, 238, 144, 0.2)',
  color: '#c8e6c9',
  fontFamily: "'Segoe UI', 'PingFang SC', sans-serif",
  zIndex: 10,
  minWidth: '220px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  marginBottom: '4px',
  color: '#a5d6a7',
  letterSpacing: '0.5px',
};

const sliderRowStyle: React.CSSProperties = {
  marginBottom: '16px',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  accentColor: '#66bb6a',
  cursor: 'pointer',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 0',
  borderRadius: '10px',
  border: '1px solid rgba(144, 238, 144, 0.35)',
  background: 'linear-gradient(135deg, rgba(46,125,50,0.7), rgba(27,94,32,0.7))',
  color: '#e8f5e9',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  letterSpacing: '1px',
};

const statsStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  padding: '12px 18px',
  borderRadius: '12px',
  background: 'rgba(10, 30, 10, 0.55)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(144, 238, 144, 0.15)',
  color: '#a5d6a7',
  fontSize: '13px',
  fontFamily: "'Segoe UI', 'PingFang SC', sans-serif",
  zIndex: 10,
  lineHeight: 1.6,
};

const hintStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '8px 24px',
  borderRadius: '20px',
  background: 'rgba(10, 30, 10, 0.45)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(144, 238, 144, 0.12)',
  color: '#81c784',
  fontSize: '13px',
  fontFamily: "'Segoe UI', 'PingFang SC', sans-serif",
  zIndex: 10,
  whiteSpace: 'nowrap',
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  growthSpeed,
  flowerDensity,
  onSpeedChange,
  onDensityChange,
  onPlantNew,
  vineCount,
  flowerCount,
}) => {
  return (
    <>
      <div style={panelStyle}>
        <div style={sliderRowStyle}>
          <label style={labelStyle}>生长速度: {growthSpeed.toFixed(1)}x</label>
          <input
            type="range"
            min="0.2"
            max="3"
            step="0.1"
            value={growthSpeed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            style={sliderStyle}
          />
        </div>
        <div style={sliderRowStyle}>
          <label style={labelStyle}>花朵密度: {(flowerDensity * 100).toFixed(0)}%</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={flowerDensity}
            onChange={(e) => onDensityChange(parseFloat(e.target.value))}
            style={sliderStyle}
          />
        </div>
        <button
          style={buttonStyle}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background =
              'linear-gradient(135deg, rgba(56,142,60,0.85), rgba(46,125,50,0.85))';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background =
              'linear-gradient(135deg, rgba(46,125,50,0.7), rgba(27,94,32,0.7))';
          }}
          onClick={onPlantNew}
        >
          🌱 种植新芽
        </button>
      </div>

      <div style={hintStyle}>点击画布种下种子，拖拽引导藤蔓生长</div>

      <div style={statsStyle}>
        <div>藤蔓: {vineCount}</div>
        <div>花朵: {flowerCount}</div>
      </div>
    </>
  );
};
