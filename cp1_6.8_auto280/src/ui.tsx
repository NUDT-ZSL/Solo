import React, { useCallback, useState, useEffect } from 'react';
import { ParticleSettings } from './particles';

interface ControlPanelProps {
  settings: ParticleSettings;
  onSettingsChange: (settings: ParticleSettings) => void;
  onResetCamera: () => void;
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '4px',
  appearance: 'none',
  WebkitAppearance: 'none',
  background: 'rgba(100, 150, 255, 0.2)',
  borderRadius: '2px',
  outline: 'none',
  cursor: 'pointer',
  transition: 'background 0.3s ease',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '12px',
  color: 'rgba(180, 200, 255, 0.8)',
  marginBottom: '4px',
  fontFamily: "'Segoe UI', system-ui, sans-serif",
};

const valueStyle: React.CSSProperties = {
  color: 'rgba(130, 180, 255, 0.9)',
  fontFamily: "'Consolas', monospace",
  fontSize: '11px',
  minWidth: '32px',
  textAlign: 'right',
};

const groupStyle: React.CSSProperties = {
  marginBottom: '14px',
};

const btnStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 0',
  border: '1px solid rgba(100, 150, 255, 0.3)',
  borderRadius: '6px',
  background: 'rgba(60, 100, 200, 0.1)',
  color: 'rgba(180, 200, 255, 0.8)',
  fontSize: '12px',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  fontFamily: "'Segoe UI', system-ui, sans-serif",
  letterSpacing: '1px',
};

function SliderGroup({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={groupStyle}>
      <div style={labelStyle}>
        <span>{label}</span>
        <span style={valueStyle}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={sliderStyle}
      />
    </div>
  );
}

export function ControlPanel({ settings, onSettingsChange, onResetCamera }: ControlPanelProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleChange = useCallback(
    (key: keyof ParticleSettings, value: number) => {
      onSettingsChange({ ...settings, [key]: value });
    },
    [settings, onSettingsChange]
  );

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '240px',
    padding: '20px',
    borderRadius: '12px',
    background: 'rgba(10, 15, 40, 0.55)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(80, 130, 255, 0.15)',
    boxShadow: '0 8px 32px rgba(0, 10, 60, 0.4), inset 0 1px 0 rgba(100, 160, 255, 0.08)',
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(20px)',
    transition: 'opacity 0.6s ease, transform 0.6s ease',
    zIndex: 100,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'rgba(160, 190, 255, 0.9)',
    marginBottom: '16px',
    textAlign: 'center',
    letterSpacing: '2px',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    textTransform: 'uppercase',
  };

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>⚛ 量子控制</div>
      <SliderGroup
        label="粒子数量"
        value={settings.count}
        min={20}
        max={200}
        step={10}
        onChange={(v) => handleChange('count', v)}
      />
      <SliderGroup
        label="连接密度"
        value={settings.connectionDensity}
        min={1}
        max={10}
        step={1}
        onChange={(v) => handleChange('connectionDensity', v)}
      />
      <SliderGroup
        label="波动振幅"
        value={settings.waveAmplitude}
        min={0}
        max={3}
        step={0.1}
        onChange={(v) => handleChange('waveAmplitude', v)}
      />
      <SliderGroup
        label="动画速度"
        value={settings.animationSpeed}
        min={0.1}
        max={3}
        step={0.1}
        onChange={(v) => handleChange('animationSpeed', v)}
      />
      <button
        style={btnStyle}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.background = 'rgba(60, 100, 200, 0.25)';
          (e.target as HTMLButtonElement).style.borderColor = 'rgba(100, 150, 255, 0.5)';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.background = 'rgba(60, 100, 200, 0.1)';
          (e.target as HTMLButtonElement).style.borderColor = 'rgba(100, 150, 255, 0.3)';
        }}
        onClick={onResetCamera}
      >
        ↻ 重置视角
      </button>
    </div>
  );
}
