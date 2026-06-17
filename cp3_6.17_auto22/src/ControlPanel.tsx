import React from 'react'

interface ControlPanelProps {
  thrustStrength: number
  particleSize: number
  lineThreshold: number
  onThrustStrengthChange: (value: number) => void
  onParticleSizeChange: (value: number) => void
  onLineThresholdChange: (value: number) => void
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  thrustStrength,
  particleSize,
  lineThreshold,
  onThrustStrengthChange,
  onParticleSizeChange,
  onLineThresholdChange,
}) => {
  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    left: '24px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '220px',
    background: 'rgba(10, 10, 20, 0.7)',
    borderRadius: '16px',
    padding: '24px 20px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    zIndex: 100,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: '#fff',
    userSelect: 'none',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '20px',
    color: '#fdd835',
    letterSpacing: '0.5px',
  }

  const controlGroupStyle: React.CSSProperties = {
    marginBottom: '24px',
  }

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.8)',
  }

  const valueStyle: React.CSSProperties = {
    color: '#fdd835',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  }

  const sliderContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: '160px',
    height: '4px',
  }

  const sliderTrackStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '4px',
    background: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '2px',
  }

  const sliderFillStyle = (percentage: number): React.CSSProperties => ({
    position: 'absolute',
    height: '4px',
    background: '#fdd835',
    borderRadius: '2px',
    width: `${percentage}%`,
  })

  const inputStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '4px',
    margin: 0,
    opacity: 0,
    cursor: 'pointer',
    pointerEvents: 'auto',
  }

  const thumbStyle = (percentage: number): React.CSSProperties => ({
    position: 'absolute',
    top: '50%',
    left: `calc(${percentage}% - 7px)`,
    transform: 'translateY(-50%)',
    width: '14px',
    height: '14px',
    background: '#fdd835',
    borderRadius: '50%',
    boxShadow: '0 0 12px rgba(253, 216, 53, 0.6)',
    pointerEvents: 'none',
  })

  const thrustPercentage = ((thrustStrength - 0.5) / (3.0 - 0.5)) * 100
  const sizePercentage = ((particleSize - 1) / (6 - 1)) * 100
  const linePercentage = ((lineThreshold - 10) / (60 - 10)) * 100

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>参数控制</div>

      <div style={controlGroupStyle}>
        <div style={labelStyle}>
          <span>推力强度</span>
          <span style={valueStyle}>{thrustStrength.toFixed(1)}</span>
        </div>
        <div style={sliderContainerStyle}>
          <div style={sliderTrackStyle} />
          <div style={sliderFillStyle(thrustPercentage)} />
          <div style={thumbStyle(thrustPercentage)} />
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={thrustStrength}
            onChange={(e) => onThrustStrengthChange(parseFloat(e.target.value))}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={controlGroupStyle}>
        <div style={labelStyle}>
          <span>粒子大小</span>
          <span style={valueStyle}>{particleSize}px</span>
        </div>
        <div style={sliderContainerStyle}>
          <div style={sliderTrackStyle} />
          <div style={sliderFillStyle(sizePercentage)} />
          <div style={thumbStyle(sizePercentage)} />
          <input
            type="range"
            min="1"
            max="6"
            step="1"
            value={particleSize}
            onChange={(e) => onParticleSizeChange(parseInt(e.target.value))}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={controlGroupStyle}>
        <div style={labelStyle}>
          <span>连线阈值</span>
          <span style={valueStyle}>{lineThreshold}px</span>
        </div>
        <div style={sliderContainerStyle}>
          <div style={sliderTrackStyle} />
          <div style={sliderFillStyle(linePercentage)} />
          <div style={thumbStyle(linePercentage)} />
          <input
            type="range"
            min="10"
            max="60"
            step="5"
            value={lineThreshold}
            onChange={(e) => onLineThresholdChange(parseInt(e.target.value))}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        fontSize: '11px',
        color: 'rgba(255, 255, 255, 0.5)',
        lineHeight: '1.6',
      }}>
        按住鼠标左键拖拽画布，<br/>
        粒子会被无形的手拨开，<br/>
        产生扭曲和漩涡效果。
      </div>
    </div>
  )
}

export default ControlPanel
