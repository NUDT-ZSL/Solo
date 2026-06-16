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

const MEASURES_MAP: Record<string, string[]> = {
  thunderstorm: [
    '关好门窗，远离阳台和窗户',
    '避免在大树、电线杆下避雨',
    '暂停户外活动，尽量留在室内',
    '注意防范雷电和短时强降水'
  ],
  typhoon: [
    '关好门窗，加固易被风吹动的搭建物',
    '停止高空、水上等户外作业',
    '储备食品、饮用水和应急物资',
    '避免前往海边、低洼等危险区域'
  ],
  rainstorm: [
    '避免前往低洼地区和地下空间',
    '注意防范城市内涝和山洪',
    '驾驶车辆注意安全，避开积水路段',
    '暂停户外作业，转移至安全地带'
  ],
  high_temperature: [
    '避免高温时段户外活动',
    '做好防暑降温措施，多补充水分',
    '关注老弱病幼人群健康状况',
    '注意用电安全，防范火灾风险'
  ],
  cold_wave: [
    '及时添衣保暖，注意防寒防冻',
    '关注老弱病幼人群健康状况',
    '做好农作物、牲畜防寒措施',
    '注意取暖安全，防范煤气中毒'
  ]
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

  const measures = MEASURES_MAP[alert.type] || []

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

        {measures.length > 0 && (
          <div className="alert-modal-measures">
            <h3>防御指南</h3>
            <ul>
              {measures.map((measure, index) => (
                <li key={index}>{measure}</li>
              ))}
            </ul>
          </div>
        )}

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
