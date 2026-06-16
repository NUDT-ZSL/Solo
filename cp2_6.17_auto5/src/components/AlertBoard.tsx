import { useState, useEffect } from 'react'
import { useAlerts } from '../hooks/useAlerts'
import { useCountdown } from '../hooks/useCountdown'
import { ALERT_EMOJIS, ALERT_LEVEL_COLORS, ALERT_GRADIENTS } from '../utils/constants'
import type { Alert } from '../types'
import AlertModal from './AlertModal'
import './AlertBoard.css'

interface AlertCardProps {
  alert: Alert
  onExpire: (id: string) => void
  onClick: (alert: Alert) => void
}

function AlertCard({ alert, onExpire, onClick }: AlertCardProps) {
  const { timeLeft, isExpired } = useCountdown(alert.endTime)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    if (isExpired) {
      setIsRemoving(true)
      const timer = setTimeout(() => onExpire(alert.id), 500)
      return () => clearTimeout(timer)
    }
  }, [isExpired, alert.id, onExpire])

  return (
    <div
      className={`alert-card ${isRemoving ? 'animate-fade-out' : ''}`}
      style={{ background: ALERT_GRADIENTS[alert.level] }}
      onClick={() => onClick(alert)}
    >
      <div
        className="alert-level-bar"
        style={{ backgroundColor: ALERT_LEVEL_COLORS[alert.level] }}
      />
      <div className="alert-emoji">{ALERT_EMOJIS[alert.type]}</div>
      <div className="alert-region">{alert.region}</div>
      <div className="alert-countdown">{timeLeft}</div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="alert-card skeleton-card">
      <div className="skeleton skeleton-level-bar" />
      <div className="skeleton skeleton-emoji" />
      <div className="skeleton skeleton-region" />
      <div className="skeleton skeleton-countdown" />
    </div>
  )
}

interface AlertBoardProps {
  onSelectMapLocation?: (lat: number, lng: number) => void
}

export default function AlertBoard({ onSelectMapLocation }: AlertBoardProps) {
  const { alerts, showSkeleton, refetch } = useAlerts()
  const [visibleAlerts, setVisibleAlerts] = useState<Alert[]>([])
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)

  useEffect(() => {
    setVisibleAlerts(alerts)
  }, [alerts])

  const handleExpire = (id: string) => {
    setVisibleAlerts(prev => prev.filter(a => a.id !== id))
  }

  const handleCardClick = (alert: Alert) => {
    setSelectedAlert(alert)
  }

  const handleLocateOnMap = (alert: Alert) => {
    if (onSelectMapLocation) {
      onSelectMapLocation(39.9042, 116.4074)
    }
    setSelectedAlert(null)
  }

  return (
    <div className="alert-board">
      <div className="alert-grid">
        {showSkeleton && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}
        {!showSkeleton && visibleAlerts.map(alert => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onExpire={handleExpire}
            onClick={handleCardClick}
          />
        ))}
      </div>
      {selectedAlert && (
        <AlertModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onLocate={handleLocateOnMap}
        />
      )}
    </div>
  )
}
