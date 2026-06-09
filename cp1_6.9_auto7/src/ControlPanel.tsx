import { useState, useMemo } from 'react'

interface ControlPanelProps {
  magnetStrength: number
  onMagnetStrengthChange: (value: number) => void
  flowRate: number
  onFlowRateChange: (value: number) => void
  onReset: () => void
  isAutoEvolving: boolean
}

export function ControlPanel({
  magnetStrength,
  onMagnetStrengthChange,
  flowRate,
  onFlowRateChange,
  onReset,
  isAutoEvolving
}: ControlPanelProps) {
  const [hovered, setHovered] = useState(false)
  const [resetPressed, setResetPressed] = useState(false)
  const [knobAngle, setKnobAngle] = useState(0)

  const responsive = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768
    }
    return false
  }, [])

  const panelWidth = responsive ? 180 : 240
  const fontSize = responsive ? 12 : 14
  const sliderWidth = responsive ? 120 : 160
  const knobSize = responsive ? 36 : 44

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 20,
    right: 20,
    width: panelWidth,
    background: 'rgba(10, 10, 30, 0.7)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 8,
    padding: 12,
    color: '#e0e8ff',
    fontSize,
    fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif",
    boxShadow: hovered
      ? '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 4px rgba(100, 150, 255, 0.2)'
      : '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 4px rgba(100, 150, 255, 0.2)',
    transform: hovered ? 'translateY(-10px)' : 'translateY(0)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 1000,
    border: '1px solid rgba(100, 150, 255, 0.1)',
    userSelect: 'none'
  }

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    fontWeight: 500,
    color: '#b8c8ff',
    letterSpacing: '0.02em'
  }

  const valueStyle: React.CSSProperties = {
    color: '#6699ff',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
    fontSize: fontSize * 0.95
  }

  const sliderContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: 28,
    marginBottom: 14,
    display: 'flex',
    alignItems: 'center'
  }

  const trackStyle: React.CSSProperties = {
    position: 'absolute',
    width: sliderWidth,
    height: 4,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#333',
    borderRadius: 2,
    boxShadow: '0 0 4px rgba(100, 150, 255, 0.1)'
  }

  const fillPercent = ((magnetStrength - 0.5) / (5.0 - 0.5)) * 100
  const fillStyle: React.CSSProperties = {
    position: 'absolute',
    width: sliderWidth,
    height: 4,
    left: '50%',
    transform: 'translateX(-50%)',
    borderRadius: 2,
    clipPath: `inset(0 ${100 - fillPercent}% 0 0)`,
    background: 'linear-gradient(90deg, #3366FF, #9900FF)'
  }

  const inputStyle: React.CSSProperties = {
    position: 'absolute',
    width: sliderWidth,
    left: '50%',
    transform: 'translateX(-50%)',
    height: 28,
    opacity: 0,
    cursor: 'pointer',
    margin: 0,
    padding: 0,
    zIndex: 2
  }

  const thumbLeft = (fillPercent / 100) * sliderWidth
  const thumbStyle: React.CSSProperties = {
    position: 'absolute',
    width: 16,
    height: 16,
    left: `calc(50% - ${sliderWidth / 2}px + ${thumbLeft - 8}px)`,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3366FF, #9900FF)',
    boxShadow: '0 2px 8px rgba(51, 102, 255, 0.4)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 1,
    pointerEvents: 'none'
  }

  const knobPercent = ((flowRate - 0.1) / (2.0 - 0.1)) * 100
  const knobRotation = -135 + (knobPercent / 100) * 270

  const knobContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 14,
    padding: '8px 0',
    borderRadius: 6,
    background: 'rgba(50, 60, 100, 0.15)',
    boxShadow: '0 0 4px rgba(100, 150, 255, 0.1)'
  }

  const knobOuterStyle: React.CSSProperties = {
    width: knobSize,
    height: knobSize,
    borderRadius: '50%',
    background: 'conic-gradient(from 225deg, #3366FF, #9900FF, #3366FF)',
    position: 'relative',
    boxShadow: '0 4px 12px rgba(51, 102, 255, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'box-shadow 0.2s ease'
  }

  const knobInnerStyle: React.CSSProperties = {
    width: knobSize - 10,
    height: knobSize - 10,
    borderRadius: '50%',
    background: 'rgba(10, 10, 30, 0.95)',
    position: 'relative',
    transform: `rotate(${knobRotation}deg)`,
    transition: 'transform 0.1s ease-out',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center'
  }

  const knobIndicatorStyle: React.CSSProperties = {
    width: 2,
    height: (knobSize - 10) / 2 - 2,
    background: 'linear-gradient(to top, #6699ff, #ffffff)',
    marginTop: 2,
    borderRadius: 1,
    boxShadow: '0 0 4px rgba(102, 153, 255, 0.8)'
  }

  const knobInputStyle: React.CSSProperties = {
    position: 'absolute',
    width: knobSize,
    height: knobSize,
    borderRadius: '50%',
    opacity: 0,
    cursor: 'pointer',
    zIndex: 2
  }

  const resetButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 16px',
    borderRadius: 20,
    border: 'none',
    background: 'linear-gradient(135deg, #1a2a5a, #2a1a5a)',
    color: '#c0d0ff',
    fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif",
    fontSize: fontSize * 0.95,
    fontWeight: 500,
    cursor: 'pointer',
    transform: resetPressed ? 'scale(1.1)' : 'scale(1)',
    transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 2px 8px rgba(51, 102, 255, 0.2), 0 0 4px rgba(100, 150, 255, 0.15)',
    letterSpacing: '0.03em',
    outline: 'none'
  }

  const evolveIndicatorStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
    padding: '4px 8px',
    borderRadius: 12,
    background: isAutoEvolving ? 'rgba(102, 204, 255, 0.1)' : 'transparent',
    transition: 'all 0.3s ease'
  }

  const pulseDotStyle: React.CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: isAutoEvolving ? '#66ccff' : 'transparent',
    boxShadow: isAutoEvolving
      ? '0 0 8px rgba(102, 204, 255, 0.8), 0 0 16px rgba(102, 204, 255, 0.4)'
      : 'none',
    animation: isAutoEvolving ? 'pulse 1.5s ease-in-out infinite' : 'none'
  }

  const evolveLabelStyle: React.CSSProperties = {
    fontSize: fontSize * 0.85,
    color: isAutoEvolving ? '#66ccff' : 'rgba(150, 180, 255, 0.3)',
    fontWeight: 500,
    transition: 'color 0.3s ease'
  }

  const handleKnobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAngle = parseFloat(e.target.value)
    setKnobAngle(newAngle)
    const t = (parseFloat(e.target.value) + 135) / 270
    const clamped = Math.max(0, Math.min(1, t))
    const value = 0.1 + clamped * 1.9
    onFlowRateChange(parseFloat(value.toFixed(2)))
  }

  const handleResetMouseDown = () => setResetPressed(true)
  const handleResetMouseUp = () => setResetPressed(false)

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        input[type="range"]:hover + div {
          width: 19.2px !important;
          height: 19.2px !important;
          box-shadow: 0 0 16px rgba(102, 204, 255, 0.7), 0 4px 12px rgba(51, 102, 255, 0.5) !important;
        }
      `}</style>
      <div
        style={containerStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={evolveIndicatorStyle}>
          <span style={pulseDotStyle} />
          <span style={evolveLabelStyle}>
            {isAutoEvolving ? '自动演化中' : '等待创作...'}
          </span>
        </div>

        <div style={labelStyle}>
          <span>磁场强度</span>
          <span style={valueStyle}>{magnetStrength.toFixed(1)}</span>
        </div>
        <div style={sliderContainerStyle}>
          <div style={trackStyle} />
          <div style={fillStyle} />
          <input
            type="range"
            min={0.5}
            max={5.0}
            step={0.1}
            value={magnetStrength}
            onChange={(e) => onMagnetStrengthChange(parseFloat(e.target.value))}
            style={inputStyle}
          />
          <div style={thumbStyle} />
        </div>

        <div style={labelStyle}>
          <span>粒子流量</span>
          <span style={valueStyle}>{flowRate.toFixed(2)}</span>
        </div>
        <div style={knobContainerStyle}>
          <div style={{ position: 'relative' }}>
            <div style={knobOuterStyle}>
              <div style={knobInnerStyle}>
                <div style={knobIndicatorStyle} />
              </div>
            </div>
            <input
              type="range"
              min={-135}
              max={135}
              step={1}
              value={knobRotation}
              onChange={handleKnobChange}
              style={knobInputStyle}
            />
          </div>
        </div>

        <button
          style={resetButtonStyle}
          onMouseDown={handleResetMouseDown}
          onMouseUp={handleResetMouseUp}
          onMouseLeave={handleResetMouseUp}
          onClick={onReset}
        >
          重置雕塑
        </button>
      </div>
    </>
  )
}
