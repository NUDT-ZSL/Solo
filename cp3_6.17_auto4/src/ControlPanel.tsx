import React from 'react'

interface ControlPanelProps {
  thrustStrength: number
  particleSize: number
  linkThreshold: number
  onThrustStrengthChange: (value: number) => void
  onParticleSizeChange: (value: number) => void
  onLinkThresholdChange: (value: number) => void
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  unit?: string
  formatValue?: (v: number) => string
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, onChange, unit = '', formatValue }) => {
  const percentage = ((value - min) / (max - min)) * 100
  const displayValue = formatValue ? formatValue(value) : value.toString()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    if (!isNaN(newValue)) {
      onChange(newValue)
    }
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 500,
            letterSpacing: '0.5px',
          }}
        >
          {label}
        </span>
        <span
          style={{
            color: '#fdd835',
            fontSize: '14px',
            fontFamily: 'monospace',
            fontWeight: 600,
          }}
        >
          {displayValue}
          {unit}
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          width: '160px',
          height: '14px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '160px',
            height: '4px',
            borderRadius: '2px',
            background: 'rgba(255,255,255,0.1)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: `${percentage}%`,
            height: '4px',
            borderRadius: '2px',
            background: '#fdd835',
            boxShadow: '0 0 8px rgba(253, 216, 53, 0.5)',
            transition: 'width 0.05s linear',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          style={{
            position: 'absolute',
            width: '160px',
            height: '14px',
            margin: 0,
            padding: 0,
            background: 'transparent',
            appearance: 'none',
            WebkitAppearance: 'none',
            cursor: 'pointer',
            outline: 'none',
          }}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #fdd835;
            cursor: pointer;
            border: none;
            box-shadow: 0 0 10px rgba(253, 216, 53, 0.8), 0 0 20px rgba(253, 216, 53, 0.4);
            transition: transform 0.1s ease, box-shadow 0.1s ease;
          }
          input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.15);
            box-shadow: 0 0 14px rgba(253, 216, 53, 1), 0 0 28px rgba(253, 216, 53, 0.6);
          }
          input[type="range"]::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #fdd835;
            cursor: pointer;
            border: none;
            box-shadow: 0 0 10px rgba(253, 216, 53, 0.8), 0 0 20px rgba(253, 216, 53, 0.4);
          }
          input[type="range"]::-webkit-slider-runnable-track {
            height: 4px;
            background: transparent;
            border: none;
          }
          input[type="range"]::-moz-range-track {
            height: 4px;
            background: transparent;
            border: none;
          }
          input[type="range"]:focus {
            outline: none;
          }
        `}</style>
      </div>
    </div>
  )
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  thrustStrength,
  particleSize,
  linkThreshold,
  onThrustStrengthChange,
  onParticleSizeChange,
  onLinkThresholdChange,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '24px',
        transform: 'translateY(-50%)',
        width: '220px',
        padding: '24px 20px',
        background: 'rgba(10, 10, 20, 0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        zIndex: 10,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#ffffff',
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          letterSpacing: '0.5px',
        }}
      >
        控制面板
      </div>

      <Slider
        label="推力强度"
        value={thrustStrength}
        min={0.5}
        max={3.0}
        step={0.1}
        onChange={onThrustStrengthChange}
        formatValue={(v) => v.toFixed(1)}
      />

      <Slider
        label="粒子大小"
        value={particleSize}
        min={1}
        max={6}
        step={1}
        onChange={onParticleSizeChange}
        unit="px"
      />

      <Slider
        label="连线阈值"
        value={linkThreshold}
        min={10}
        max={60}
        step={5}
        onChange={onLinkThresholdChange}
        unit="px"
      />

      <div
        style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.5)',
          lineHeight: '1.6',
        }}
      >
        按住鼠标左键拖拽
        <br />
        控制粒子流场扭曲
      </div>
    </div>
  )
}

export default ControlPanel
