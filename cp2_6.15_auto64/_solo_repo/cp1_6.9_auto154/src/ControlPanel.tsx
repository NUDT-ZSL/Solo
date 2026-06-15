import { useState } from 'react';
import { POLE_PRESETS } from './MagneticField';

export interface ControlPanelState {
  presetIndex: number;
  particleCount: number;
  strengthMultiplier: number;
}

interface ControlPanelProps {
  state: ControlPanelState;
  onChange: (state: ControlPanelState) => void;
}

export default function ControlPanel({ state, onChange }: ControlPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const updateField = <K extends keyof ControlPanelState>(
    key: K,
    value: ControlPanelState[K]
  ) => {
    onChange({ ...state, [key]: value });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: collapsed ? '0px' : '240px',
          overflow: 'hidden',
          transition: 'width 0.3s ease-out, opacity 0.3s ease-out',
          opacity: collapsed ? 0 : 1,
          pointerEvents: collapsed ? 'none' : 'auto',
        }}
      >
        <div
          style={{
            width: '240px',
            padding: '16px',
            background: 'rgba(10, 10, 32, 0.7)',
            border: '1px solid #2a2a5a',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            color: '#a0a0e0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '12px',
          }}
        >
          <h3
            style={{
              margin: '0 0 14px 0',
              fontSize: '13px',
              fontWeight: 600,
              color: '#d0d0ff',
              letterSpacing: '0.5px',
              borderBottom: '1px solid #2a2a5a',
              paddingBottom: '8px',
            }}
          >
            ⚡ 磁流变体控制台
          </h3>

          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                color: '#8080c0',
                fontSize: '11px',
              }}
            >
              磁极初始位置
            </label>
            <select
              value={state.presetIndex}
              onChange={(e) => updateField('presetIndex', Number(e.target.value))}
              style={{
                width: '100%',
                padding: '6px 10px',
                background: '#1a1a40',
                border: '1px solid #2a2a5a',
                borderRadius: '4px',
                color: '#d0d0ff',
                fontSize: '12px',
                cursor: 'pointer',
                outline: 'none',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLSelectElement).style.borderColor = '#3a3a7a';
                (e.target as HTMLSelectElement).style.background = '#222250';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLSelectElement).style.borderColor = '#2a2a5a';
                (e.target as HTMLSelectElement).style.background = '#1a1a40';
              }}
            >
              {POLE_PRESETS.map((preset, i) => (
                <option key={i} value={i}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '6px',
                color: '#8080c0',
                fontSize: '11px',
              }}
            >
              <span>粒子总数</span>
              <span style={{ color: '#70b0ff', fontWeight: 500 }}>
                {state.particleCount.toLocaleString()}
              </span>
            </label>
            <input
              type="range"
              min={1000}
              max={5000}
              step={500}
              value={state.particleCount}
              onChange={(e) =>
                updateField('particleCount', Number(e.target.value))
              }
              style={sliderStyle}
            />
            <div style={sliderLabels}>
              <span>1k</span>
              <span>5k</span>
            </div>
          </div>

          <div style={{ marginBottom: '4px' }}>
            <label
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '6px',
                color: '#8080c0',
                fontSize: '11px',
              }}
            >
              <span>磁场强度系数</span>
              <span style={{ color: '#70ff90', fontWeight: 500 }}>
                {state.strengthMultiplier.toFixed(1)}x
              </span>
            </label>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={state.strengthMultiplier}
              onChange={(e) =>
                updateField('strengthMultiplier', Number(e.target.value))
              }
              style={{ ...sliderStyle, accentColor: '#70ff90' }}
            />
            <div style={sliderLabels}>
              <span>0.5</span>
              <span>2.0</span>
            </div>
          </div>

          <div
            style={{
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px solid #2a2a5a',
              fontSize: '10px',
              color: '#6060a0',
              lineHeight: 1.6,
            }}
          >
            <div>🖱️ 拖拽红/蓝磁极移动</div>
            <div>🎯 滚轮缩放，右键旋转视角</div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          marginTop: collapsed ? '0px' : '8px',
          marginLeft: collapsed ? '0px' : '-1px',
          width: '28px',
          height: '48px',
          background: collapsed ? 'rgba(10, 10, 32, 0.7)' : '#1a1a40',
          border: collapsed ? '1px solid #2a2a5a' : '1px solid #2a2a5a',
          borderLeft: collapsed ? '1px solid #2a2a5a' : 'none',
          borderRadius: collapsed
            ? '0 8px 8px 0'
            : '0 6px 6px 0',
          color: '#a0a0e0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          transition: 'background 0.2s, border-color 0.2s',
          backdropFilter: collapsed ? 'blur(10px)' : 'none',
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.background = '#2a2a5a';
          (e.target as HTMLButtonElement).style.borderColor = '#3a3a7a';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.background = collapsed
            ? 'rgba(10, 10, 32, 0.7)'
            : '#1a1a40';
          (e.target as HTMLButtonElement).style.borderColor = '#2a2a5a';
        }}
      >
        {collapsed ? '▶' : '◀'}
      </button>
    </div>
  );
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '4px',
  background: '#1a1a40',
  borderRadius: '2px',
  outline: 'none',
  WebkitAppearance: 'none',
  appearance: 'none',
  cursor: 'pointer',
  accentColor: '#70b0ff',
};

const sliderLabels: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '9px',
  color: '#6060a0',
  marginTop: '2px',
};
