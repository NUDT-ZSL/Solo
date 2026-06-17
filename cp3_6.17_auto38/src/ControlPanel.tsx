import React from 'react'

interface ControlPanelProps {
  thrustStrength: number
  onThrustStrengthChange: (value: number) => void
  particleSize: number
  onParticleSizeChange: (value: number) => void
  lineThreshold: number
  onLineThresholdChange: (value: number) => void
}

const sliderStyle: React.CSSProperties = {
  width: '160px',
  height: '4px',
  WebkitAppearance: 'none',
  appearance: 'none',
  background: 'rgba(255,255,255,0.2)',
  borderRadius: '2px',
  outline: 'none',
  cursor: 'pointer',
}

const sliderThumbStyle = `
  .custom-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fdd835;
    cursor: pointer;
    box-shadow: 0 0 8px rgba(253, 216, 53, 0.6);
  }
  .custom-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fdd835;
    cursor: pointer;
    border: none;
    box-shadow: 0 0 8px rgba(253, 216, 53, 0.6);
  }
`

const ControlPanel: React.FC<ControlPanelProps> = ({
  thrustStrength,
  onThrustStrengthChange,
  particleSize,
  onParticleSizeChange,
  lineThreshold,
  onLineThresholdChange,
}) => {
  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    left: '20px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '220px',
    background: 'rgba(10, 10, 20, 0.7)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '16px',
    padding: '24px 20px',
    color: '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    zIndex: 10,
    userSelect: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    marginBottom: '8px',
    color: 'rgba(255,255,255,0.85)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }

  const valueStyle: React.CSSProperties = {
    color: '#fdd835',
    fontWeight: 600,
    fontSize: '12px',
  }

  const rowStyle: React.CSSProperties = {
    marginBottom: '24px',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 600,
    marginBottom: '24px',
    color: '#ffffff',
    letterSpacing: '0.5px',
  }

  return (
    <>
      <style>{sliderThumbStyle}</style>
      <div style={panelStyle}>
        <div style={titleStyle}>控制面板</div>

        <div style={rowStyle}>
          <div style={labelStyle}>
            <span>推力强度</span>
            <span style={valueStyle}>{thrustStrength.toFixed(1)}</span>
          </div>
          <input
            className="custom-slider"
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={thrustStrength}
            onChange={(e) => onThrustStrengthChange(parseFloat(e.target.value))}
            style={sliderStyle}
          />
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>
            <span>粒子大小</span>
            <span style={valueStyle}>{particleSize}px</span>
          </div>
          <input
            className="custom-slider"
            type="range"
            min="1"
            max="6"
            step="1"
            value={particleSize}
            onChange={(e) => onParticleSizeChange(parseInt(e.target.value))}
            style={sliderStyle}
          />
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>
            <span>连线阈值</span>
            <span style={valueStyle}>{lineThreshold}px</span>
          </div>
          <input
            className="custom-slider"
            type="range"
            min="10"
            max="60"
            step="5"
            value={lineThreshold}
            onChange={(e) => onLineThresholdChange(parseInt(e.target.value))}
            style={sliderStyle}
          />
        </div>
      </div>
    </>
  )
}

export default ControlPanel
