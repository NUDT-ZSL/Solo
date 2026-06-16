import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Download } from 'lucide-react'
import type { Event, Participant } from '../types'
import { getEvent, registerEvent, checkInEvent } from '../api/events'
import { useApp } from '../context/AppContext'
import { exportToCSV } from '../utils/csv'

interface EventDetailProps {
  getProgressColor: (current: number, max: number) => string
}

function EventDetail({ getProgressColor }: EventDetailProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, currentParticipantId, setCurrentParticipantId } = useApp()
  
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [showFullModal, setShowFullModal] = useState(false)
  const [registerPhone, setRegisterPhone] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (id) {
      loadEvent()
    }
  }, [id])

  const loadEvent = async () => {
    if (!id) return
    const result = await getEvent(id)
    if (result.data) {
      setEvent(result.data)
    }
    setLoading(false)
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const isToday = event?.date === todayStr
  
  const isRegistered = currentParticipantId && event?.participants.some(
    p => p.id === currentParticipantId
  )
  
  const participant = currentParticipantId ? 
    event?.participants.find(p => p.id === currentParticipantId) : null
  
  const isCheckedIn = participant?.checkedIn || false

  const registeredCount = event?.participants.length || 0
  const maxCount = event?.maxParticipants || 0
  const percentage = maxCount > 0 ? Math.round((registeredCount / maxCount) * 100) : 0
  const progressColor = getProgressColor(registeredCount, maxCount)
  const isFull = registeredCount >= maxCount

  const handleRegister = async () => {
    if (!user || !id || !event) return

    const phone = registerPhone.trim()
    if (!phone) {
      setErrorMessage('请输入联系电话')
      return
    }

    if (!/^1\d{10}$/.test(phone)) {
      setErrorMessage('请输入有效的11位手机号码')
      return
    }

    setIsRegistering(true)
    setErrorMessage('')

    const result = await registerEvent(id, {
      name: user.name,
      phone
    })

    if (result.error) {
      setErrorMessage(result.error)
    } else if (result.data) {
      setCurrentParticipantId(result.data.id)
      localStorage.setItem('bookevents_participantId', result.data.id)
      loadEvent()
    }

    setIsRegistering(false)
    setRegisterPhone('')
  }

  const handleCheckIn = async () => {
    if (!id || !currentParticipantId) return

    setIsCheckingIn(true)
    const result = await checkInEvent(id, { participantId: currentParticipantId })
    
    if (result.error) {
      setErrorMessage(result.error)
    } else {
      loadEvent()
    }
    setIsCheckingIn(false)
  }

  const handleExportCSV = () => {
    if (!event) return
    exportToCSV(event)
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (!event) {
    return (
      <div className="error-page">
        <p>活动不存在</p>
        <button className="btn-primary" onClick={() => navigate('/')}>
          返回日历
        </button>
      </div>
    )
  }

  return (
    <div className="event-detail-page">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← 返回日历
      </button>

      <div className="event-detail-card">
        <div className="event-detail-header">
          <h1 className="event-detail-title">{event.title}</h1>
          <div className="event-detail-meta">
            <span className="event-detail-date">📅 {event.date}</span>
            {isToday && <span className="event-today-badge">今天</span>}
          </div>
        </div>

        <div className="event-detail-progress">
          <div className="event-detail-progress-info">
            <span>报名进度</span>
            <span className="event-detail-progress-count">
              {registeredCount} / {maxCount} 人
            </span>
          </div>
          <div className="event-detail-progress-bar">
            <div
              className="event-detail-progress-fill"
              style={{
                width: `${Math.min(percentage, 100)}%`,
                backgroundColor: progressColor,
                transition: 'width 0.5s ease-out'
              }}
            />
          </div>
          <span className="event-detail-progress-percent" style={{ color: progressColor }}>
            {percentage}%
          </span>
        </div>

        <div className="event-detail-description">
          <h3>活动介绍</h3>
          <p>{event.description}</p>
        </div>

        <div className="event-detail-actions">
          {!user ? (
            <button className="btn-disabled" disabled>
              请先登录后报名
            </button>
          ) : isRegistered ? (
            <button className="btn-registered" disabled>
              ✓ 已报名
            </button>
          ) : isFull ? (
            <button 
              className="btn-full" 
              onClick={() => setShowFullModal(true)}
            >
              报名已满
            </button>
          ) : (
            <div className="register-section">
              <input
                type="tel"
                placeholder="请输入联系电话"
                value={registerPhone}
                onChange={(e) => setRegisterPhone(e.target.value)}
                className="phone-input"
                maxLength={11}
              />
              <button
                className="btn-register"
                onClick={handleRegister}
                disabled={isRegistering}
              >
                {isRegistering ? '报名中...' : '立即报名'}
              </button>
            </div>
          )}

          {isToday && isRegistered && !isCheckedIn && (
            <button
              className="btn-checkin"
              onClick={handleCheckIn}
              disabled={isCheckingIn}
            >
              {isCheckingIn ? '签到中...' : '立即签到'}
            </button>
          )}

          {isToday && isRegistered && isCheckedIn && (
            <button className="btn-checked-in" disabled>
              ✓ 已签到
            </button>
          )}

          {user?.isAdmin && (
            <button className="btn-export" onClick={handleExportCSV}>
              <Download size={18} />
              导出CSV
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}
      </div>

      {showFullModal && (
        <div className="modal-overlay" onClick={() => setShowFullModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">⚠️ 报名已满</h2>
            <p className="modal-message">很抱歉，该活动报名人数已满</p>
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setShowFullModal(false)}>
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventDetail
