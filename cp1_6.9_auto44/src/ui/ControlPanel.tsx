import React, { useState, useEffect } from 'react'

export interface ControlParams {
  cableCount: number
  rotationSpeed: number
  brightness: number
  starDensity: number
}

interface Props {
  params: ControlParams
  onChange: (params: ControlParams) => void
}

const sliderStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  marginBottom: '16px',
}

const labelRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const trackStyle: React.CSSProperties = {
  width: '100%',
  height: '4px',
  background: '#333',
  borderRadius: '2px',
  outline: 'none',
  appearance: 'none',
  WebkitAppearance: 'none',
  cursor: 'pointer',
}

const sliderThumbStyle = `
  input[type=range] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    background: #333;
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #00FFFF;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 0 6px rgba(0, 255, 255, 0.5);
  }
  input[type=range]::-webkit-slider-thumb:hover {
    background: #66FFFF;
    transform: scale(1.2);
    box-shadow: 0 0 12px rgba(0, 255, 255, 0.8);
  }
  input[type=range]::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #00FFFF;
    cursor: pointer;
    border: none;
    transition: all 0.3s ease;
  }
  input[type=range]::-moz-range-thumb:hover {
    background: #66FFFF;
  }
`

const ControlPanel: React.FC<Props> = ({ params, onChange }) => {
  const [isMobile, setIsMobile] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setIsExpanded(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const updateParam = <K extends keyof ControlParams>(key: K, value: number) => {
    onChange({ ...params, [key]: value })
  }

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: 'rgba(10, 10, 30, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: isMobile && !isExpanded ? '10px' : '20px',
    zIndex: 100,
    transition: 'all 0.3s ease',
    width: isMobile ? (isExpanded ? '260px' : '48px') : '260px',
  }

  const toggleButtonStyle: React.CSSProperties = {
    width: '28px',
    height: '28px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#00FFFF',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  }

  return (
    <>
      <style>{sliderThumbStyle}</style>
      <div style={containerStyle}>
        {isMobile && (
          <button
            style={toggleButtonStyle}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '×' : '☰'}
          </button>
        )}
        <div style={{ display: (!isMobile || isExpanded) ? 'block' : 'none' }}>
          {(!isMobile || isExpanded) && (
            <>
              <div style={sliderStyle}>
                <div style={labelRowStyle}>
                  <span style={{ fontSize: '12px', color: '#CCD0E0' }}>线缆数量</span>
                  <span style={{ fontSize: '14px', color: '#00FFFF', fontWeight: 600 }}>{params.cableCount}</span>
                </div>
                <input
                  type="range"
                  min={80}
                  max={160}
                  step={1}
                  value={params.cableCount}
                  onChange={(e) => updateParam('cableCount', parseInt(e.target.value))}
                  style={trackStyle}
                />
              </div>

              <div style={sliderStyle}>
                <div style={labelRowStyle}>
                  <span style={{ fontSize: '12px', color: '#CCD0E0' }}>旋转速度</span>
                  <span style={{ fontSize: '14px', color: '#00FFFF', fontWeight: 600 }}>{params.rotationSpeed.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.5}
                  step={0.001}
                  value={params.rotationSpeed}
                  onChange={(e) => updateParam('rotationSpeed', parseFloat(e.target.value))}
                  style={trackStyle}
                />
              </div>

              <div style={sliderStyle}>
                <div style={labelRowStyle}>
                  <span style={{ fontSize: '12px', color: '#CCD0E0' }}>亮度</span>
                  <span style={{ fontSize: '14px', color: '#00FFFF', fontWeight: 600 }}>{params.brightness.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={1.0}
                  step={0.01}
                  value={params.brightness}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                  style={trackStyle}
                />
              </div>

              <div style={sliderStyle}>
                <div style={labelRowStyle}>
                  <span style={{ fontSize: '12px', color: '#CCD0E0' }}>星点密度</span>
                  <span style={{ fontSize: '14px', color: '#00FFFF', fontWeight: 600 }}>{params.starDensity}</span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={2000}
                  step={50}
                  value={params.starDensity}
                  onChange={(e) => updateParam('starDensity', parseInt(e.target.value))}
                  style={trackStyle}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default ControlPanel
