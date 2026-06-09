import React from 'react'

export interface ControlValues {
  brightness: number
  diffusion: number
  texture: number
}

interface ControlPanelProps {
  values: ControlValues
  onChange: (values: ControlValues) => void
  onClear: () => void
  onSave: () => void
  isMobile: boolean
}

const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

const WindIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
  </svg>
)

const SparkleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    <path d="M19 14l.75 2.25L22 17l-2.25.75L19 20l-.75-2.25L16 17l2.25-.75L19 14z" />
    <path d="M5 15l.5 1.5L7 17l-1.5.5L5 19l-.5-1.5L3 17l1.5-.5L5 15z" />
  </svg>
)

const TrashIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </svg>
)

const SaveIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
)

interface SliderProps {
  icon: React.ReactNode
  label: string
  value: number
  min: number
  max: number
  step: number
  displayValue: string
  trackColorStart: string
  trackColorEnd: string
  accentColor: string
  onChange: (v: number) => void
}

const Slider: React.FC<SliderProps> = ({
  icon,
  value,
  min,
  max,
  step,
  displayValue,
  trackColorStart,
  trackColorEnd,
  accentColor,
  onChange,
}) => {
  const percentage = ((value - min) / (max - min)) * 100

  const sliderStyle: React.CSSProperties = {
    WebkitAppearance: 'none',
    appearance: 'none',
    width: '100%',
    height: '8px',
    borderRadius: '4px',
    background: `linear-gradient(to right, ${trackColorStart} 0%, ${trackColorEnd} ${percentage}%, #333333 ${percentage}%, #333333 100%)`,
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  }

  const thumbStyleWebkit = `
    .custom-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, #ffffff, ${accentColor});
      border: 2px solid ${accentColor};
      cursor: pointer;
      box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), 0 0 10px ${accentColor}88, 0 2px 6px rgba(0,0,0,0.4);
      transition: all 0.3s ease;
    }
    .custom-slider::-webkit-slider-thumb:hover {
      transform: scale(1.15);
      box-shadow: inset 0 2px 4px rgba(255,255,255,0.6), 0 0 16px ${accentColor}CC, 0 4px 10px rgba(0,0,0,0.5);
    }
    .custom-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, #ffffff, ${accentColor});
      border: 2px solid ${accentColor};
      cursor: pointer;
      box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), 0 0 10px ${accentColor}88;
      transition: all 0.3s ease;
    }
  `

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '12px 16px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.06)',
      transition: 'all 0.3s ease',
      minWidth: '240px',
      flex: '1 1 0',
    }}>
      <style>{thumbStyleWebkit}</style>
      <div style={{
        color: accentColor,
        display: 'flex',
        alignItems: 'center',
        filter: `drop-shadow(0 0 6px ${accentColor}66)`,
        transition: 'all 0.3s ease',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <input
          type="range"
          className="custom-slider"
          min={min}
          max={max}
          step={step}
          value={value}
          style={sliderStyle}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </div>
      <div style={{
        color: accentColor,
        fontWeight: 600,
        fontSize: '14px',
        minWidth: '44px',
        textAlign: 'right',
        fontFamily: 'monospace',
        textShadow: `0 0 8px ${accentColor}66`,
        transition: 'all 0.3s ease',
      }}>
        {displayValue}
      </div>
    </div>
  )
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  values,
  onChange,
  onClear,
  onSave,
  isMobile,
}) => {
  const buttonGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'

  const circleButtonBase: React.CSSProperties = {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: buttonGradient,
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'visible',
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '28px',
      width: '100%',
      maxWidth: isMobile ? '440px' : '820px',
      margin: '0 auto',
      transition: 'all 0.3s ease',
    }}>
      <div style={{
        display: 'flex',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        gap: '16px',
        width: '100%',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
      }}>
        <Slider
          icon={<SunIcon />}
          label="亮度"
          value={values.brightness}
          min={0.5}
          max={2.0}
          step={0.1}
          displayValue={values.brightness.toFixed(1)}
          trackColorStart="#FFD700"
          trackColorEnd="#FFA500"
          accentColor="#FFD700"
          onChange={(v) => onChange({ ...values, brightness: v })}
        />
        <Slider
          icon={<WindIcon />}
          label="扩散速度"
          value={values.diffusion}
          min={1}
          max={10}
          step={1}
          displayValue={values.diffusion.toString()}
          trackColorStart="#3399FF"
          trackColorEnd="#00D4FF"
          accentColor="#3399FF"
          onChange={(v) => onChange({ ...values, diffusion: v })}
        />
        <Slider
          icon={<SparkleIcon />}
          label="纹理"
          value={values.texture}
          min={0}
          max={100}
          step={1}
          displayValue={values.texture.toString()}
          trackColorStart="#9933FF"
          trackColorEnd="#FF33CC"
          accentColor="#9933FF"
          onChange={(v) => onChange({ ...values, texture: v })}
        />
      </div>

      <div style={{
        display: 'flex',
        gap: '32px',
        alignItems: 'center',
      }}>
        <button
          onClick={onClear}
          style={circleButtonBase}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(1.2)'
            e.currentTarget.style.transform = 'scale(1.08)'
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(102, 126, 234, 0.6), inset 0 1px 0 rgba(255,255,255,0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(1)'
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
          }}
          aria-label="清空"
        >
          <TrashIcon />
        </button>
        <button
          onClick={onSave}
          style={circleButtonBase}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(1.2)'
            e.currentTarget.style.transform = 'scale(1.08)'
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(102, 126, 234, 0.6), inset 0 1px 0 rgba(255,255,255,0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(1)'
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
          }}
          aria-label="保存"
        >
          <SaveIcon />
        </button>
      </div>
    </div>
  )
}
