import React, { useState, useCallback } from 'react';
import type { EngineParams } from './CrystalEngine';

interface ControlPanelProps {
  params: EngineParams;
  onParamsChange: (params: EngineParams) => void;
  onResetView: () => void;
  onResetScene: () => void;
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  right: 20,
  bottom: 20,
  width: 280,
  background: 'rgba(20, 15, 10, 0.75)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(100, 80, 60, 0.3)',
  borderRadius: 16,
  padding: 0,
  color: '#c8b89a',
  fontFamily: "'Segoe UI', sans-serif",
  zIndex: 100,
  overflow: 'hidden',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
};

const collapsedStyle: React.CSSProperties = {
  ...panelStyle,
  height: 44,
};

const expandedStyle: React.CSSProperties = {
  ...panelStyle,
  height: 320,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 16px',
  cursor: 'pointer',
  userSelect: 'none',
  borderBottom: '1px solid rgba(100, 80, 60, 0.2)',
};

const sliderContainerStyle: React.CSSProperties = {
  padding: '12px 16px',
};

const sliderLabelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 13,
  marginBottom: 6,
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: 4,
  appearance: 'none',
  WebkitAppearance: 'none',
  background: 'rgba(100, 80, 60, 0.3)',
  borderRadius: 2,
  outline: 'none',
  cursor: 'pointer',
};

const buttonStyle: React.CSSProperties = {
  width: 'calc(100% - 32px)',
  margin: '8px 16px 16px',
  padding: '8px 0',
  background: 'rgba(100, 80, 60, 0.3)',
  border: '1px solid rgba(100, 80, 60, 0.4)',
  borderRadius: 8,
  color: '#c8b89a',
  fontSize: 13,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  onParamsChange,
  onResetView,
  onResetScene,
}) => {
  const [expanded, setExpanded] = useState(true);

  const handleSlider = useCallback(
    (key: keyof EngineParams, value: number) => {
      onParamsChange({ ...params, [key]: value });
    },
    [params, onParamsChange]
  );

  return (
    <div style={expanded ? expandedStyle : collapsedStyle}>
      <div style={headerStyle} onClick={() => setExpanded(!expanded)}>
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: 1 }}>
          ⚙ 控制面板
        </span>
        <span
          style={{
            transition: 'transform 0.3s ease',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            fontSize: 12,
          }}
        >
          ▼
        </span>
      </div>

      <div
        style={{
          opacity: expanded ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: expanded ? 'auto' : 'none',
        }}
      >
        <div style={sliderContainerStyle}>
          <div style={sliderLabelStyle}>
            <span>生长速度</span>
            <span>{params.growthSpeed.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={params.growthSpeed}
            style={sliderStyle}
            onChange={(e) => handleSlider('growthSpeed', parseFloat(e.target.value))}
          />
        </div>

        <div style={sliderContainerStyle}>
          <div style={sliderLabelStyle}>
            <span>分支概率</span>
            <span>{(params.branchProbability * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="0.8"
            step="0.05"
            value={params.branchProbability}
            style={sliderStyle}
            onChange={(e) =>
              handleSlider('branchProbability', parseFloat(e.target.value))
            }
          />
        </div>

        <div style={sliderContainerStyle}>
          <div style={sliderLabelStyle}>
            <span>光泽强度</span>
            <span>{(params.glowIntensity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={params.glowIntensity}
            style={sliderStyle}
            onChange={(e) => handleSlider('glowIntensity', parseFloat(e.target.value))}
          />
        </div>

        <button style={buttonStyle} onClick={onResetView}>
          重置视角
        </button>
        <button
          style={{ ...buttonStyle, marginTop: 0 }}
          onClick={onResetScene}
        >
          重生矿脉
        </button>
      </div>
    </div>
  );
};
