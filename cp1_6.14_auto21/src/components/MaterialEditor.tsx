import React from 'react';
import { MaterialType, MaterialParams } from '../PhysicsEngine';

interface MaterialEditorProps {
  material: MaterialType;
  params: MaterialParams;
  onChange: (material: MaterialType, params: MaterialParams) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

const MATERIAL_NAMES: Record<MaterialType, string> = {
  grass: '草地',
  sand: '沙地',
  stone: '石板',
  metal: '金属',
  wood: '木地板'
};

const sliderStyle: React.CSSProperties = {
  WebkitAppearance: 'none',
  appearance: 'none',
  width: '100%',
  height: '6px',
  borderRadius: '3px',
  background: '#334155',
  outline: 'none',
  transition: 'all 0.2s ease-out',
  cursor: 'pointer'
};

const sliderThumbStyle = `
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #8b5cf6;
    cursor: pointer;
    transition: all 0.2s ease-out;
  }
  input[type=range]::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }
  input[type=range]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #8b5cf6;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease-out;
  }
`;

export const MaterialEditor: React.FC<MaterialEditorProps> = ({ material, params, onChange, onClose, position }) => {
  const handleFrictionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onChange(material, { ...params, friction: Math.round(val * 20) / 20 });
  };

  const handleBounceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onChange(material, { ...params, bounce: Math.round(val * 20) / 20 });
  };

  return (
    <>
      <style>{sliderThumbStyle}</style>
      <div style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '280px',
        background: '#1e293b',
        borderRadius: '12px',
        padding: '16px',
        zIndex: 200,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        transition: 'all 0.2s ease-out'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{MATERIAL_NAMES[material]}</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
              transition: 'color 0.2s ease-out',
              padding: '0 4px'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <label style={{ color: '#94a3b8', fontSize: '12px' }}>摩擦系数</label>
            <span style={{ color: '#8b5cf6', fontSize: '12px', fontWeight: 600 }}>{params.friction.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={params.friction}
            onChange={handleFrictionChange}
            style={sliderStyle}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <label style={{ color: '#94a3b8', fontSize: '12px' }}>弹性系数</label>
            <span style={{ color: '#8b5cf6', fontSize: '12px', fontWeight: 600 }}>{params.bounce.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={params.bounce}
            onChange={handleBounceChange}
            style={sliderStyle}
          />
        </div>
      </div>
    </>
  );
};
