import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { eventsApi } from '../api'
import { Event, EventCategory, CATEGORY_LABELS, CATEGORY_COLORS, CreateEventRequest } from '../types'
import { useToast } from '../contexts/ToastProvider'
import './Admin.css'

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const categoryOptions: Array<{ value: EventCategory; label: string }> = [
  { value: 'academic', label: '学术' },
  { value: 'club', label: '社团' },
  { value: 'sports', label: '体育' },
  { value: 'art', label: '文艺' },
  { value: 'volunteer', label: '志愿' }
]

function CreateEventModal({
  isOpen,
  onClose,
  onCreated
}: {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [formData, setFormData] = useState<CreateEventRequest>({
    title: '',
    category: 'academic',
    date: '',
    location: '',
    capacity: 50,
    description: '',
    organizer: '校园活动中心'
  })
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'capacity' ? parseInt(value) || 0 : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      showToast('请输入活动标题', 'error')
      return
    }
    if (!formData.date) {
      showToast('请选择活动时间', 'error')
      return
    }
    if (!formData.location.trim()) {
      showToast('请输入活动地点', 'error')
      return
    }
    if (!formData.capacity || formData.capacity <= 0) {
      showToast('请输入有效的活动名额', 'error')
      return
    }

    setSubmitting(true)
    try {
      const submitData = {
        ...formData,
        date: new Date(formData.date).toISOString()
      }
      await eventsApi.createEvent(submitData)
      showToast('活动创建成功！', 'success')
      onCreated()
      onClose()
      setFormData({
        title: '',
        category: 'academic',
        date: '',
        location: '',
        capacity: 50,
        description: '',
        organizer: '校园活动中心'
      })
    } catch (error: any) {
      const message = error?.response?.data?.error || '创建活动失败'
      showToast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">创建新活动</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">活动标题 *</label>
              <input
                type="text"
                name="title"
                className="input"
                placeholder="请输入活动标题"
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">活动分类 *</label>
                <select
                  name="category"
                  className="select"
                  value={formData.category}
                  onChange={handleChange}
                >
                  {categoryOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group flex-1">
                <label className="form-label">总名额 *</label>
                <input
                  type="number"
                  name="capacity"
                  className="input"
                  min="1"
                  value={formData.capacity}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">活动时间 *</label>
                <input
                  type="datetime-local"
                  name="date"
                  className="input"
                  value={formData.date}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group flex-1">
                <label className="form-label">主办方</label>
                <input
                  type="text"
                  name="organizer"
                  className="input"
                  placeholder="主办方名称"
                  value={formData.organizer}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">活动地点 *</label>
              <input
                type="text"
                name="location"
                className="input"
                placeholder="请输入活动地点"
                value={formData.location}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">活动描述</label>
              <textarea
                name="description"
                className="textarea"
                placeholder="请输入活动详细描述..."
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn"
              disabled={submitting}
            >
              {submitting ? '创建中...' : '创建活动'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CheckinModal({
  isOpen,
  event,
  onClose,
  onSuccess
}: {
  isOpen: boolean
  event: Event | null
  onClose: () => void
  onSuccess: () => void
}) {
  const { showToast } = useToast()
  const [checkinCode, setCheckinCode] = useState('')
  const [checkingIn, setCheckingIn] = useState(false)
  const [scanAnimation, setScanAnimation] = useState(false)

  const handleCheckin = async () => {
    if (!event) return
    if (!checkinCode.trim() || checkinCode.length !== 6) {
      showToast('请输入6位签到码', 'error')
      return
    }

    setCheckingIn(true)
    setScanAnimation(true)
    try {
      await eventsApi.checkin(event._id!, checkinCode.trim())
      showToast('签到成功！', 'success')
      setCheckinCode('')
      onSuccess()
      setTimeout(onClose, 500)
    } catch (error: any) {
      const message = error?.response?.data?.error || '签到失败'
      showToast(message, 'error')
    } finally {
      setCheckingIn(false)
      setTimeout(() => setScanAnimation(false), 600)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      setCheckinCode('')
      setScanAnimation(false)
    }
  }, [isOpen])

  if (!isOpen || !event) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal checkin-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">活动签到</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="checkin-event-info">
            <p className="checkin-event-title">{event.title}</p>
            <p className="checkin-event-meta">📍 {event.location}</p>
          </div>

          <div className={`scan-placeholder ${scanAnimation ? 'scanning' : ''}`}>
            <div className="scan-frame">
              <div className="scan-corner tl"></div>
              <div className="scan-corner tr"></div>
              <div className="scan-corner bl"></div>
              <div className="scan-corner br"></div>
              <div className="scan-line"></div>
              <div className="scan-icon">📷</div>
              <p className="scan-text">扫描签到码</p>
            </div>
          </div>

          <div className="divider-section">
            <span className="divider-text">或手动输入签到码</span>
          </div>

          <div className="form-group">
            <label className="form-label">6位签到码</label>
            <input
              type="text"
              className="input checkin-input"
              placeholder="请输入6位签到码"
              maxLength={6}
              value={checkinCode}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                setCheckinCode(val)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && checkinCode.length === 6) {
                  handleCheckin()
                }
              }}
            />
          </div>

          <button
            className="btn btn-success btn-lg"
            style={{ width: '100%', marginTop: '12px' }}
            onClick={handleCheckin}
            disabled={checkingIn || checkinCode.length !== 6}
          >
            {checkingIn ? '验证中...' : '确认签到'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Admin() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [checkinEvent, setCheckinEvent] = useState<Event | null>(null)
  const [showCheckinModal, setShowCheckinModal] = useState(false)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const data = await eventsApi.getEvents()
      setEvents(data)
    } catch (error) {
      showToast('加载活动列表失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const totalEvents = events.length
  const totalRegistrations = events.reduce((sum, e) => sum + e.registeredCount, 0)
  const totalCapacity = events.reduce((sum, e) => sum + e.capacity, 0)

  return (
    <div className="admin">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">管理后台</h1>
          <p className="admin-subtitle">管理活动、处理签到、查看报名数据</p>
        </div>
        <button
          className="btn btn-lg"
          onClick={() => setShowCreateModal(true)}
        >
          <span>＋</span> 创建活动
        </button>
      </div>

      <div className="stats-cards">
        <div className="stat-card stat-blue">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <div className="stat-value">{totalEvents}</div>
            <div className="stat-label">活动总数</div>
          </div>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <div className="stat-value">{totalRegistrations}</div>
            <div className="stat-label">报名人数</div>
          </div>
        </div>
        <div className="stat-card stat-orange">
          <div className="stat-icon">🎟️</div>
          <div className="stat-info">
            <div className="stat-value">{totalCapacity}</div>
            <div className="stat-label">总名额数</div>
          </div>
        </div>
        <div className="stat-card stat-purple">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-value">
              {totalCapacity > 0 ? Math.round((totalRegistrations / totalCapacity) * 100) : 0}%
            </div>
            <div className="stat-label">报名率</div>
          </div>
        </div>
      </div>

      <div className="events-table-card">
        <div className="table-card-header">
          <h2 className="table-card-title">活动管理</h2>
          <span className="table-card-count">共 {totalEvents} 个活动</span>
        </div>

        {loading ? (
          <div className="table-loading-state">
            <div className="loading-spinner"></div>
            <p>加载中...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="table-empty-state">
            <div className="empty-emoji">🎉</div>
            <h3>暂无活动</h3>
            <p>点击上方"创建活动"按钮开始创建第一个活动</p>
          </div>
        ) : (
          <div className="admin-events-table">
            <div className="table-head">
              <div className="t-col t-col-title">活动信息</div>
              <div className="t-col t-col-category">分类</div>
              <div className="t-col t-col-date">时间</div>
              <div className="t-col t-col-count">报名</div>
              <div className="t-col t-col-actions">操作</div>
            </div>

            {events.map((event, idx) => {
              const categoryColor = CATEGORY_COLORS[event.category as EventCategory]
              const isFull = event.registeredCount >= event.capacity

              return (
                <div
                  key={event._id}
                  className={`table-body-row ${idx % 2 === 1 ? 'alt-row' : ''}`}
                >
                  <div className="t-col t-col-title">
                    <div
                      className="title-mini-cover"
                      style={{ background: categoryColor }}
                    >
                      {event.category === 'academic' ? '📚' : event.category === 'club' ? '🎯' : event.category === 'sports' ? '⚽' : event.category === 'art' ? '🎨' : '🤝'}
                    </div>
                    <div className="title-info">
                      <p
                        className="title-text"
                        onClick={() => navigate(`/event/${event._id}`)}
                      >
                        {event.title}
                      </p>
                      <p className="title-meta">📍 {event.location} · {event.organizer}</p>
                    </div>
                  </div>

                  <div className="t-col t-col-category">
                    <span
                      className="cat-badge"
                      style={{ background: categoryColor }}
                    >
                      {CATEGORY_LABELS[event.category as EventCategory]}
                    </span>
                  </div>

                  <div className="t-col t-col-date">
                    {formatDate(event.date)}
                  </div>

                  <div className="t-col t-col-count">
                    <span className={isFull ? 'count-full' : ''}>
                      {event.registeredCount}/{event.capacity}
                    </span>
                    <div className="mini-progress">
                      <div
                        className={`mini-fill ${isFull ? 'full' : ''}`}
                        style={{ width: `${Math.min((event.registeredCount / event.capacity) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="t-col t-col-actions">
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => {
                        setCheckinEvent(event)
                        setShowCheckinModal(true)
                      }}
                    >
                      ✓ 签到
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => navigate(`/event/${event._id}`)}
                    >
                      详情
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={loadEvents}
      />

      <CheckinModal
        isOpen={showCheckinModal}
        event={checkinEvent}
        onClose={() => setShowCheckinModal(false)}
        onSuccess={loadEvents}
      />
    </div>
  )
}
