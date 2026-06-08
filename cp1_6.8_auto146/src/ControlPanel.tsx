import React from 'react';
import ColorPicker from './ColorPicker';

interface ControlPanelProps {
  startColor: string;
  endColor: string;
  speed: number;
  charSpacing: number;
  onStartColorChange: (color: string) => void;
  onEndColorChange: (color: string) => void;
  onSpeedChange: (speed: number) => void;
  onCharSpacingChange: (spacing: number) => void;
}

const sliderStyle: React.CSSProperties = {
  WebkitAppearance: 'none',
  appearance: 'none',
  width: '100%',
  height: '4px',
  borderRadius: '2px',
  background: 'rgba(255,255,255,0.15)',
  outline: 'none',
  cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'rgba(255,255,255,0.8)',
  minWidth: '50px',
  userSelect: 'none',
};

const valueStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.5)',
  fontFamily: 'monospace',
  minWidth: '40px',
  textAlign: 'right',
  userSelect: 'none',
};

const ControlPanel: React.FC<ControlPanelProps> = ({
  startColor,
  endColor,
  speed,
  charSpacing,
  onStartColorChange,
  onEndColorChange,
  onSpeedChange,
  onCharSpacingChange,
}) => {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px',
      alignItems: 'flex-end',
      justifyContent: 'center',
    }}>
      <ColorPicker label="起始色" value={startColor} onChange={onStartColorChange} />
      <ColorPicker label="结束色" value={endColor} onChange={onEndColorChange} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 180px', minWidth: '180px' }}>
        <span style={labelStyle}>速度</span>
        <input
          type="range"
          min={200}
          max={2000}
          step={50}
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          style={sliderStyle}
        />
        <span style={valueStyle}>{(speed / 1000).toFixed(1)}s</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 180px', minWidth: '180px' }}>
        <span style={labelStyle}>间距</span>
        <input
          type="range"
          min={0}
          max={20}
          step={1}
          value={charSpacing}
          onChange={(e) => onCharSpacingChange(Number(e.target.value))}
          style={sliderStyle}
        />
        <span style={valueStyle}>{charSpacing}px</span>
      </div>
    </div>
  );
};

export default ControlPanel;
