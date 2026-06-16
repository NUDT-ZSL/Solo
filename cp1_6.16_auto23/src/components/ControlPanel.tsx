import { useState, useCallback } from 'react'
import { Sun, CloudRain, Snowflake, CloudLightning, Gauge, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'
import useWeatherStore from '@/store/weatherStore'
import type { WeatherType } from '@/logic/weatherStateMachine'
import type { WeatherAlert } from '@/store/weatherStore'

const WEATHER_BUTTONS: { type: WeatherType; icon: React.ReactNode; label: string }[] = [
  { type: 'sunny', icon: <Sun size={18} />, label: '晴天' },
  { type: 'rainy', icon: <CloudRain size={18} />, label: '雨天' },
  { type: 'snowy', icon: <Snowflake size={18} />, label: '雪天' },
  { type: 'thunder', icon: <CloudLightning size={18} />, label: '雷暴' },
]

const SPEED_OPTIONS = [
  { value: 0, label: '0x' },
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 4, label: '4x' },
]

const ALERT_MESSAGES = [
  { message: '暴雪红色预警', level: 'red' as const },
  { message: '暴雨橙色警告', level: 'orange' as const },
  { message: '大风黄色预警', level: 'yellow' as const },
  { message: '雷电橙色预警', level: 'orange' as const },
  { message: '寒潮蓝色预警', level: 'blue' as const },
]

export default function ControlPanel() {
  const weatherState = useWeatherStore((s) => s.weatherState)
  const setWeather = useWeatherStore((s) => s.setWeather)
  const setLocked = useWeatherStore((s) => s.setLocked)
  const setTimeSpeed = useWeatherStore((s) => s.setTimeSpeed)
  const addAlert = useWeatherStore((s) => s.addAlert)
  const isMobile = useWeatherStore((s) => s.isMobile)

  const [expanded, setExpanded] = useState(!isMobile)
  const [activePress, setActivePress] = useState<string | null>(null)

  const handleWeatherSwitch = useCallback((type: WeatherType) => {
    setActivePress(type)
    setWeather(type)
    setLocked(true)
    setTimeout(() => setActivePress(null), 100)
  }, [setWeather, setLocked])

  const handleSpeedChange = useCallback((speed: number) => {
    setActivePress(`speed-${speed}`)
    setTimeSpeed(speed)
    setTimeout(() => setActivePress(null), 100)
  }, [setTimeSpeed])

  const handleTriggerAlert = useCallback(() => {
    const alertDef = ALERT_MESSAGES[Math.floor(Math.random() * ALERT_MESSAGES.length)]
    const alert: WeatherAlert = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: alertDef.level,
      level: alertDef.level,
      message: alertDef.message,
      timestamp: Date.now(),
    }
    addAlert(alert)
  }, [addAlert])

  const handleUnlock = useCallback(() => {
    setLocked(false)
  }, [setLocked])

  const btnBase: React.CSSProperties = {
    background: 'linear-gradient(135deg, #6A5ACD, #7B68EE)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'Rajdhani, sans-serif',
    fontWeight: 600,
    transition: 'transform 0.1s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  }

  if (isMobile && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          position: 'fixed',
          bottom: '56px',
          right: '16px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6A5ACD, #7B68EE)',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(106,90,205,0.5)',
          zIndex: 60,
          fontSize: '20px',
        }}
      >
        <Gauge size={22} />
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: isMobile ? '56px' : '20px',
      right: '20px',
      background: 'rgba(42,42,62,0.9)',
      borderRadius: '12px',
      padding: isMobile ? '12px' : '16px',
      zIndex: 60,
      minWidth: isMobile ? '220px' : '240px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      {isMobile && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button
            onClick={() => setExpanded(false)}
            style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '14px' }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase', letterSpacing: '1px' }}>
          天气切换
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {WEATHER_BUTTONS.map(({ type, icon, label }) => (
            <button
              key={type}
              onClick={() => handleWeatherSwitch(type)}
              style={{
                ...btnBase,
                padding: '8px 6px',
                fontSize: '12px',
                transform: activePress === type ? 'scale(0.95)' : 'scale(1)',
                outline: weatherState.current === type ? '2px solid #9B8FFF' : 'none',
                outlineOffset: '1px',
              }}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {weatherState.locked && (
        <button
          onClick={handleUnlock}
          style={{
            ...btnBase,
            width: '100%',
            padding: '6px',
            fontSize: '11px',
            marginBottom: '12px',
            background: 'linear-gradient(135deg, #CD5A5A, #EE6868)',
          }}
        >
          🔓 解锁自动流转
        </button>
      )}

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase', letterSpacing: '1px' }}>
          时间流速
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {SPEED_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleSpeedChange(value)}
              style={{
                ...btnBase,
                flex: 1,
                padding: '6px 2px',
                fontSize: '12px',
                transform: activePress === `speed-${value}` ? 'scale(0.95)' : 'scale(1)',
                background: weatherState.timeSpeed === value
                  ? 'linear-gradient(135deg, #6A5ACD, #7B68EE)'
                  : 'rgba(106,90,205,0.3)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleTriggerAlert}
        style={{
          ...btnBase,
          width: '100%',
          padding: '8px',
          fontSize: '12px',
          background: 'linear-gradient(135deg, #CD6A2A, #EE8844)',
          transform: activePress === 'alert' ? 'scale(0.95)' : 'scale(1)',
        }}
      >
        <AlertTriangle size={14} />
        触发预警
      </button>
    </div>
  )
}
