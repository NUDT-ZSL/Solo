import React, { useCallback } from 'react';
import type { SceneParams } from '../CoreScene';

interface ControlPanelProps {
  params: SceneParams;
  onParamsChange: (params: Partial<SceneParams>) => void;
  onResetCamera: () => void;
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 24,
  right: 24,
  minWidth: 260,
  padding: '20px 24px',
  background: 'rgba(30, 10, 5, 0.55)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 120, 40, 0.2)',
  borderRadius: 16,
  color: '#f0d0b0',
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  fontSize: 13,
  zIndex: 200,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 16px rgba(255, 80, 20, 0.1)',
};

const titleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: '#ffaa60',
  marginBottom: 16,
  letterSpacing: 1,
};

const sliderGroupStyle: React.CSSProperties = {
  marginBottom: 14,
};

const labelRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6,
};

const labelStyle: React.CSSProperties = {
  color: '#c09070',
  fontSize: 12,
};

const valueStyle: React.CSSProperties = {
  color: '#ffcc80',
  fontWeight: 600,
  fontSize: 12,
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: 4,
  appearance: 'none',
  WebkitAppearance: 'none',
  background: 'rgba(255, 100, 30, 0.2)',
  borderRadius: 2,
  outline: 'none',
  cursor: 'pointer',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 0',
  marginTop: 8,
  background: 'rgba(255, 80, 20, 0.2)',
  border: '1px solid rgba(255, 120, 40, 0.3)',
  borderRadius: 10,
  color: '#ffcc80',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  letterSpacing: 1,
};

interface SliderConfig {
  key: keyof SceneParams;
  label: string;
  min: number;
  max: number;
  step: number;
}

const sliders: SliderConfig[] = [
  { key: 'flowSpeed', label: '流速', min: 0.1, max: 3.0, step: 0.1 },
  { key: 'heatWaveIntensity', label: '热浪强度', min: 0, max: 2.0, step: 0.1 },
  { key: 'coolingRate', label: '冷却速率', min: 0, max: 1.0, step: 0.05 },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  onParamsChange,
  onResetCamera,
}) => {
  const handleSliderChange = useCallback(
    (key: keyof SceneParams, value: number) => {
      onParamsChange({ [key]: value });
    },
    [onParamsChange]
  );

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>⚙ 控制面板</div>

      {sliders.map((slider) => (
        <div key={slider.key} style={sliderGroupStyle}>
          <div style={labelRowStyle}>
            <span style={labelStyle}>{slider.label}</span>
            <span style={valueStyle}>
              {params[slider.key].toFixed(slider.step < 0.1 ? 2 : 1)}
            </span>
          </div>
          <input
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={params[slider.key]}
            onChange={(e) =>
              handleSliderChange(slider.key, parseFloat(e.target.value))
            }
            style={sliderStyle}
          />
        </div>
      ))}

      <button
        style={buttonStyle}
        onClick={onResetCamera}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 80, 20, 0.35)';
          e.currentTarget.style.borderColor = 'rgba(255, 120, 40, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 80, 20, 0.2)';
          e.currentTarget.style.borderColor = 'rgba(255, 120, 40, 0.3)';
        }}
      >
        重置视角
      </button>
    </div>
  );
};
