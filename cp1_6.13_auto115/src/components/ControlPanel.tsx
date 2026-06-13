import React, { useState } from 'react';
import { Preset, builtInPresets } from '../presets';
import { EngineConfig } from '../engine/ParticleEngine';
import { RGB } from '../engine/Particle';

interface ControlPanelProps {
  visible: boolean;
  config: EngineConfig;
  savedPresets: Preset[];
  onPresetSelect: (preset: Preset) => void;
  onConfigChange: (config: EngineConfig) => void;
  onSavePreset: (name: string) => void;
  onDeletePreset: (id: string) => void;
}

const colorToHex = (c: RGB): string => {
  return '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('');
};

const hexToColor = (hex: string): RGB => {
  const m = hex.replace('#', '');
  return {
    r: parseInt(m.slice(0, 2), 16),
    g: parseInt(m.slice(2, 4), 16),
    b: parseInt(m.slice(4, 6), 16),
  };
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  visible,
  config,
  savedPresets,
  onPresetSelect,
  onConfigChange,
  onSavePreset,
  onDeletePreset,
}) => {
  const [presetName, setPresetName] = useState('');
  const [activeBuiltIn, setActiveBuiltIn] = useState<string | null>(null);

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: 16,
    left: visible ? 16 : -300,
    width: 280,
    maxHeight: 'calc(100vh - 32px)',
    background: 'rgba(15, 23, 42, 0.7)',
    backdropFilter: 'blur(12px)',
    borderRadius: 12,
    padding: 20,
    color: '#cbd5e1',
    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 100,
    overflowY: 'auto',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: 20,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    marginBottom: 6,
    display: 'flex',
    justifyContent: 'space-between',
    color: '#94a3b8',
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    accentColor: '#8b5cf6',
    cursor: 'pointer',
  };

  const buttonBase: React.CSSProperties = {
    border: 'none',
    borderRadius: 6,
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.2s',
  };

  const handleSizeChange = (minOrMax: 'min' | 'max', value: number) => {
    const [currMin, currMax] = config.sizeRange;
    const newRange: [number, number] = minOrMax === 'min'
      ? [Math.min(value, currMax), currMax]
      : [currMin, Math.max(value, currMin)];
    onConfigChange({ ...config, sizeRange: newRange });
  };

  const handleSpeedChange = (minOrMax: 'min' | 'max', value: number) => {
    const [currMin, currMax] = config.speedRange;
    const newRange: [number, number] = minOrMax === 'min'
      ? [Math.min(value, currMax), currMax]
      : [currMin, Math.max(value, currMin)];
    onConfigChange({ ...config, speedRange: newRange });
  };

  const handleColorChange = (index: number, hex: string) => {
    const newColors = [...config.colors];
    newColors[index] = hexToColor(hex);
    onConfigChange({ ...config, colors: newColors });
  };

  const addColor = () => {
    if (config.colors.length >= 8) return;
    onConfigChange({ ...config, colors: [...config.colors, { r: 139, g: 92, b: 246 }] });
  };

  const removeColor = (index: number) => {
    if (config.colors.length <= 1) return;
    onConfigChange({ ...config, colors: config.colors.filter((_, i) => i !== index) });
  };

  const handleBuiltInClick = (preset: Preset) => {
    setActiveBuiltIn(preset.name);
    onPresetSelect(preset);
  };

  return (
    <div style={panelStyle}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: '#f1f5f9' }}>
        Particle Garden
      </h2>
      <p style={{ fontSize: 11, color: '#64748b', marginBottom: 20 }}>
        拖拽画布生成粒子 · 点击选中 · Delete删除 · H隐藏面板
      </p>

      <div style={sectionStyle}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: '#e2e8f0' }}>
          预设模式
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {builtInPresets.map(p => (
            <button
              key={p.name}
              onClick={() => handleBuiltInClick(p)}
              style={{
                ...buttonBase,
                background: activeBuiltIn === p.name ? '#8b5cf6' : 'rgba(139, 92, 246, 0.2)',
                color: '#fff',
                flex: 1,
                border: activeBuiltIn === p.name ? '2px solid #a78bfa' : '2px solid transparent',
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: '#e2e8f0' }}>
          粒子大小
        </div>
        <div style={labelStyle}>
          <span>最小: {config.sizeRange[0].toFixed(1)}px</span>
          <span>最大: {config.sizeRange[1].toFixed(1)}px</span>
        </div>
        <input
          type="range"
          min={1}
          max={8}
          step={0.5}
          value={config.sizeRange[0]}
          onChange={e => handleSizeChange('min', parseFloat(e.target.value))}
          style={sliderStyle}
        />
        <input
          type="range"
          min={1}
          max={8}
          step={0.5}
          value={config.sizeRange[1]}
          onChange={e => handleSizeChange('max', parseFloat(e.target.value))}
          style={{ ...sliderStyle, marginTop: 6 }}
        />
      </div>

      <div style={sectionStyle}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: '#e2e8f0' }}>
          粒子速度
        </div>
        <div style={labelStyle}>
          <span>最小: {config.speedRange[0].toFixed(1)}/帧</span>
          <span>最大: {config.speedRange[1].toFixed(1)}/帧</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={5}
          step={0.1}
          value={config.speedRange[0]}
          onChange={e => handleSpeedChange('min', parseFloat(e.target.value))}
          style={sliderStyle}
        />
        <input
          type="range"
          min={0.5}
          max={5}
          step={0.1}
          value={config.speedRange[1]}
          onChange={e => handleSpeedChange('max', parseFloat(e.target.value))}
          style={{ ...sliderStyle, marginTop: 6 }}
        />
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>电荷分布</span>
          <span>{config.chargeBias > 0 ? `偏正 +${config.chargeBias.toFixed(1)}` : config.chargeBias < 0 ? `偏负 ${config.chargeBias.toFixed(1)}` : '平衡 0'}</span>
        </div>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.1}
          value={config.chargeBias}
          onChange={e => onConfigChange({ ...config, chargeBias: parseFloat(e.target.value) })}
          style={sliderStyle}
        />
      </div>

      <div style={sectionStyle}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: '#e2e8f0' }}>
          调色板
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {config.colors.map((c, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <input
                type="color"
                value={colorToHex(c)}
                onChange={e => handleColorChange(i, e.target.value)}
                style={{
                  width: 28,
                  height: 28,
                  border: '2px solid #a78bfa',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: 'none',
                  padding: 0,
                }}
              />
              {config.colors.length > 1 && (
                <button
                  onClick={() => removeColor(i)}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: 'none',
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: 10,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {config.colors.length < 8 && (
            <button
              onClick={addColor}
              style={{
                width: 28,
                height: 28,
                border: '2px dashed #64748b',
                borderRadius: 6,
                background: 'none',
                color: '#64748b',
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              +
            </button>
          )}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: '#e2e8f0' }}>
          保存预设
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="预设名称"
            value={presetName}
            onChange={e => setPresetName(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#cbd5e1',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <button
            onClick={() => {
              if (presetName.trim()) {
                onSavePreset(presetName.trim());
                setPresetName('');
              }
            }}
            style={{
              ...buttonBase,
              background: '#8b5cf6',
              color: '#fff',
            }}
          >
            保存
          </button>
        </div>
      </div>

      {savedPresets.length > 0 && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: '#e2e8f0' }}>
            已保存预设
          </div>
          <div style={{
            maxHeight: 180,
            overflowY: 'auto',
            border: '1px solid #334155',
            borderRadius: 6,
          }}>
            {savedPresets.map(p => (
              <div
                key={p._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 10px',
                  borderBottom: '1px solid #1e293b',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1e293b')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => onPresetSelect(p)}
              >
                <div style={{ display: 'flex', gap: 3, marginRight: 10 }}>
                  {p.colors.slice(0, 4).map((c, i) => (
                    <div
                      key={i}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        background: `rgb(${c.r}, ${c.g}, ${c.b})`,
                        boxShadow: `0 0 4px rgba(${c.r}, ${c.g}, ${c.b}, 0.5)`,
                      }}
                    />
                  ))}
                </div>
                <span style={{ flex: 1, fontSize: 13 }}>{p.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (p._id) onDeletePreset(p._id);
                  }}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: 16,
                    padding: '0 4px',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
