import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { ALERT_EMOJIS, ALERT_LEVEL_COLORS, ALERT_LEVEL_NAMES, ALERT_TYPE_NAMES, ALERT_GRADIENTS } from '../utils/constants'
import { useCountdown } from '../hooks/useCountdown'
import type { Alert } from '../types'
import './Modal.css'

interface AlertModalProps {
  alert: Alert
  onClose: () => void
  onLocate?: (alert: Alert) => void
}

export default function AlertModal({ alert, onClose, onLocate }: AlertModalProps) {
  const [isClosing, setIsClosing] = useState(false)
  const { timeLeft, isExpired } = useCountdown(alert.endTime)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(onClose, 400)
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className={`modal-content alert-modal ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
        onClick={e => e.stopPropagation()}
        style={{ background: ALERT_GRADIENTS[alert.level] }}
      >
        <div className="modal-level-bar" style={{ backgroundColor: ALERT_LEVEL_COLORS[alert.level] }} />
        <button className="modal-close" onClick={handleClose}>
          ×
        </button>
        
        <div className="alert-modal-header">
          <div className="alert-modal-emoji">{ALERT_EMOJIS[alert.type]}</div>
          <div className="alert-modal-title">
            <h2>{ALERT_TYPE_NAMES[alert.type]}预警</h2>
            <span className="alert-modal-level" style={{ color: ALERT_LEVEL_COLORS[alert.level] }}>
              {ALERT_LEVEL_NAMES[alert.level]}
            </span>
          </div>
        </div>

        <div className="alert-modal-region">
          📍 {alert.region}
        </div>

        <div className="alert-modal-countdown">
          <div className="countdown-label">剩余时间</div>
          <div className={`countdown-value ${isExpired ? 'expired' : ''}`}>
            {isExpired ? '已过期' : timeLeft}
          </div>
        </div>

        <div className="alert-modal-time">
          <div className="time-row">
            <span>发布时间：</span>
            <span>{dayjs(alert.startTime).format('YYYY-MM-DD HH:mm')}</span>
          </div>
          <div className="time-row">
            <span>结束时间：</span>
            <span>{dayjs(alert.endTime).format('YYYY-MM-DD HH:mm')}</span>
          </div>
        </div>

        <div className="alert-modal-description">
          <h3>预警说明</h3>
          <p>{alert.description}</p>
        </div>

        <div className="alert-modal-measures">
          <h3>防御指南</h3>
          <ul>
            {alert.measures.map((measure, index) => (
              <li key={index}>{measure}</li>
            ))}
          </ul>
        </div>

        <div className="alert-modal-actions">
          {onLocate && (
            <button className="btn btn-primary" onClick={() => onLocate(alert)}>
              📍 在地图上查看
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
