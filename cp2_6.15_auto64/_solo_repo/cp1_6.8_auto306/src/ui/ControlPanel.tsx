import React, { useState, useCallback } from 'react';

export interface ControlPanelProps {
  onGrowthSpeedChange: (value: number) => void;
  onResonanceStrengthChange: (value: number) => void;
  onResetView: () => void;
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '24px',
  right: '24px',
  width: '260px',
  padding: '20px',
  background: 'rgba(20, 10, 40, 0.55)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: '16px',
  border: '1px solid rgba(150, 100, 255, 0.2)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 20px rgba(120, 60, 200, 0.05)',
  color: '#d4b8ff',
  fontFamily: "'Segoe UI', system-ui, sans-serif",
  zIndex: 100,
  transition: 'opacity 0.4s ease, transform 0.4s ease',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '13px',
  marginBottom: '6px',
  letterSpacing: '0.5px',
};

const sliderContainerStyle: React.CSSProperties = {
  marginBottom: '18px',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '4px',
  appearance: 'none',
  WebkitAppearance: 'none',
  background: 'rgba(100, 60, 180, 0.3)',
  borderRadius: '2px',
  outline: 'none',
  cursor: 'pointer',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  background: 'rgba(100, 60, 180, 0.3)',
  border: '1px solid rgba(150, 100, 255, 0.3)',
  borderRadius: '10px',
  color: '#d4b8ff',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'background 0.3s ease, border-color 0.3s ease',
  letterSpacing: '1px',
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onGrowthSpeedChange,
  onResonanceStrengthChange,
  onResetView,
}) => {
  const [growthSpeed, setGrowthSpeed] = useState(1.0);
  const [resonanceStrength, setResonanceStrength] = useState(1.0);

  const handleGrowthSpeed = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setGrowthSpeed(val);
      onGrowthSpeedChange(val);
    },
    [onGrowthSpeedChange],
  );

  const handleResonanceStrength = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setResonanceStrength(val);
      onResonanceStrengthChange(val);
    },
    [onResonanceStrengthChange],
  );

  return (
    <div style={panelStyle}>
      <div style={sliderContainerStyle}>
        <div style={labelStyle}>
          <span>生长速度</span>
          <span style={{ opacity: 0.7, fontSize: '12px' }}>{growthSpeed.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="3.0"
          step="0.1"
          value={growthSpeed}
          onChange={handleGrowthSpeed}
          style={sliderStyle}
        />
      </div>

      <div style={sliderContainerStyle}>
        <div style={labelStyle}>
          <span>共鸣强度</span>
          <span style={{ opacity: 0.7, fontSize: '12px' }}>{resonanceStrength.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="3.0"
          step="0.1"
          value={resonanceStrength}
          onChange={handleResonanceStrength}
          style={sliderStyle}
        />
      </div>

      <button
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(100, 60, 180, 0.5)';
          e.currentTarget.style.borderColor = 'rgba(150, 100, 255, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(100, 60, 180, 0.3)';
          e.currentTarget.style.borderColor = 'rgba(150, 100, 255, 0.3)';
        }}
        onClick={onResetView}
      >
        重置视角
      </button>
    </div>
  );
};
