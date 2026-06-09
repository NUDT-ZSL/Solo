import React from 'react';
import type { VegetationParams } from './VegetationSystem';

interface ControlPanelProps {
  params: VegetationParams;
  onChange: (params: VegetationParams) => void;
}

type SliderKey = 'density' | 'heightRange' | 'hueShift' | 'growthSpeed' | 'windStrength' | 'seasonFactor';

const PRESETS: Record<string, Partial<VegetationParams>> = {
  '春季花海': { density: 1200, heightRange: 1.8, hueShift: 300, growthSpeed: 1.0, windStrength: 1.5, seasonFactor: 0.05, trunkColor: '#6b4226', leafColor: '#f8bbd0' },
  '盛夏密林': { density: 3500, heightRange: 4.0, hueShift: 120, growthSpeed: 0.7, windStrength: 1.2, seasonFactor: 0.25, trunkColor: '#5d4037', leafColor: '#2e7d32' },
  '秋日彩林': { density: 1800, heightRange: 3.0, hueShift: 30, growthSpeed: 0.6, windStrength: 2.5, seasonFactor: 0.55, trunkColor: '#795548', leafColor: '#ff8f00' },
  '冬日疏林': { density: 400, heightRange: 2.2, hueShift: 200, growthSpeed: 0.3, windStrength: 3.5, seasonFactor: 0.9, trunkColor: '#455a64', leafColor: '#b0bec5' }
};

export const DEFAULT_PARAMS: VegetationParams = {
  density: 500,
  heightRange: 2.0,
  hueShift: 0,
  growthSpeed: 0.5,
  windStrength: 1.0,
  seasonFactor: 0.3,
  trunkColor: '#6b4226',
  leafColor: '#4caf50'
};

const TRUNK_COLORS = ['#6b4226', '#8b5a2b', '#a0522d', '#5d4037', '#795548', '#4e342e', '#3e2723', '#455a64', '#6d4c41', '#8d6e63'];
const LEAF_COLORS = ['#4caf50', '#2e7d32', '#66bb6a', '#81c784', '#a5d6a7', '#f8bbd0', '#ff8f00', '#e65100', '#ffeb3b', '#b0bec5', '#ce93d8', '#ef9a9a'];

const sliderRanges: Record<SliderKey, { min: number; max: number; step: number; unit: string; label: string }> = {
  density: { min: 50, max: 5000, step: 10, unit: ' 株', label: '植被密度' },
  heightRange: { min: 0.5, max: 5.0, step: 0.1, unit: ' m', label: '高度范围' },
  hueShift: { min: 0, max: 360, step: 1, unit: '°', label: '色相偏移' },
  growthSpeed: { min: 0.1, max: 2.0, step: 0.05, unit: 'x', label: '生长速度' },
  windStrength: { min: 0, max: 5, step: 0.1, unit: '', label: '风强度' },
  seasonFactor: { min: 0, max: 1, step: 0.01, unit: '', label: '季节因子' }
};

const ControlPanel: React.FC<ControlPanelProps> = ({ params, onChange }) => {
  const handleSlider = (key: SliderKey, value: number) => {
    onChange({ ...params, [key]: value });
  };

  const handleColor = (key: 'trunkColor' | 'leafColor', value: string) => {
    onChange({ ...params, [key]: value });
  };

  const applyPreset = (name: string) => {
    onChange({ ...params, ...PRESETS[name] } as VegetationParams);
  };

  const reset = () => onChange({ ...DEFAULT_PARAMS });

  const renderSlider = (key: SliderKey) => {
    const { min, max, step, unit, label } = sliderRanges[key];
    const val = params[key] as number;
    const pct = ((val - min) / (max - min)) * 100;
    const isInt = step >= 1;
    return (
      <div style={{ marginBottom: '14px' }} key={key}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ color: '#a0aabf', fontSize: '14px' }}>{label}</span>
          <span style={{ color: '#4fc3f7', fontSize: '14px', fontWeight: 600 }}>
            {isInt ? val.toFixed(0) : val.toFixed(2)}{unit}
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={val}
          onChange={(e) => handleSlider(key, parseFloat(e.target.value))}
          style={{
            width: '100%',
            height: '4px',
            borderRadius: '2px',
            outline: 'none',
            appearance: 'none',
            WebkitAppearance: 'none',
            background: `linear-gradient(to right, #4fc3f7 0%, #4fc3f7 ${pct}%, #2a3142 ${pct}%, #2a3142 100%)`
          }}
          className="veg-slider"
        />
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: '20px',
        bottom: '20px',
        width: '260px',
        height: 'auto',
        maxHeight: 'calc(100vh - 40px)',
        padding: '18px',
        background: 'rgba(15, 20, 30, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: '1px solid rgba(79, 195, 247, 0.15)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        overflowY: 'auto',
        zIndex: 100
      }}
      className="veg-panel"
    >
      <h2 style={{
        color: '#e0e8f5',
        fontSize: '16px',
        fontWeight: 700,
        marginBottom: '16px',
        letterSpacing: '0.5px',
        borderBottom: '1px solid rgba(79, 195, 247, 0.2)',
        paddingBottom: '10px'
      }}>🌿 浮光叠翠 · 控制面板</h2>

      {(Object.keys(sliderRanges) as SliderKey[]).map(renderSlider)}

      <div style={{ marginBottom: '14px' }}>
        <span style={{ color: '#a0aabf', fontSize: '14px', display: 'block', marginBottom: '6px' }}>树干颜色</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '4px' }}>
          {TRUNK_COLORS.map(c => (
            <div
              key={c}
              onClick={() => handleColor('trunkColor', c)}
              style={{
                width: '16px', height: '16px',
                background: c,
                borderRadius: params.trunkColor === c ? '50%' : '3px',
                cursor: 'pointer',
                boxShadow: params.trunkColor === c ? '0 0 0 2px #4fc3f7' : 'none',
                transition: 'all 0.15s'
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <span style={{ color: '#a0aabf', fontSize: '14px', display: 'block', marginBottom: '6px' }}>叶片颜色</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '4px' }}>
          {LEAF_COLORS.map(c => (
            <div
              key={c}
              onClick={() => handleColor('leafColor', c)}
              style={{
                width: '16px', height: '16px',
                background: c,
                borderRadius: params.leafColor === c ? '50%' : '3px',
                cursor: 'pointer',
                boxShadow: params.leafColor === c ? '0 0 0 2px #4fc3f7' : 'none',
                transition: 'all 0.15s'
              }}
            />
          ))}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '6px',
        marginBottom: '10px'
      }}>
        {Object.keys(PRESETS).map(name => (
          <button
            key={name}
            onClick={() => applyPreset(name)}
            style={{
              padding: '7px 8px',
              background: 'rgba(79, 195, 247, 0.12)',
              color: '#b0bec5',
              border: '1px solid rgba(79, 195, 247, 0.25)',
              borderRadius: '8px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
            className="preset-btn"
          >{name}</button>
        ))}
      </div>

      <button
        onClick={reset}
        style={{
          width: '100%',
          padding: '9px',
          background: 'linear-gradient(135deg, rgba(79, 195, 247, 0.2), rgba(79, 195, 247, 0.05))',
          color: '#4fc3f7',
          border: '1px solid rgba(79, 195, 247, 0.4)',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        className="reset-btn"
      >↻ 重置为默认</button>

      <style>{`
        .veg-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px; height: 14px;
          border-radius: 50%;
          background: #4fc3f7;
          cursor: pointer;
          border: 2px solid #1a1f2c;
          box-shadow: 0 0 8px rgba(79,195,247,0.5);
          transition: all 0.15s;
        }
        .veg-slider::-webkit-slider-thumb:hover { background: #81d4fa; transform: scale(1.15); }
        .veg-slider:active::-webkit-slider-thumb { background: #81d4fa; transform: scale(1.2); }
        .veg-slider::-moz-range-thumb {
          width: 14px; height: 14px;
          border-radius: 50%;
          background: #4fc3f7;
          cursor: pointer;
          border: 2px solid #1a1f2c;
          box-shadow: 0 0 8px rgba(79,195,247,0.5);
          transition: all 0.15s;
        }
        .preset-btn:hover { transform: scale(1.05); background: rgba(79, 195, 247, 0.25); color: #e0e8f5; }
        .preset-btn:active { transform: translateY(2px); }
        .reset-btn:hover { transform: scale(1.02); box-shadow: 0 0 16px rgba(79,195,247,0.3); }
        .reset-btn:active { transform: translateY(2px); }
        @media (max-width: 768px) {
          .veg-panel { width: 180px !important; height: 300px !important; overflow-y: auto; }
        }
      `}</style>
    </div>
  );
};

export default ControlPanel;
