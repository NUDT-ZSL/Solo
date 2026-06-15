import React from 'react'
import { AppSettings } from './App'

export interface MirageInfo {
  name: string
  luminosity: number
  stability: number
}

interface UIControlsProps {
  settings: AppSettings
  onSettingsChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  onReset: () => void
  mirageInfo: MirageInfo | null
  onCloseInfo: () => void
}

const glassStyle: React.CSSProperties = {
  background: 'rgba(60, 20, 80, 0.35)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(200, 160, 255, 0.25)',
  borderRadius: '16px',
  color: '#e8d8f8',
  fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '4px',
  appearance: 'none',
  WebkitAppearance: 'none',
  background: 'rgba(200, 160, 255, 0.2)',
  borderRadius: '2px',
  outline: 'none',
  cursor: 'pointer',
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
        <span>{label}</span>
        <span style={{ color: '#cca8ff' }}>{value.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={sliderStyle}
      />
    </div>
  )
}

export function UIControls({ settings, onSettingsChange, onReset, mirageInfo, onCloseInfo }: UIControlsProps) {
  return (
    <>
      <div
        style={{
          ...glassStyle,
          position: 'absolute',
          top: '50%',
          right: '20px',
          transform: 'translateY(-50%)',
          width: '220px',
          padding: '24px 20px',
          boxShadow: '0 8px 32px rgba(80, 20, 120, 0.3)',
        }}
      >
        <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', textAlign: 'center', letterSpacing: '2px', color: '#e0c0ff' }}>
          幻景控制
        </h3>

        <SliderControl
          label="云海流速"
          value={settings.cloudSpeed}
          min={0.1}
          max={3.0}
          step={0.1}
          onChange={v => onSettingsChange('cloudSpeed', v)}
        />

        <SliderControl
          label="建筑透明度"
          value={settings.buildingOpacity}
          min={0.1}
          max={1.0}
          step={0.05}
          onChange={v => onSettingsChange('buildingOpacity', v)}
        />

        <SliderControl
          label="粒子密度"
          value={settings.particleDensity}
          min={0.2}
          max={2.0}
          step={0.1}
          onChange={v => onSettingsChange('particleDensity', v)}
        />

        <button
          onClick={onReset}
          style={{
            width: '100%',
            padding: '10px',
            marginTop: '8px',
            background: 'rgba(160, 80, 220, 0.3)',
            border: '1px solid rgba(200, 160, 255, 0.3)',
            borderRadius: '10px',
            color: '#e0c0ff',
            fontSize: '13px',
            cursor: 'pointer',
            letterSpacing: '1px',
            transition: 'all 0.3s ease',
            fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(160, 80, 220, 0.5)'
            e.currentTarget.style.borderColor = 'rgba(200, 160, 255, 0.5)'
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'rgba(160, 80, 220, 0.3)'
            e.currentTarget.style.borderColor = 'rgba(200, 160, 255, 0.3)'
          }}
        >
          重置幻景
        </button>
      </div>

      {mirageInfo && (
        <div
          style={{
            ...glassStyle,
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '280px',
            padding: '28px 24px',
            boxShadow: '0 12px 48px rgba(80, 20, 120, 0.4)',
            animation: 'fadeIn 0.4s ease',
          }}
        >
          <button
            onClick={onCloseInfo}
            style={{
              position: 'absolute',
              top: '12px',
              right: '14px',
              background: 'none',
              border: 'none',
              color: '#a080c0',
              fontSize: '18px',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>

          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', textAlign: 'center', color: '#ffd0a0' }}>
            {mirageInfo.name}
          </h3>

          <div style={{ fontSize: '13px', lineHeight: '2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>幻光强度</span>
              <span style={{ color: '#cca8ff' }}>
                {'◆'.repeat(Math.round(mirageInfo.luminosity * 5))}
                {'◇'.repeat(5 - Math.round(mirageInfo.luminosity * 5))}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>稳定度</span>
              <span style={{ color: '#cca8ff' }}>
                {'◆'.repeat(Math.round(mirageInfo.stability * 5))}
                {'◇'.repeat(5 - Math.round(mirageInfo.stability * 5))}
              </span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #c080ff;
          border: 2px solid rgba(200, 160, 255, 0.5);
          cursor: pointer;
          box-shadow: 0 0 8px rgba(180, 120, 255, 0.5);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #c080ff;
          border: 2px solid rgba(200, 160, 255, 0.5);
          cursor: pointer;
          box-shadow: 0 0 8px rgba(180, 120, 255, 0.5);
        }
      `}</style>
    </>
  )
}
