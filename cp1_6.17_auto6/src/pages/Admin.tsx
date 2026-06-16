import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Edit2, Trash2, Download } from 'lucide-react'
import type { Event, EventStats, CreateEventDto } from '../types'
import { getEvents, getStats, createEvent, updateEvent, deleteEvent } from '../api/events'
import { useApp } from '../context/AppContext'
import { exportToCSV } from '../utils/csv'

interface AdminPageProps {
  getProgressColor: (current: number, max: number) => string
}

function AdminPage({ getProgressColor }: AdminPageProps) {
  const { user } = useApp()
  
  const [events, setEvents] = useState<Event[]>([])
  const [stats, setStats] = useState<EventStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [showForm, setShowForm] = useState(false)
  
  const [formData, setFormData] = useState<CreateEventDto>({
    title: '',
    date: '',
    description: '',
    maxParticipants: 20
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [eventsResult, statsResult] = await Promise.all([
      getEvents(),
      getStats()
    ])
    
    if (eventsResult.data) {
      setEvents(eventsResult.data)
    }
    if (statsResult.data) {
      setStats(statsResult.data)
    }
    setLoading(false)
  }

  if (!user?.isAdmin) {
    return <Navigate to="/" replace />
  }

  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      errors.title = '请输入活动标题'
    }
    if (!formData.date) {
      errors.date = '请选择活动日期'
    } else if (new Date(formData.date) < new Date(new Date().setHours(0, 0, 0, 0))) {
      errors.date = '活动日期必须是未来日期'
    }
    if (!formData.description.trim()) {
      errors.description = '请输入活动简介'
    }
    if (!formData.maxParticipants || formData.maxParticipants < 1) {
      errors.maxParticipants = '最大人数必须大于0'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    if (editingEvent) {
      const result = await updateEvent(editingEvent.id, formData)
      if (result.error) {
        setFormErrors({ submit: result.error })
        return
      }
    } else {
      const result = await createEvent(formData)
      if (result.error) {
        setFormErrors({ submit: result.error })
        return
      }
    }

    resetForm()
    loadData()
  }

  const handleEdit = (event: Event) => {
    setEditingEvent(event)
    setFormData({
      title: event.title,
      date: event.date,
      description: event.description,
      maxParticipants: event.maxParticipants
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    const result = await deleteEvent(id)
    if (!result.error) {
      setShowDeleteModal(null)
      loadData()
    }
  }

  const handleExportCSV = (event: Event) => {
    exportToCSV(event)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      date: '',
      description: '',
      maxParticipants: 20
    })
    setEditingEvent(null)
    setShowForm(false)
    setFormErrors({})
  }

  const registeredData = stats.map(s => ({
    name: s.title.length > 12 ? s.title.substring(0, 12) + '...' : s.title,
    value: s.registeredCount,
    fullName: s.title
  }))

  const checkedInData = stats.map(s => ({
    name: s.title.length > 12 ? s.title.substring(0, 12) + '...' : s.title,
    value: s.checkedInCount,
    fullName: s.title
  }))

  const rateData = stats.map(s => ({
    name: s.title.length > 12 ? s.title.substring(0, 12) + '...' : s.title,
    value: s.registerRate,
    fullName: s.title
  }))

  const maxRegistered = Math.max(...registeredData.map(d => d.value), 1)
  const maxCheckedIn = Math.max(...checkedInData.map(d => d.value), 1)
  const maxRate = 100

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1 className="page-title">⚙️ 活动管理中心</h1>
        <button
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '取消' : editingEvent ? '编辑活动' : '+ 创建活动'}
        </button>
      </div>

      {showForm && (
        <div className="admin-form-section">
          <h2 className="section-title">
            {editingEvent ? '编辑活动' : '创建新活动'}
          </h2>
          <form onSubmit={handleSubmit} className="event-form">
            <div className="form-row">
              <div className="form-group">
                <label>活动标题 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="请输入活动标题"
                  className={`form-input ${formErrors.title ? 'error' : ''}`}
                />
                {formErrors.title && <span className="form-error">{formErrors.title}</span>}
              </div>
              <div className="form-group">
                <label>活动日期 *</label>
                <input
                  type="date"
                  value={formData.date}
                  min={getTomorrowDate()}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={`form-input ${formErrors.date ? 'error' : ''}`}
                />
                {formErrors.date && <span className="form-error">{formErrors.date}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>最大参与人数 *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 0 })}
                  className={`form-input ${formErrors.maxParticipants ? 'error' : ''}`}
                />
                {formErrors.maxParticipants && <span className="form-error">{formErrors.maxParticipants}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>活动简介 *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入活动详细介绍"
                rows={4}
                className={`form-textarea ${formErrors.description ? 'error' : ''}`}
              />
              {formErrors.description && <span className="form-error">{formErrors.description}</span>}
            </div>

            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={resetForm}>
                重置
              </button>
              <button type="submit" className="btn-primary">
                {editingEvent ? '保存修改' : '创建活动'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-section">
        <h2 className="section-title">📋 活动列表</h2>
        <div className="events-table-wrapper">
          <table className="events-table">
            <thead>
              <tr>
                <th>活动标题</th>
                <th>日期</th>
                <th>报名人数</th>
                <th>最大人数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-row">暂无活动</td>
                </tr>
              ) : (
                events.map(event => {
                  const registeredCount = event.participants.length
                  return (
                    <tr key={event.id}>
                      <td className="event-title-cell">{event.title}</td>
                      <td>{event.date}</td>
                      <td>
                        <span style={{ color: getProgressColor(registeredCount, event.maxParticipants) }}>
                          {registeredCount}
                        </span>
                      </td>
                      <td>{event.maxParticipants}</td>
                      <td className="action-cell">
                        <button
                          className="icon-btn edit-btn"
                          onClick={() => handleEdit(event)}
                          title="编辑"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="icon-btn export-btn"
                          onClick={() => handleExportCSV(event)}
                          title="导出CSV"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          className="icon-btn delete-btn"
                          onClick={() => setShowDeleteModal(event.id)}
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-section">
        <h2 className="section-title">📊 报名统计看板</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3 className="stat-title">报名人数</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={stats.length * 50 + 40}>
                <BarChart data={registeredData} layout="vertical" margin={{ left: 100, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, maxRegistered]} />
                  <YAxis type="category" dataKey="name" width={90} />
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      `${value} 人`,
                      props.payload.fullName
                    ]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {registeredData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#3498DB" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="stat-card">
            <h3 className="stat-title">签到人数</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={stats.length * 50 + 40}>
                <BarChart data={checkedInData} layout="vertical" margin={{ left: 100, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, maxCheckedIn]} />
                  <YAxis type="category" dataKey="name" width={90} />
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      `${value} 人`,
                      props.payload.fullName
                    ]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {checkedInData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#2ECC71" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="stat-card">
            <h3 className="stat-title">报名率 (%)</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={stats.length * 50 + 40}>
                <BarChart data={rateData} layout="vertical" margin={{ left: 100, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, maxRate]} />
                  <YAxis type="category" dataKey="name" width={90} />
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      `${value}%`,
                      props.payload.fullName
                    ]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {rateData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#F39C12" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="modal-overlay delete-overlay" onClick={() => setShowDeleteModal(null)}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">⚠️ 确认删除</h2>
            <p className="modal-message">确定要删除这个活动吗？此操作不可撤销。</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowDeleteModal(null)}>
                取消
              </button>
              <button
                className="btn-delete"
                onClick={() => handleDelete(showDeleteModal)}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPage
