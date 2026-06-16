import React, { useState, useCallback } from 'react';

interface ControlPanelProps {
  lightIntensity: number;
  currentSpeed: number;
  nutrientLevel: number;
  onLightChange: (value: number) => void;
  onCurrentChange: (value: number) => void;
  onNutrientChange: (value: number) => void;
}

const glowStyle: React.CSSProperties = {
  boxShadow: '0 0 8px rgba(0,255,136,0.3)',
};

const sliderBaseStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  borderRadius: '3px',
  outline: 'none',
  WebkitAppearance: 'none',
  appearance: 'none',
  cursor: 'pointer',
  ...glowStyle,
};

const labelStyle: React.CSSProperties = {
  color: '#00FF88',
  fontSize: '13px',
  fontWeight: 600,
  marginBottom: '4px',
  letterSpacing: '0.5px',
};

const valueStyle: React.CSSProperties = {
  color: '#FFFFFF',
  fontSize: '13px',
  fontFamily: 'monospace',
  marginLeft: '8px',
};

const ControlPanel: React.FC<ControlPanelProps> = ({
  lightIntensity,
  currentSpeed,
  nutrientLevel,
  onLightChange,
  onCurrentChange,
  onNutrientChange,
}) => {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  const handleLightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onLightChange(parseFloat(e.target.value));
    },
    [onLightChange]
  );

  const handleCurrentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onCurrentChange(parseFloat(e.target.value));
    },
    [onCurrentChange]
  );

  const handleNutrientChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onNutrientChange(parseFloat(e.target.value));
    },
    [onNutrientChange]
  );

  const currentPercent = `${((currentSpeed / 2) * 100).toFixed(0)}%`;

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    right: '16px',
    top: '16px',
    width: '260px',
    background: 'rgba(11, 61, 58, 0.7)',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    backdropFilter: 'blur(8px)',
  };

  const bottomBarStyle: React.CSSProperties = {
    display: 'none',
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(11, 61, 58, 0.7)',
    borderRadius: '12px 12px 0 0',
    padding: '12px 20px',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backdropFilter: 'blur(8px)',
  };

  const resetBtnStyle: React.CSSProperties = {
    background: hoveredBtn === 'reset' ? '#00CC6A' : '#00994D',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    ...glowStyle,
  };

  return (
    <>
      <div style={panelStyle} className="control-panel-desktop">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
            <span style={labelStyle}>光照强度</span>
            <span style={valueStyle}>{lightIntensity.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1.0}
            step={0.01}
            value={lightIntensity}
            onChange={handleLightChange}
            style={{
              ...sliderBaseStyle,
              background: `linear-gradient(to right, #FFD700, #4682B4)`,
            }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
            <span style={labelStyle}>洋流速度</span>
            <span style={valueStyle}>{currentPercent}</span>
          </div>
          <input
            type="range"
            min={0}
            max={2.0}
            step={0.01}
            value={currentSpeed}
            onChange={handleCurrentChange}
            style={{
              ...sliderBaseStyle,
              background: `linear-gradient(to right, #4A90D9, #00FF88)`,
            }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
            <span style={labelStyle}>营养盐指数</span>
            <span style={valueStyle}>{nutrientLevel}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={nutrientLevel}
            onChange={handleNutrientChange}
            style={{
              ...sliderBaseStyle,
              background: `linear-gradient(to right, #FF6B6B, #00FF88)`,
            }}
          />
        </div>

        <button
          style={resetBtnStyle}
          onMouseEnter={() => setHoveredBtn('reset')}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={() => {
            onLightChange(0.5);
            onCurrentChange(0.5);
            onNutrientChange(50);
          }}
        >
          重置参数
        </button>
      </div>

      <div style={bottomBarStyle} className="control-panel-mobile">
        <div style={{ flex: 1, padding: '0 8px' }}>
          <span style={{ ...labelStyle, fontSize: '11px' }}>光照</span>
          <input
            type="range"
            min={0.1}
            max={1.0}
            step={0.01}
            value={lightIntensity}
            onChange={handleLightChange}
            style={{
              ...sliderBaseStyle,
              background: 'linear-gradient(to right, #FFD700, #4682B4)',
              height: '4px',
            }}
          />
        </div>
        <div style={{ flex: 1, padding: '0 8px' }}>
          <span style={{ ...labelStyle, fontSize: '11px' }}>洋流</span>
          <input
            type="range"
            min={0}
            max={2.0}
            step={0.01}
            value={currentSpeed}
            onChange={handleCurrentChange}
            style={{
              ...sliderBaseStyle,
              background: 'linear-gradient(to right, #4A90D9, #00FF88)',
              height: '4px',
            }}
          />
        </div>
        <div style={{ flex: 1, padding: '0 8px' }}>
          <span style={{ ...labelStyle, fontSize: '11px' }}>营养</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={nutrientLevel}
            onChange={handleNutrientChange}
            style={{
              ...sliderBaseStyle,
              background: 'linear-gradient(to right, #FF6B6B, #00FF88)',
              height: '4px',
            }}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 1280px) {
          .control-panel-desktop { display: none !important; }
          .control-panel-mobile { display: flex !important; }
        }
        @media (min-width: 1281px) {
          .control-panel-desktop { display: flex !important; }
          .control-panel-mobile { display: none !important; }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #00FF88;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(0,255,136,0.5);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #00FF88;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(0,255,136,0.5);
        }
      `}</style>
    </>
  );
};

export default ControlPanel;
