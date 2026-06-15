import { useState } from 'react';

interface ToolbarProps {
  colors: string[];
  thicknesses: number[];
  selectedColor: string;
  selectedThickness: number;
  onColorChange: (color: string) => void;
  onThicknessChange: (thickness: number) => void;
  onClear: () => void;
  connected: boolean;
}

function Toolbar({
  colors,
  thicknesses,
  selectedColor,
  selectedThickness,
  onColorChange,
  onThicknessChange,
  onClear,
  connected,
}: ToolbarProps) {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        background: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: -4 }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: connected ? '#51CF66' : '#CED4DA',
          transition: 'background 0.2s ease',
        }} />
        <span style={{ fontSize: 11, color: '#6C757D' }}>
          {connected ? '已连接' : '未连接'}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 8,
      }}>
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            onMouseEnter={() => setHoveredBtn(color)}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: selectedColor === color ? '3px solid #212529' : '2px solid #DEE2E6',
              background: color,
              cursor: 'pointer',
              transform: (hoveredBtn === color || selectedColor === color) ? 'translateY(-2px) scale(1.05)' : 'translateY(0)',
              boxShadow: (hoveredBtn === color || selectedColor === color) ? '0 4px 8px rgba(0,0,0,0.25)' : 'none',
              transition: 'all 0.2s ease',
              padding: 0,
            }}
          />
        ))}
      </div>

      <div style={{
        borderTop: '1px solid #F1F3F5',
        paddingTop: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {thicknesses.map((thickness) => (
          <button
            key={thickness}
            onClick={() => onThicknessChange(thickness)}
            onMouseEnter={() => setHoveredBtn(`t-${thickness}`)}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              width: 40,
              height: 28,
              borderRadius: 8,
              border: selectedThickness === thickness ? '2px solid #212529' : '1px solid #DEE2E6',
              background: selectedThickness === thickness ? '#F1F3F5' : '#FFFFFF',
              cursor: 'pointer',
              transform: (hoveredBtn === `t-${thickness}` || selectedThickness === thickness) ? 'translateY(-2px)' : 'translateY(0)',
              boxShadow: (hoveredBtn === `t-${thickness}` || selectedThickness === thickness) ? '0 4px 8px rgba(0,0,0,0.25)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <div style={{
              width: thickness * 2,
              height: thickness * 2,
              borderRadius: '50%',
              background: '#212529',
            }} />
          </button>
        ))}
      </div>

      <div style={{
        borderTop: '1px solid #F1F3F5',
        paddingTop: 16,
      }}>
        <button
          onClick={onClear}
          onMouseEnter={() => setHoveredBtn('clear')}
          onMouseLeave={() => setHoveredBtn(null)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            border: '1px solid #FFC9C9',
            background: '#FFF5F5',
            cursor: 'pointer',
            transform: hoveredBtn === 'clear' ? 'translateY(-2px)' : 'translateY(0)',
            boxShadow: hoveredBtn === 'clear' ? '0 4px 8px rgba(0,0,0,0.25)' : 'none',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            padding: 0,
          }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

export default Toolbar;
