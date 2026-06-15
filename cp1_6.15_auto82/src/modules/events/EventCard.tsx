import { useState } from 'react'
import { Event, dataStore } from '../../logic/dataStore'
import './EventCard.css'

interface EventCardProps {
  event: Event
  onJoin?: () => void
}

export default function EventCard({ event, onJoin }: EventCardProps) {
  const [showParticipants, setShowParticipants] = useState(false)
  const [newParticipants, setNewParticipants] = useState<string[]>([])
  const [isJoining, setIsJoining] = useState(false)

  const currentUser = dataStore.getCurrentUser()
  const isParticipant = event.participants.includes(currentUser.id)
  const isFull = event.participants.length >= event.maxParticipants
  const isOngoing = event.status === 'ongoing'

  const handleJoin = () => {
    if (isParticipant || isFull || isJoining) return

    setIsJoining(true)
    const success = dataStore.joinEvent(event.id)
    
    if (success) {
      setNewParticipants(prev => [...prev, currentUser.name])
      setTimeout(() => {
        setIsJoining(false)
        setShowParticipants(true)
        if (onJoin) onJoin()
      }, 200)
    } else {
      setIsJoining(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const weekday = weekdays[date.getDay()]
    return { month, day, weekday }
  }

  const getAverageRating = () => {
    if (event.ratings.length === 0) return 0
    return event.ratings.reduce((a, b) => a + b, 0) / event.ratings.length
  }

  const { month, day, weekday } = formatDate(event.date)

  return (
    <div className={`timeline-item ${isOngoing ? 'ongoing' : ''}`}>
      <div className="timeline-dot">
        <div className="diamond-marker"></div>
      </div>
      
      <div className="timeline-date">
        <div className="date-month">{month}月</div>
        <div className="date-day">{day}</div>
        <div className="date-weekday">{weekday}</div>
      </div>

      <div className={`event-card ${isOngoing ? 'breathing' : ''}`}>
        <div className="event-card-header">
          <h3 className="event-title">{event.title}</h3>
          <span className={`event-status status-${event.status}`}>
            {event.status === 'upcoming' ? '即将开始' : event.status === 'ongoing' ? '进行中' : '已结束'}
          </span>
        </div>

        <div className="event-meta">
          <div className="meta-item">
            <span className="meta-icon">⏰</span>
            <span>{event.time}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon">📍</span>
            <span>{event.location}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon">👥</span>
            <span>{event.participants.length}/{event.maxParticipants}人</span>
          </div>
        </div>

        <p className="event-description">{event.description}</p>

        {event.status === 'ended' && event.ratings.length > 0 && (
          <div className="event-rating">
            <span className="rating-stars">
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} className={`star ${star <= Math.round(getAverageRating()) ? 'filled' : ''}`}>
                  ★
                </span>
              ))}
            </span>
            <span className="rating-text">
              {getAverageRating().toFixed(1)} ({event.ratings.length}条评价)
            </span>
          </div>
        )}

        <div className="event-card-footer">
          <span className="event-creator">发起人：{event.creatorName}</span>
          
          {event.status !== 'ended' && (
            <button
              className={`join-btn ${isParticipant ? 'joined' : ''} ${isFull ? 'full' : ''}`}
              onClick={handleJoin}
              disabled={isFull || isJoining}
              style={{ transition: 'all 0.2s ease' }}
            >
              {isParticipant ? '已加入' : isFull ? '已满员' : '加入活动'}
            </button>
          )}
        </div>

        {(showParticipants || event.participants.length > 0) && (
          <div className="participants-section">
            <div className="participants-label">
              参与者 ({event.participants.length})
            </div>
            <div className="participants-avatars">
              {event.participantNames.map((name, index) => (
                <div
                  key={index}
                  className={`participant-avatar ${newParticipants.includes(name) ? 'slide-in' : ''}`}
                  style={{
                    animation: newParticipants.includes(name) ? 'slideInRight 0.2s ease forwards' : 'none',
                    marginLeft: index > 0 ? '-8px' : '0',
                    zIndex: event.participantNames.length - index
                  }}
                  title={name}
                >
                  {name.charAt(0)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
