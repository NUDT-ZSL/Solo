import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { WeatherParams, PresetConfig } from '../types'
import { PRESETS } from '../types'

interface ControlPanelProps {
  params: WeatherParams
  onChange: (params: Partial<WeatherParams>) => void
  onPresetSelect: (preset: PresetConfig) => void
  onSave: () => void
  isSaving: boolean
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (value: number) => void
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

const sliderStyleInjected = { current: false }

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, unit, onChange }) => {
  const [localValue, setLocalValue] = useState(value)
  const debouncedValue = useDebounce(localValue, 30)
  const isDraggingRef = useRef(false)

  useEffect(() => {
    if (!sliderStyleInjected.current) {
      sliderStyleInjected.current = true
      const styleEl = document.createElement('style')
      styleEl.setAttribute('data-slider-styles', 'true')
      styleEl.textContent = `
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          accent-color: #3A7BD5;
        }
        input[type="range"]:focus {
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid #3A7BD5;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(58, 123, 213, 0.4);
          margin-top: -6px;
          transition: border-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          border-color: #F39C12;
          box-shadow: 0 3px 12px rgba(243, 156, 18, 0.5);
        }
        input[type="range"]::-webkit-slider-thumb:active {
          transform: scale(0.95);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid #3A7BD5;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(58, 123, 213, 0.4);
          transition: border-color 0.2s ease, transform 0.15s ease;
        }
        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.1);
          border-color: #F39C12;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          -webkit-appearance: none;
          height: 8px;
          border-radius: 4px;
          background: transparent;
        }
        input[type="range"]::-moz-range-track {
          height: 8px;
          border-radius: 4px;
          background: transparent;
        }
      `
      document.head.appendChild(styleEl)
    }
  }, [])

  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalValue(value)
    }
  }, [value])

  useEffect(() => {
    if (isDraggingRef.current) {
      onChange(debouncedValue)
    }
  }, [debouncedValue, onChange])

  const percentage = ((localValue - min) / (max - min)) * 100

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    isDraggingRef.current = true
    const val = parseFloat(e.target.value)
    setLocalValue(val)
  }

  const handleMouseUp = (): void => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      onChange(localValue)
    }
  }

  return (
    <div style={styles.sliderContainer}>
      <div style={styles.sliderLabel}>
        <span>{label}</span>
        <span style={styles.sliderValue}>
          {value.toFixed(step < 1 ? 1 : 0)}{unit}
        </span>
      </div>
      <div
        style={styles.sliderTrackContainer}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchEnd={handleMouseUp}
      >
        <div
          style={{
            ...styles.sliderTrack,
          }}
        />
        <div
          style={{
            ...styles.sliderFill,
            width: `${percentage}%`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue}
          onChange={handleChange}
          style={styles.sliderInput}
        />
      </div>
    </div>
  )
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  onChange,
  onPresetSelect,
  onSave,
  isSaving,
}) => {
  return (
    <div style={styles.panel}>
      <div style={styles.content}>
        <div style={styles.slidersSection}>
          <Slider
            label="温度"
            value={params.temperature}
            min={-10}
            max={40}
            step={1}
            unit="°C"
            onChange={useCallback((v) => onChange({ temperature: v }), [onChange])}
          />
          <Slider
            label="湿度"
            value={params.humidity}
            min={0}
            max={100}
            step={1}
            unit="%"
            onChange={useCallback((v) => onChange({ humidity: v }), [onChange])}
          />
          <Slider
            label="风速"
            value={params.windSpeed}
            min={0}
            max={20}
            step={1}
            unit="级"
            onChange={useCallback((v) => onChange({ windSpeed: v }), [onChange])}
          />
          <Slider
            label="光照"
            value={params.lightLevel}
            min={0}
            max={100}
            step={1}
            unit="%"
            onChange={useCallback((v) => onChange({ lightLevel: v }), [onChange])}
          />
        </div>

        <div style={styles.presetsSection}>
          <div style={styles.sectionTitle}>预设模式</div>
          <div style={styles.presetsGrid}>
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => onPresetSelect(preset)}
                style={{
                  ...styles.presetButton,
                  ...(params.preset === preset.name ? styles.presetButtonActive : {}),
                }}
              >
                <span style={styles.presetIcon}>{preset.icon}</span>
                <span style={styles.presetLabel}>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={styles.actionsSection}>
          <button
            onClick={onSave}
            disabled={isSaving}
            style={{
              ...styles.saveButton,
              ...(isSaving ? styles.saveButtonDisabled : {}),
            }}
          >
            {isSaving ? '保存中...' : '💾 保存创作'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    background: 'rgba(30, 30, 30, 0.75)',
    backdropFilter: 'blur(15px)',
    WebkitBackdropFilter: 'blur(15px)',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#E0E0E0',
    maxHeight: '45vh',
    overflowY: 'auto',
  },
  content: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px 24px 24px',
    display: 'flex',
    gap: '32px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  slidersSection: {
    flex: '1 1 400px',
    minWidth: '280px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  presetsSection: {
    flex: '0 0 auto',
    minWidth: '280px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '12px',
    color: '#9E9E9E',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  sliderContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sliderLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
  },
  sliderValue: {
    fontWeight: 600,
    color: '#64B5F6',
    fontFamily: 'monospace',
    fontSize: '14px',
  },
  sliderTrackContainer: {
    position: 'relative',
    height: '8px',
    borderRadius: '4px',
    overflow: 'visible',
    touchAction: 'none',
  },
  sliderTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: '4px',
    background: 'linear-gradient(90deg, #3A7BD5 0%, #F39C12 100%)',
    opacity: 0.25,
  },
  sliderFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: '4px',
    background: 'linear-gradient(90deg, #3A7BD5 0%, #F39C12 100%)',
    pointerEvents: 'none',
  },
  sliderInput: {
    position: 'absolute',
    top: '-6px',
    left: 0,
    width: '100%',
    height: '20px',
    margin: 0,
    opacity: 0,
    cursor: 'pointer',
    padding: 0,
  },
  presetsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  presetButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '14px 12px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: '#E0E0E0',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '64px',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  presetButtonActive: {
    background: 'rgba(100, 181, 246, 0.15)',
    borderColor: 'rgba(100, 181, 246, 0.5)',
    boxShadow: '0 0 20px rgba(100, 181, 246, 0.15)',
  },
  presetIcon: {
    fontSize: '22px',
    lineHeight: 1,
  },
  presetLabel: {
    fontSize: '12px',
    fontWeight: 500,
  },
  actionsSection: {
    flex: '0 0 auto',
    display: 'flex',
    alignItems: 'flex-end',
    minHeight: '140px',
  },
  saveButton: {
    padding: '14px 32px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #3A7BD5 0%, #64B5F6 100%)',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 20px rgba(58, 123, 213, 0.3)',
    fontFamily: 'inherit',
  },
  saveButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
}

export default ControlPanel

if (typeof window !== 'undefined') {
  const injectSliderStyles = (): void => {
    const styleId = 'weather-dreamweaver-slider-styles'
    if (document.getElementById(styleId)) return
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @media (max-width: 767px) {
        div[style*="content"] { flex-direction: column !important; gap: 20px !important; }
        div[style*="presetsGrid"] { grid-template-columns: repeat(2, 1fr) !important; }
        div[style*="actionsSection"] { width: 100% !important; min-height: auto !important; }
        button[style*="saveButton"] { width: 100% !important; }
      }
      @media (hover: hover) {
        button[style*="presetButton"]:hover { transform: scale(1.05) !important; background: rgba(100,181,246,0.1) !important; }
        button[style*="saveButton"]:hover:not([disabled]) { transform: scale(1.05) !important; }
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none !important;
        appearance: none !important;
        width: 18px !important;
        height: 18px !important;
        border-radius: 50% !important;
        background: #fff !important;
        cursor: pointer !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
        border: 2px solid #64B5F6 !important;
      }
      input[type="range"]::-moz-range-thumb {
        width: 18px !important;
        height: 18px !important;
        border-radius: 50% !important;
        background: #fff !important;
        cursor: pointer !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
        border: 2px solid #64B5F6 !important;
      }
      input[type="range"]::-webkit-slider-runnable-track {
        background: transparent !important;
      }
      input[type="range"]::-moz-range-track {
        background: transparent !important;
      }
    `
    document.head.appendChild(style)
  }
  injectSliderStyles()
}
