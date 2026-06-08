import { useCallback, useState } from 'react';

interface ControlPanelProps {
  starCount: number;
  flickerSpeed: number;
  onStarCountChange: (v: number) => void;
  onFlickerSpeedChange: (v: number) => void;
  onReset: () => void;
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  background: 'rgba(10, 10, 40, 0.6)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(100, 140, 255, 0.25)',
  borderRadius: 12,
  padding: '20px 24px',
  fontFamily: '"Courier New", monospace',
  color: '#a0b8ff',
  fontSize: 13,
  minWidth: 220,
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(100, 140, 255, 0.1)',
  zIndex: 10,
  userSelect: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6,
  fontSize: 12,
  letterSpacing: 1,
  textTransform: 'uppercase',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  appearance: 'none',
  WebkitAppearance: 'none',
  height: 4,
  background: 'rgba(100, 140, 255, 0.2)',
  borderRadius: 2,
  outline: 'none',
  cursor: 'pointer',
  marginBottom: 16,
};

const buttonBase: React.CSSProperties = {
  width: '100%',
  padding: '10px 0',
  background: 'rgba(100, 140, 255, 0.15)',
  border: '1px solid rgba(100, 140, 255, 0.3)',
  borderRadius: 6,
  color: '#a0b8ff',
  fontFamily: '"Courier New", monospace',
  fontSize: 12,
  letterSpacing: 2,
  textTransform: 'uppercase',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

export default function ControlPanel({
  starCount,
  flickerSpeed,
  onStarCountChange,
  onFlickerSpeedChange,
  onReset,
}: ControlPanelProps) {
  const [hoveredBtn, setHoveredBtn] = useState(false);
  const [pressedBtn, setPressedBtn] = useState(false);

  const handleStarCountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onStarCountChange(Number(e.target.value));
    },
    [onStarCountChange],
  );

  const handleFlickerSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFlickerSpeedChange(Number(e.target.value));
    },
    [onFlickerSpeedChange],
  );

  return (
    <div style={panelStyle}>
      <div
        style={{
          fontSize: 14,
          color: '#ffe87a',
          marginBottom: 16,
          letterSpacing: 3,
          textAlign: 'center',
        }}
      >
        ✦ 控制面板 ✦
      </div>

      <div style={labelStyle}>
        <span>星图密度</span>
        <span style={{ color: '#ffe87a' }}>{starCount}</span>
      </div>
      <input
        type="range"
        min={100}
        max={1000}
        step={10}
        value={starCount}
        onChange={handleStarCountChange}
        style={sliderStyle}
      />

      <div style={labelStyle}>
        <span>闪烁速度</span>
        <span style={{ color: '#ffe87a' }}>{flickerSpeed.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={0.5}
        max={2.0}
        step={0.1}
        value={flickerSpeed}
        onChange={handleFlickerSpeedChange}
        style={sliderStyle}
      />

      <button
        onClick={onReset}
        onMouseEnter={() => setHoveredBtn(true)}
        onMouseLeave={() => {
          setHoveredBtn(false);
          setPressedBtn(false);
        }}
        onMouseDown={() => setPressedBtn(true)}
        onMouseUp={() => setPressedBtn(false)}
        style={{
          ...buttonBase,
          background: pressedBtn
            ? 'rgba(100, 140, 255, 0.4)'
            : hoveredBtn
              ? 'rgba(100, 140, 255, 0.25)'
              : 'rgba(100, 140, 255, 0.15)',
          borderColor: pressedBtn
            ? 'rgba(100, 140, 255, 0.6)'
            : hoveredBtn
              ? 'rgba(100, 140, 255, 0.5)'
              : 'rgba(100, 140, 255, 0.3)',
          color: pressedBtn ? '#ffffff' : hoveredBtn ? '#d0e0ff' : '#a0b8ff',
          transform: pressedBtn ? 'scale(0.97)' : 'scale(1)',
        }}
      >
        ⟳ 重置视角
      </button>
    </div>
  );
}
