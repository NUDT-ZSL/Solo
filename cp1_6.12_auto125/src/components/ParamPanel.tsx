import React, { useState, useEffect } from 'react';
import { GameParams } from '../types';

interface ParamPanelProps {
  params: GameParams;
  onParamChange: (key: keyof GameParams, value: number) => void;
  onToggleRecording: () => boolean;
  onStartPlayback: () => boolean;
  onExportConfig: () => string;
  onReset: () => void;
  isRecording: boolean;
  hasRecording: boolean;
}

const SLIDER_CONFIG: Array<{
  key: keyof GameParams;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}> = [
  { key: 'jumpHeight', label: '跳跃高度', min: 200, max: 600, step: 10, unit: 'px' },
  { key: 'gravity', label: '重力加速度', min: 500, max: 1500, step: 50, unit: '' },
  { key: 'lightDamage', label: '轻击伤害', min: 5, max: 30, step: 5, unit: '' },
  { key: 'heavyDamage', label: '重击伤害', min: 10, max: 50, step: 5, unit: '' },
  { key: 'dashCooldown', label: '冲刺斩冷却', min: 0.3, max: 2.0, step: 0.1, unit: 's' },
];

export const ParamPanel: React.FC<ParamPanelProps> = ({
  params,
  onParamChange,
  onToggleRecording,
  onStartPlayback,
  onExportConfig,
  onReset,
  isRecording,
  hasRecording,
}) => {
  const [recording, setRecording] = useState(isRecording);

  useEffect(() => {
    setRecording(isRecording);
  }, [isRecording]);

  const handleSliderChange = (key: keyof GameParams, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onParamChange(key, value);
  };

  const handleToggleRecording = () => {
    const result = onToggleRecording();
    setRecording(result);
  };

  const handleExport = () => {
    const configJson = onExportConfig();
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: 20,
    right: 20,
    width: 280,
    maxHeight: 'calc(100vh - 40px)',
    overflowY: 'auto',
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    color: '#fff',
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
    zIndex: 100,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#4A90D9',
    borderBottom: '2px solid #444',
    paddingBottom: 10,
  };

  const sliderContainerStyle: React.CSSProperties = {
    marginBottom: 16,
  };

  const sliderLabelStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    fontSize: 13,
    color: '#ccc',
  };

  const sliderValueStyle: React.CSSProperties = {
    fontWeight: 'bold',
    color: '#4A90D9',
    fontFamily: 'monospace',
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: 6,
    borderRadius: 3,
    background: '#444',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 16px',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 'bold',
    transition: 'all 0.15s ease',
    marginTop: 8,
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#4A90D9',
    color: '#fff',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#555',
    color: '#fff',
  };

  const dangerButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#d9534f',
    color: '#fff',
  };

  const sectionStyle: React.CSSProperties = {
    marginTop: 20,
    paddingTop: 16,
    borderTop: '1px solid #444',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#aaa',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  };

  const getSliderFillPercent = (key: keyof GameParams): number => {
    const config = SLIDER_CONFIG.find(c => c.key === key);
    if (!config) return 0;
    return ((params[key] - config.min) / (config.max - config.min)) * 100;
  };

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>⚔️ JumpStrike 参数面板</div>

      {SLIDER_CONFIG.map(config => (
        <div key={config.key} style={sliderContainerStyle}>
          <div style={sliderLabelStyle}>
            <span>{config.label}</span>
            <span style={sliderValueStyle}>
              {params[config.key]}{config.unit}
            </span>
          </div>
          <div style={{ position: 'relative', height: 6 }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${getSliderFillPercent(config.key)}%`,
              height: 6,
              borderRadius: 3,
              backgroundColor: '#4A90D9',
              pointerEvents: 'none',
            }} />
            <input
              type="range"
              min={config.min}
              max={config.max}
              step={config.step}
              value={params[config.key]}
              onChange={(e) => handleSliderChange(config.key, e)}
              style={{
                ...sliderStyle,
                position: 'relative',
                zIndex: 1,
                background: 'transparent',
              }}
            />
          </div>
        </div>
      ))}

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>动作回放</div>
        <button
          onClick={handleToggleRecording}
          style={{
            ...primaryButtonStyle,
            backgroundColor: recording ? '#e74c3c' : '#4A90D9',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.filter = 'brightness(1.1)';
            (e.target as HTMLButtonElement).style.boxShadow = '0 0 0 2px rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.filter = 'brightness(1)';
            (e.target as HTMLButtonElement).style.boxShadow = 'none';
          }}
          onMouseDown={(e) => {
            (e.target as HTMLButtonElement).style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            (e.target as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          {recording ? '⏺ 停止录制' : '⏺ 开始录制'}
        </button>
        <button
          onClick={onStartPlayback}
          disabled={!hasRecording}
          style={{
            ...secondaryButtonStyle,
            opacity: hasRecording ? 1 : 0.4,
            cursor: hasRecording ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={(e) => {
            if (hasRecording) {
              (e.target as HTMLButtonElement).style.filter = 'brightness(1.1)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 0 0 2px rgba(255,255,255,0.3)';
            }
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.filter = 'brightness(1)';
            (e.target as HTMLButtonElement).style.boxShadow = 'none';
          }}
          onMouseDown={(e) => {
            if (hasRecording) {
              (e.target as HTMLButtonElement).style.transform = 'scale(0.95)';
            }
          }}
          onMouseUp={(e) => {
            (e.target as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          ▶ 回放
        </button>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>配置导出</div>
        <button
          onClick={handleExport}
          style={primaryButtonStyle}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.filter = 'brightness(1.1)';
            (e.target as HTMLButtonElement).style.boxShadow = '0 0 0 2px rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.filter = 'brightness(1)';
            (e.target as HTMLButtonElement).style.boxShadow = 'none';
          }}
          onMouseDown={(e) => {
            (e.target as HTMLButtonElement).style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            (e.target as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          📥 导出配置
        </button>
      </div>

      <div style={sectionStyle}>
        <button
          onClick={onReset}
          style={dangerButtonStyle}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.filter = 'brightness(1.1)';
            (e.target as HTMLButtonElement).style.boxShadow = '0 0 0 2px rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.filter = 'brightness(1)';
            (e.target as HTMLButtonElement).style.boxShadow = 'none';
          }}
          onMouseDown={(e) => {
            (e.target as HTMLButtonElement).style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            (e.target as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          🔄 重置场景
        </button>
      </div>

      <div style={{ ...sectionStyle, fontSize: 11, color: '#888', lineHeight: 1.6 }}>
        <div style={{ marginBottom: 6, color: '#aaa', fontWeight: 'bold' }}>操作说明</div>
        <div>W - 跳跃 / 二段跳</div>
        <div>A / D - 左右移动</div>
        <div>J - 轻击攻击</div>
        <div>K - 重击攻击</div>
        <div>L - 冲刺斩</div>
      </div>
    </div>
  );
};
