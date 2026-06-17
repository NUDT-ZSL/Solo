import React from 'react'

interface ControlPanelProps {
  forceStrength: number
  particleSize: number
  linkThreshold: number
  onForceStrengthChange: (value: number) => void
  onParticleSizeChange: (value: number) => void
  onLinkThresholdChange: (value: number) => void
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  forceStrength,
  particleSize,
  linkThreshold,
  onForceStrengthChange,
  onParticleSizeChange,
  onLinkThresholdChange,
}) => {
  const sliderStyle: React.CSSProperties = {
    width: '160px',
    height: '4px',
    appearance: 'none',
    WebkitAppearance: 'none',
    background: 'rgba(255,255,255,0.1)',
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
      transition: box-shadow 0.2s ease;
    }
    .custom-slider::-webkit-slider-thumb:hover {
      box-shadow: 0 0 12px rgba(253, 216, 53, 0.8);
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

  return (
    <>
      <style>{sliderThumbStyle}</style>
      <div
        style={{
          position: 'fixed',
          left: '24px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '220px',
          padding: '24px 20px',
          background: 'rgba(10, 10, 20, 0.7)',
          borderRadius: '16px',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: 'white',
          zIndex: 10,
          userSelect: 'none',
        }}
      >
        <h3
          style={{
            margin: '0 0 24px 0',
            fontSize: '16px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            color: '#fdd835',
            textAlign: 'center',
          }}
        >
          粒子控制面板
        </h3>

        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
              推力强度
            </span>
            <span style={{ fontSize: '13px', color: '#fdd835', fontWeight: 500 }}>
              {forceStrength.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={forceStrength}
            onChange={(e) => onForceStrengthChange(parseFloat(e.target.value))}
            className="custom-slider"
            style={sliderStyle}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
              粒子大小
            </span>
            <span style={{ fontSize: '13px', color: '#fdd835', fontWeight: 500 }}>
              {particleSize}px
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="6"
            step="1"
            value={particleSize}
            onChange={(e) => onParticleSizeChange(parseInt(e.target.value))}
            className="custom-slider"
            style={sliderStyle}
          />
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
              连线阈值
            </span>
            <span style={{ fontSize: '13px', color: '#fdd835', fontWeight: 500 }}>
              {linkThreshold}px
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="60"
            step="5"
            value={linkThreshold}
            onChange={(e) => onLinkThresholdChange(parseInt(e.target.value))}
            className="custom-slider"
            style={sliderStyle}
          />
        </div>

        <div
          style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.4)',
            lineHeight: '1.6',
          }}
        >
          按住鼠标左键拖拽
          <br />
          影响粒子运动轨迹
        </div>
      </div>
    </>
  )
}

export default ControlPanel
