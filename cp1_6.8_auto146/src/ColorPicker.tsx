import React from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{
        fontSize: '13px',
        color: 'rgba(255,255,255,0.8)',
        minWidth: '50px',
        userSelect: 'none',
      }}>
        {label}
      </span>
      <div style={{ position: 'relative', width: '36px', height: '36px' }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: '2px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            cursor: 'pointer',
            padding: 0,
            background: 'transparent',
            outline: 'none',
          }}
        />
      </div>
      <span style={{
        fontSize: '12px',
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'monospace',
        userSelect: 'none',
      }}>
        {value.toUpperCase()}
      </span>
    </div>
  );
};

export default ColorPicker;
