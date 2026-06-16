import { useEffect, useState, useCallback } from 'react'
import useWeatherStore from '@/store/weatherStore'
import type { WeatherAlert } from '@/store/weatherStore'

const LEVEL_COLORS: Record<string, string> = {
  red: '#FF0000',
  orange: '#FF8C00',
  yellow: '#FFD700',
  blue: '#1E90FF',
}

const LEVEL_LABELS: Record<string, string> = {
  red: '红色',
  orange: '橙色',
  yellow: '黄色',
  blue: '蓝色',
}

interface AlertItemProps {
  alert: WeatherAlert
  onDismiss: (id: string) => void
}

function AlertItem({ alert, onDismiss }: AlertItemProps) {
  const [visible, setVisible] = useState(true)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss()
    }, 6000)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = useCallback(() => {
    setExiting(true)
    setTimeout(() => {
      setVisible(false)
      onDismiss(alert.id)
    }, 500)
  }, [alert.id, onDismiss])

  if (!visible) return null

  return (
    <div
      style={{
        background: `linear-gradient(90deg, #FF4500, ${LEVEL_COLORS[alert.level] ?? '#FF4500'})`,
        color: '#fff',
        padding: '10px 24px',
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '15px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        animation: exiting ? 'fadeOutUp 0.5s ease-in forwards' : 'fadeInUp 1.5s ease-out, slideRight 0.5s ease-out 1.5s',
        boxShadow: '0 2px 12px rgba(255,69,0,0.4)',
        position: 'relative',
      }}
    >
      <span style={{ fontSize: '16px' }}>⚠</span>
      <span>{alert.message}</span>
      <span style={{
        background: 'rgba(255,255,255,0.2)',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
      }}>
        {LEVEL_LABELS[alert.level] ?? alert.level}预警
      </span>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '16px',
          marginLeft: '8px',
          opacity: 0.7,
        }}
      >
        ✕
      </button>
    </div>
  )
}

export default function AlertBanner() {
  const alerts = useWeatherStore((s) => s.alerts)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const handleDismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set(prev).add(id))
  }, [])

  const activeAlerts = alerts.filter((a) => !dismissed.has(a.id))

  if (activeAlerts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {activeAlerts.slice(0, 3).map((alert) => (
        <AlertItem key={alert.id} alert={alert} onDismiss={handleDismiss} />
      ))}
    </div>
  )
}
