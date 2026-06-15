import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { eventsApi, RegistrationsResponse } from '../api'
import { Event, Registration, CATEGORY_LABELS, CATEGORY_COLORS, EventCategory } from '../types'
import { useToast } from '../contexts/ToastProvider'
import './EventDetail.css'

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function formatDateTime(isoStr: string): string {
  return formatDate(isoStr)
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({ name: '', studentId: '', email: '' })
  const [registration, setRegistration] = useState<Registration | null>(null)
  const [qrCanvasRef, setQrCanvasRef] = useState<HTMLCanvasElement | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [loadingRegistrations, setLoadingRegistrations] = useState(false)

  const loadEvent = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await eventsApi.getEvent(id)
      setEvent(data)
    } catch (error) {
      showToast('加载活动详情失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, showToast])

  const loadRegistrations = useCallback(async (currentPage: number = 1) => {
    if (!id) return
    setLoadingRegistrations(true)
    try {
      const res: RegistrationsResponse = await eventsApi.getRegistrations(id, currentPage, 10)
      setRegistrations(res.data)
      setTotalPages(res.totalPages)
      setTotalCount(res.total)
      setPage(res.page)
    } catch (error) {
      console.error('加载报名列表失败:', error)
    } finally {
      setLoadingRegistrations(false)
    }
  }, [id])

  useEffect(() => {
    loadEvent()
    loadRegistrations(1)
  }, [loadEvent, loadRegistrations])

  const generateQRCode = useCallback(async (code: string, canvas: HTMLCanvasElement) => {
    try {
      await QRCode.toCanvas(canvas, code, {
        width: 160,
        margin: 2,
        color: {
          dark: '#1f2937',
          light: '#ffffff'
        }
      })
    } catch (err) {
      console.error('生成二维码失败:', err)
    }
  }, [])

  const canvasRefCallback = useCallback(
    (node: HTMLCanvasElement | null) => {
      setQrCanvasRef(node)
      if (node && registration) {
        generateQRCode(registration.checkinCode, node)
      }
    },
    [registration, generateQRCode]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    if (!formData.name.trim() || !formData.studentId.trim() || !formData.email.trim()) {
      showToast('请填写完整的报名信息', 'error')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      showToast('请输入有效的邮箱地址', 'error')
      return
    }

    setSubmitting(true)
    try {
      const result = await eventsApi.register(id, formData)
      setRegistration(result)
      showToast('报名成功！', 'success')
      if (event) {
        setEvent({ ...event, registeredCount: event.registeredCount + 1 })
      }
      await loadRegistrations(1)
    } catch (error: any) {
      const message = error?.response?.data?.error || '报名失败，请重试'
      showToast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="detail-loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="detail-error">
        <div className="error-icon">❌</div>
        <h2>活动不存在</h2>
        <button className="btn" onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    )
  }

  const categoryColor = CATEGORY_COLORS[event.category as EventCategory]
  const isFull = event.registeredCount >= event.capacity

  return (
    <div className="event-detail">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← 返回活动列表
      </button>

      <div className="detail-header">
        <div className="detail-cover" style={{ background: `linear-gradient(135deg, ${categoryColor} 0%, #ffffff 100%)` }}>
          <span className="detail-cover-emoji">
            {event.category === 'academic' ? '📚' : event.category === 'club' ? '🎯' : event.category === 'sports' ? '⚽' : event.category === 'art' ? '🎨' : '🤝'}
          </span>
        </div>
        <div className="detail-header-info">
          <span
            className="detail-category-badge"
            style={{ background: categoryColor }}
          >
            {CATEGORY_LABELS[event.category as EventCategory]}
          </span>
          <h1 className="detail-title">{event.title}</h1>
          <div className="detail-meta">
            <div className="meta-item">
              <span className="meta-icon">📅</span>
              <span>{formatDate(event.date)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-icon">📍</span>
              <span>{event.location}</span>
            </div>
            <div className="meta-item">
              <span className="meta-icon">🏢</span>
              <span>{event.organizer}</span>
            </div>
            <div className="meta-item">
              <span className="meta-icon">👥</span>
              <span className={isFull ? 'text-warn' : ''}>
                报名人数：{event.registeredCount}/{event.capacity}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-left">
          <div className="detail-section">
            <h2 className="section-title">活动介绍</h2>
            <div className="detail-description">
              {event.description || '暂无活动介绍'}
            </div>
          </div>

          <div className="detail-section">
            <h2 className="section-title">
              报名人员 <span className="section-subtitle">（共 {totalCount} 人）</span>
            </h2>

            {loadingRegistrations ? (
              <div className="table-loading">加载中...</div>
            ) : registrations.length === 0 ? (
              <div className="table-empty">暂无报名人员</div>
            ) : (
              <>
                <div className="registrations-table">
                  <div className="table-header">
                    <div className="th">姓名</div>
                    <div className="th">学号</div>
                    <div className="th">报名时间</div>
                    <div className="th">签到状态</div>
                  </div>
                  {registrations.map((reg, idx) => (
                    <div
                      key={reg._id}
                      className={`table-row ${idx % 2 === 1 ? 'row-alt' : ''}`}
                    >
                      <div className="td">{reg.name}</div>
                      <div className="td">{reg.studentId}</div>
                      <div className="td">{formatDateTime(reg.registeredAt)}</div>
                      <div className="td">
                        {reg.checkedIn ? (
                          <span className="status-chip success">
                            ✓ 已签到
                          </span>
                        ) : (
                          <span className="status-chip pending">未签到</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      className="page-btn"
                      disabled={page <= 1}
                      onClick={() => loadRegistrations(page - 1)}
                    >
                      上一页
                    </button>
                    <span className="page-info">
                      第 {page} / {totalPages} 页
                    </span>
                    <button
                      className="page-btn"
                      disabled={page >= totalPages}
                      onClick={() => loadRegistrations(page + 1)}
                    >
                      下一页
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="detail-right">
          <div className="register-card">
            <h2 className="register-title">
              {registration ? '报名信息' : '在线报名'}
            </h2>

            {registration ? (
              <div className="registration-success">
                <div className="success-header">
                  <span className="success-icon">✅</span>
                  <span className="success-text">您已成功报名！</span>
                </div>

                <div className="checkin-code-section">
                  <p className="checkin-label">您的签到码</p>
                  <p className="checkin-code">{registration.checkinCode}</p>
                  <p className="checkin-hint">请保存此签到码，活动当日凭此签到</p>

                  <div className="qr-code-wrapper">
                    <canvas ref={canvasRefCallback}></canvas>
                  </div>
                </div>

                <div className="reg-info-list">
                  <div className="reg-info-item">
                    <span className="reg-info-label">姓名：</span>
                    <span className="reg-info-value">{registration.name}</span>
                  </div>
                  <div className="reg-info-item">
                    <span className="reg-info-label">学号：</span>
                    <span className="reg-info-value">{registration.studentId}</span>
                  </div>
                  <div className="reg-info-item">
                    <span className="reg-info-label">邮箱：</span>
                    <span className="reg-info-value">{registration.email}</span>
                  </div>
                  <div className="reg-info-item">
                    <span className="reg-info-label">报名时间：</span>
                    <span className="reg-info-value">{formatDateTime(registration.registeredAt)}</span>
                  </div>
                  <div className="reg-info-item">
                    <span className="reg-info-label">签到状态：</span>
                    <span className="reg-info-value">
                      {registration.checkedIn ? (
                        <span className="status-chip success" style={{ display: 'inline-flex' }}>✓ 已签到</span>
                      ) : (
                        <span className="status-chip pending" style={{ display: 'inline-flex' }}>未签到</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="register-form">
                {isFull ? (
                  <div className="form-warning">
                    ⚠️ 该活动名额已满
                  </div>
                ) : null}

                <div className="form-group">
                  <label className="form-label">姓名 *</label>
                  <input
                    type="text"
                    name="name"
                    className="input"
                    placeholder="请输入您的姓名"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={isFull || submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">学号 *</label>
                  <input
                    type="text"
                    name="studentId"
                    className="input"
                    placeholder="请输入您的学号"
                    value={formData.studentId}
                    onChange={handleInputChange}
                    disabled={isFull || submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">邮箱 *</label>
                  <input
                    type="email"
                    name="email"
                    className="input"
                    placeholder="请输入您的邮箱"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={isFull || submitting}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-lg"
                  style={{ width: '100%', marginTop: '8px' }}
                  disabled={isFull || submitting}
                >
                  {submitting ? '提交中...' : isFull ? '名额已满' : '确认报名'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
