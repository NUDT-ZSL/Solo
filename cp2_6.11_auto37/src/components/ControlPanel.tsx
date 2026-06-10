import React from 'react'
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

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, unit, onChange }) => {
  const percentage = ((value - min) / (max - min)) * 100

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange(parseFloat(e.target.value))
  }

  return (
    <div style={styles.sliderContainer}>
      <div style={styles.sliderLabel}>
        <span>{label}</span>
        <span style={styles.sliderValue}>
          {value.toFixed(step < 1 ? 1 : 0)}{unit}
        </span>
      </div>
      <div style={styles.sliderTrackContainer}>
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
          value={value}
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
            onChange={(v) => onChange({ temperature: v })}
          />
          <Slider
            label="湿度"
            value={params.humidity}
            min={0}
            max={100}
            step={1}
            unit="%"
            onChange={(v) => onChange({ humidity: v })}
          />
          <Slider
            label="风速"
            value={params.windSpeed}
            min={0}
            max={20}
            step={1}
            unit="级"
            onChange={(v) => onChange({ windSpeed: v })}
          />
          <Slider
            label="光照"
            value={params.lightLevel}
            min={0}
            max={100}
            step={1}
            unit="%"
            onChange={(v) => onChange({ lightLevel: v })}
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
    maxHeight: '40vh',
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
    background: 'rgba(255, 255, 255, 0.08)',
    overflow: 'visible',
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
  },
  presetButtonActive: {
    background: 'rgba(100, 181, 246, 0.15)',
    borderColor: 'rgba(100, 181, 246, 0.5)',
    boxShadow: '0 0 20px rgba(100, 181, 246, 0.15)',
  },
  presetIcon: {
    fontSize: '22px',
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
  },
  saveButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
}

export default ControlPanel

if (typeof window !== 'undefined' && window.matchMedia) {
  const mobileQuery = window.matchMedia('(max-width: 767px)')

  const updateResponsiveStyles = (): void => {
    if (mobileQuery.matches) {
      ;(styles.content as React.CSSProperties).flexDirection = 'column'
      ;(styles.content as React.CSSProperties).gap = '20px'
      ;(styles.presetsGrid as React.CSSProperties).gridTemplateColumns = 'repeat(2, 1fr)'
      ;(styles.actionsSection as React.CSSProperties).width = '100%'
      ;(styles.actionsSection as React.CSSProperties).minHeight = 'auto'
    }
  }
  updateResponsiveStyles()
  mobileQuery.addEventListener('change', updateResponsiveStyles)
}
