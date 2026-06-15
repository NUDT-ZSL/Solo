import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { eventsApi } from '../api'
import { Event, EventCategory, CATEGORY_LABELS, CATEGORY_COLORS } from '../types'
import { useToast } from '../contexts/ToastProvider'
import './Home.css'

const categories: Array<{ key: string; label: string; color: string; emoji: string }> = [
  { key: 'all', label: '全部', color: '#e2e8f0', emoji: '📋' },
  { key: 'academic', label: '学术', color: CATEGORY_COLORS.academic, emoji: '📚' },
  { key: 'club', label: '社团', color: CATEGORY_COLORS.club, emoji: '🎯' },
  { key: 'sports', label: '体育', color: CATEGORY_COLORS.sports, emoji: '⚽' },
  { key: 'art', label: '文艺', color: CATEGORY_COLORS.art, emoji: '🎨' },
  { key: 'volunteer', label: '志愿', color: CATEGORY_COLORS.volunteer, emoji: '🤝' }
]

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

export default function Home() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [fadeKey, setFadeKey] = useState(0)

  const loadEvents = useCallback(async (category?: string) => {
    setLoading(true)
    try {
      const cat = category === 'all' ? undefined : category
      const data = await eventsApi.getEvents(cat)
      setEvents(data)
      setFadeKey(prev => prev + 1)
    } catch (error) {
      showToast('加载活动列表失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadEvents(selectedCategory)
  }, [selectedCategory, loadEvents])

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
  }

  const handleCardClick = (eventId: string) => {
    navigate(`/event/${eventId}`)
  }

  const handleRegisterClick = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation()
    if (event.registeredCount >= event.capacity) {
      showToast('该活动名额已满', 'info')
      return
    }
    navigate(`/event/${event._id}`)
  }

  return (
    <div className="home">
      <div className="home-header">
        <h1 className="home-title">校园活动大厅</h1>
        <p className="home-subtitle">发现精彩活动，开启校园新生活</p>
      </div>

      <div className="category-filters">
        {categories.map(cat => (
          <button
            key={cat.key}
            className={`category-btn ${selectedCategory === cat.key ? 'active' : ''}`}
            style={{
              '--cat-color': cat.color,
              borderColor: selectedCategory === cat.key ? '#3b82f6' : 'transparent'
            } as React.CSSProperties}
            onClick={() => handleCategoryChange(cat.key)}
          >
            <span className="category-emoji">{cat.emoji}</span>
            <span className="category-label">{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="events-list-wrapper" key={fadeKey}>
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>加载中...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>暂无活动</h3>
            <p>该分类下暂无活动，请稍后再来查看</p>
          </div>
        ) : (
          <div className="events-grid">
            {events.map(event => {
              const isFull = event.registeredCount >= event.capacity
              const categoryColor = CATEGORY_COLORS[event.category as EventCategory]
              const registerProgress = Math.min(
                (event.registeredCount / event.capacity) * 100,
                100
              )

              return (
                <div
                  key={event._id}
                  className="event-card"
                  onClick={() => handleCardClick(event._id!)}
                >
                  <div
                    className="event-cover"
                    style={{ background: `linear-gradient(135deg, ${categoryColor} 0%, #fff 100%)` }}
                  >
                    <span className="event-cover-emoji">
                      {categories.find(c => c.key === event.category)?.emoji || '📅'}
                    </span>
                    <span
                      className="event-category-badge"
                      style={{ background: categoryColor }}
                    >
                      {CATEGORY_LABELS[event.category as EventCategory]}
                    </span>
                  </div>

                  <div className="event-card-body">
                    <h3 className="event-card-title">{event.title}</h3>

                    <div className="event-card-info">
                      <div className="info-item">
                        <span className="info-icon">📅</span>
                        <span className="info-text">{formatDate(event.date)}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-icon">📍</span>
                        <span className="info-text">{event.location}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-icon">🏢</span>
                        <span className="info-text">{event.organizer}</span>
                      </div>
                    </div>

                    <div className="event-progress-section">
                      <div className="event-count">
                        <span className="count-label">报名情况</span>
                        <span
                          className={`count-number ${isFull ? 'full' : ''}`}
                        >
                          {event.registeredCount}/{event.capacity}
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className={`progress-fill ${isFull ? 'full' : ''}`}
                          style={{ width: `${registerProgress}%` }}
                        ></div>
                      </div>
                    </div>

                    <button
                      className={`register-btn ${isFull ? 'disabled' : ''}`}
                      disabled={isFull}
                      onClick={(e) => handleRegisterClick(e, event)}
                    >
                      {isFull ? '名额已满' : '立即报名'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
