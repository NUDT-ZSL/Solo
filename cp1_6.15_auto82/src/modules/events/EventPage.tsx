import { useState, useEffect } from 'react'
import { dataStore, Event } from '../../logic/dataStore'
import EventCard from './EventCard'
import './EventPage.css'

export default function EventPage() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'ended'>('upcoming')
  const [events, setEvents] = useState<Event[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    maxParticipants: 20
  })
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    loadEvents()
  }, [activeTab])

  const loadEvents = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      setEvents(dataStore.getEvents(activeTab))
      setIsTransitioning(false)
    }, 300)
  }

  const handleTabChange = (tab: 'upcoming' | 'ended') => {
    if (tab === activeTab) return
    setActiveTab(tab)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'maxParticipants' ? parseInt(value) || 0 : value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.date || !formData.time || !formData.location) return

    dataStore.addEvent({
      title: formData.title,
      description: formData.description,
      date: formData.date,
      time: formData.time,
      location: formData.location,
      maxParticipants: formData.maxParticipants
    })

    setFormData({
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      maxParticipants: 20
    })
    setShowCreateForm(false)
    loadEvents()
  }

  const handleJoin = () => {
    loadEvents()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}年${date.getMonth() + 1}月`
  }

  const groupedEvents = events.reduce((groups, event) => {
    const monthKey = formatDate(event.date)
    if (!groups[monthKey]) {
      groups[monthKey] = []
    }
    groups[monthKey].push(event)
    return groups
  }, {} as Record<string, Event[]>)

  return (
    <div className="events-page">
      <div className="events-header">
        <h1 className="events-title">交换活动</h1>
        <button 
          className="create-event-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{ transition: 'all 0.2s ease' }}
        >
          {showCreateForm ? '取消' : '+ 创建活动'}
        </button>
      </div>

      {showCreateForm && (
        <div className="create-form-card" style={{ animation: 'fadeIn 0.3s ease' }}>
          <h3>创建新活动</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>活动标题</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="如：本周末公园多肉交换"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>日期</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>时间</label>
                <input
                  type="text"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  placeholder="如：10:00-12:00"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>地点</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="手动输入活动地点"
                  required
                />
              </div>
              <div className="form-group">
                <label>最多人数</label>
                <input
                  type="number"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleInputChange}
                  min="2"
                  max="500"
                />
              </div>
            </div>
            <div className="form-group">
              <label>活动描述</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="描述一下活动内容..."
                rows={3}
              />
            </div>
            <button type="submit" className="submit-btn">
              创建活动
            </button>
          </form>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => handleTabChange('upcoming')}
          style={{ transition: 'all 0.2s ease' }}
        >
          即将开始
        </button>
        <button
          className={`tab-btn ${activeTab === 'ended' ? 'active' : ''}`}
          onClick={() => handleTabChange('ended')}
          style={{ transition: 'all 0.2s ease' }}
        >
          已结束
        </button>
      </div>

      <div 
        className={`events-content ${isTransitioning ? 'fade-out' : 'fade-in'}`}
      >
        {Object.entries(groupedEvents).map(([month, monthEvents]) => (
          <div key={month} className="month-group">
            <h2 className="month-title">{month}</h2>
            <div className="timeline-container">
              {monthEvents.map(event => (
                <EventCard key={event.id} event={event} onJoin={handleJoin} />
              ))}
            </div>
          </div>
        ))}

        {events.length === 0 && !isTransitioning && (
          <div className="empty-state">
            <p className="empty-icon">📅</p>
            <p>暂无{activeTab === 'upcoming' ? '即将开始的' : '已结束的'}活动</p>
          </div>
        )}
      </div>
    </div>
  )
}
