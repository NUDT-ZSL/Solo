import { useRef } from 'react';

const PRESET_COLORS = [
  '#ffffff', '#c0c0c0', '#808080', '#404040', '#202020', '#000000',
  '#ff0000', '#cc0000', '#990000', '#ff4444', '#ff6666', '#ff8888',
  '#ff8800', '#cc6600', '#994400', '#ffaa44', '#ffbb66', '#ffcc88',
  '#ffff00', '#cccc00', '#999900', '#ffff44', '#ffff66', '#ffff88',
  '#00ff00', '#00cc00', '#009900', '#44ff44', '#66ff66', '#88ff88',
  '#00ffff', '#00cccc', '#009999', '#44ffff', '#66ffff', '#88ffff',
  '#0000ff', '#0000cc', '#000099', '#4444ff', '#6666ff', '#8888ff',
  '#ff00ff', '#cc00cc', '#990099', '#ff44ff', '#ff66ff', '#ff88ff',
];

interface ColorPaletteProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  isMobile: boolean;
}

export default function ColorPalette({ selectedColor, onColorSelect, isMobile }: ColorPaletteProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleCustomColor = () => {
    colorInputRef.current?.click();
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onColorSelect(e.target.value);
  };

  if (isMobile) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 8px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            backgroundColor: selectedColor,
            border: '2px solid #333',
            flexShrink: 0,
          }}
        />
        <div
          style={{
            display: 'flex',
            gap: '4px',
            overflowX: 'auto',
            flex: 1,
            padding: '4px 0',
          }}
        >
          {PRESET_COLORS.map((color) => (
            <div
              key={color}
              onClick={() => onColorSelect(color)}
              style={{
                width: '28px',
                height: '28px',
                backgroundColor: color,
                borderRadius: '4px',
                cursor: 'pointer',
                flexShrink: 0,
                border: color === selectedColor ? '2px solid #fff' : '1px solid #555',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.transform = 'scale(1)';
              }}
            />
          ))}
        </div>
        <button
          onClick={handleCustomColor}
          style={{
            padding: '4px 8px',
            background: '#3a3a4e',
            color: '#ccc',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = '#4a4a5e';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = '#3a3a4e';
          }}
        >
          自定义
        </button>
        <input
          ref={colorInputRef}
          type="color"
          value={selectedColor}
          onChange={handleColorChange}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '8px',
          backgroundColor: selectedColor,
          border: '2px solid #333',
          alignSelf: 'center',
          transition: 'background-color 0.2s',
        }}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 30px)',
          gridTemplateRows: 'repeat(8, 30px)',
          gap: '4px',
          justifyContent: 'center',
        }}
      >
        {PRESET_COLORS.map((color) => (
          <div
            key={color}
            onClick={() => onColorSelect(color)}
            style={{
              width: '30px',
              height: '30px',
              backgroundColor: color,
              borderRadius: '4px',
              cursor: 'pointer',
              border: color === selectedColor ? '2px solid #fff' : '1px solid #555',
              transition: 'transform 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.transform = 'scale(1)';
            }}
          />
        ))}
      </div>
      <button
        onClick={handleCustomColor}
        style={{
          width: '100%',
          padding: '8px',
          background: '#3a3a4e',
          color: '#ccc',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.background = '#4a4a5e';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.background = '#3a3a4e';
        }}
      >
        🎨 自定义颜色
      </button>
      <input
        ref={colorInputRef}
        type="color"
        value={selectedColor}
        onChange={handleColorChange}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
    </div>
  );
}
