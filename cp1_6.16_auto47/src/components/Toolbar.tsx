import React from 'react';
import type { ToolType } from './Canvas';

export interface ToolbarProps {
  tool: ToolType;
  color: string;
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
}

const tools: { type: ToolType; label: string; icon: string }[] = [
  { type: 'pen', label: '画笔', icon: '✏️' },
  { type: 'sticky', label: '便签', icon: '📝' },
  { type: 'arrow', label: '箭头', icon: '➡️' },
  { type: 'eraser', label: '橡皮擦', icon: '🧹' },
];

const Toolbar: React.FC<ToolbarProps> = ({ tool, color, onToolChange, onColorChange }) => {
  return (
    <div
      style={{
        width: 60,
        height: '100vh',
        background: '#2C3E50',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 12,
        gap: 8,
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {tools.map(t => (
        <button
          key={t.type}
          onClick={() => onToolChange(t.type)}
          title={t.label}
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            border: 'none',
            background: tool === t.type ? '#1ABC9C' : 'transparent',
            color: tool === t.type ? '#fff' : '#BDC3C7',
            fontSize: 20,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s ease, color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (tool !== t.type) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(26,188,156,0.2)';
          }}
          onMouseLeave={(e) => {
            if (tool !== t.type) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          {t.icon}
        </button>
      ))}

      <div style={{ width: 36, height: 1, background: '#4A6274', margin: '4px 0' }} />

      <label
        title="选择颜色"
        style={{
          width: 44,
          height: 44,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          background: 'transparent',
          transition: 'background 0.2s ease',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLLabelElement).style.background = 'rgba(26,188,156,0.2)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLLabelElement).style.background = 'transparent'; }}
      >
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: color,
              border: '2px solid rgba(255,255,255,0.3)',
            }}
          />
          <input
            type="color"
            value={color}
            onChange={(e) => {
              onColorChange(e.target.value);
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 28,
              height: 28,
              opacity: 0,
              cursor: 'pointer',
            }}
          />
        </div>
      </label>
    </div>
  );
};

export default Toolbar;
