import React from 'react'

interface ControlPanelProps {
  forceStrength: number
  particleSize: number
  linkThreshold: number
  onForceStrengthChange: (value: number) => void
  onParticleSizeChange: (value: number) => void
  onLinkThresholdChange: (value: number) => void
}

const sliderStyle: React.CSSProperties = {
  width: '160px',
  height: '4px',
  WebkitAppearance: 'none',
  appearance: 'none',
  background: 'rgba(255,255,255,0.15)',
  borderRadius: '2px',
  outline: 'none',
  cursor: 'pointer',
}

const sliderThumbStyle = `
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fdd835;
    cursor: pointer;
    box-shadow: 0 0 8px rgba(253, 216, 53, 0.6);
    border: none;
  }
  input[type="range"]::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fdd835;
    cursor: pointer;
    box-shadow: 0 0 8px rgba(253, 216, 53, 0.6);
    border: none;
  }
`

export default function ControlPanel({
  forceStrength,
  particleSize,
  linkThreshold,
  onForceStrengthChange,
  onParticleSizeChange,
  onLinkThresholdChange,
}: ControlPanelProps) {
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
          background: 'rgba(10,10,20,0.7)',
          borderRadius: '16px',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 10,
          color: '#ffffff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: '15px',
            fontWeight: 600,
            marginBottom: '20px',
            color: '#fdd835',
            letterSpacing: '0.5px',
          }}
        >
          粒子控制面板
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <span>推力强度</span>
            <span style={{ color: '#fdd835', fontWeight: 500 }}>
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
              fontSize: '12px',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <span>粒子大小</span>
            <span style={{ color: '#fdd835', fontWeight: 500 }}>
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
              fontSize: '12px',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <span>连线阈值</span>
            <span style={{ color: '#fdd835', fontWeight: 500 }}>
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
            style={sliderStyle}
          />
        </div>

        <div
          style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.4)',
            lineHeight: 1.6,
          }}
        >
          按住鼠标左键拖拽
          <br />
          与粒子场进行实时交互
        </div>
      </div>
    </>
  )
}
