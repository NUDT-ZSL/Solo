import React, { useState, useCallback } from 'react';

interface ControlPanelProps {
  windSpeed: number;
  density: number;
  glowIntensity: number;
  onWindSpeedChange: (v: number) => void;
  onDensityChange: (v: number) => void;
  onGlowIntensityChange: (v: number) => void;
  onResetCamera: () => void;
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 20,
  left: 20,
  background: 'rgba(15, 10, 40, 0.55)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: 16,
  border: '1px solid rgba(255, 200, 100, 0.15)',
  padding: 0,
  color: '#e8dcc8',
  fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
  overflow: 'hidden',
  transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 200, 100, 0.1)',
  minWidth: 220,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 18px',
  cursor: 'pointer',
  userSelect: 'none',
  borderBottom: '1px solid rgba(255, 200, 100, 0.08)',
};

const bodyStyleBase: React.CSSProperties = {
  padding: '16px 18px',
  maxHeight: 400,
  opacity: 1,
  transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  overflow: 'hidden',
};

const bodyCollapsed: React.CSSProperties = {
  ...bodyStyleBase,
  maxHeight: 0,
  opacity: 0,
  padding: '0 18px',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6,
  fontSize: 13,
  letterSpacing: 0.5,
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  marginBottom: 16,
  accentColor: '#e8a832',
  cursor: 'pointer',
};

const btnStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 0',
  background: 'linear-gradient(135deg, rgba(232, 168, 50, 0.25), rgba(180, 100, 220, 0.25))',
  border: '1px solid rgba(232, 168, 50, 0.3)',
  borderRadius: 10,
  color: '#f0d890',
  fontSize: 13,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  letterSpacing: 1,
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  windSpeed,
  density,
  glowIntensity,
  onWindSpeedChange,
  onDensityChange,
  onGlowIntensityChange,
  onResetCamera,
}) => {
  const [expanded, setExpanded] = useState(true);

  const toggle = useCallback(() => setExpanded((e) => !e), []);

  return (
    <div style={panelStyle}>
      <div style={headerStyle} onClick={toggle}>
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: 2 }}>✦ 控制面板</span>
        <span
          style={{
            transition: 'transform 0.3s ease',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            fontSize: 12,
            opacity: 0.7,
          }}
        >
          ▼
        </span>
      </div>
      <div style={expanded ? bodyStyleBase : bodyCollapsed}>
        <div style={labelStyle}>
          <span>风速</span>
          <span style={{ opacity: 0.6 }}>{windSpeed.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="3"
          step="0.1"
          value={windSpeed}
          style={sliderStyle}
          onChange={(e) => onWindSpeedChange(parseFloat(e.target.value))}
        />

        <div style={labelStyle}>
          <span>丝线密度</span>
          <span style={{ opacity: 0.6 }}>{density}</span>
        </div>
        <input
          type="range"
          min="5"
          max="40"
          step="1"
          value={density}
          style={sliderStyle}
          onChange={(e) => onDensityChange(parseInt(e.target.value))}
        />

        <div style={labelStyle}>
          <span>光晕强度</span>
          <span style={{ opacity: 0.6 }}>{glowIntensity.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="3"
          step="0.1"
          value={glowIntensity}
          style={sliderStyle}
          onChange={(e) => onGlowIntensityChange(parseFloat(e.target.value))}
        />

        <button
          style={btnStyle}
          onMouseOver={(e) => {
            (e.target as HTMLButtonElement).style.background =
              'linear-gradient(135deg, rgba(232, 168, 50, 0.45), rgba(180, 100, 220, 0.45))';
          }}
          onMouseOut={(e) => {
            (e.target as HTMLButtonElement).style.background =
              'linear-gradient(135deg, rgba(232, 168, 50, 0.25), rgba(180, 100, 220, 0.25))';
          }}
          onClick={onResetCamera}
        >
          重置视角
        </button>
      </div>
    </div>
  );
};
