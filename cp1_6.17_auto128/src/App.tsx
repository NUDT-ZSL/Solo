import React, { useState, useEffect, useCallback } from 'react'
import KanbanBoard from './components/KanbanBoard'
import StatPanel from './components/StatPanel'
import { Feedback, FeedbackStatus, FeedbackType, api } from './utils/api'

const TYPE_COLORS: Record<FeedbackType, string> = {
  feature: '#3498DB',
  bug: '#E74C3C',
  performance: '#9B59B6'
}

const TYPE_LABELS: Record<FeedbackType, string> = {
  feature: '功能建议',
  bug: 'Bug报告',
  performance: '性能问题'
}

const App: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [statOpen, setStatOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formData, setFormData] = useState({
    type: 'feature' as FeedbackType,
    title: '',
    description: ''
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadFeedbacks = useCallback(async () => {
    try {
      const data = await api.getFeedbacks()
      setFeedbacks(data)
    } catch (err) {
      console.error('Failed to load feedbacks:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFeedbacks()
  }, [loadFeedbacks])

  const handleStatusChange = useCallback(async (id: string, status: FeedbackStatus) => {
    const feedback = feedbacks.find(f => f.id === id)
    if (!feedback || feedback.status === status) return

    const prevFeedbacks = [...feedbacks]
    setFeedbacks(prev =>
      prev.map(f =>
        f.id === id
          ? {
              ...f,
              status,
              updatedAt: new Date().toISOString(),
              closedAt: status === 'closed' ? new Date().toISOString() : undefined
            }
          : f
      )
    )

    try {
      await api.updateFeedback(id, { status })
    } catch (err) {
      console.error('Failed to update feedback:', err)
      setFeedbacks(prevFeedbacks)
    }
  }, [feedbacks])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.description.trim()) return

    setSubmitting(true)
    try {
      const newFeedback = await api.createFeedback(formData)
      setFeedbacks(prev => [newFeedback, ...prev])
      setFormData({ type: 'feature', title: '', description: '' })
      setFormOpen(false)
    } catch (err) {
      console.error('Failed to create feedback:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#2C3E50' }}>
      <header
        style={{
          backgroundColor: '#2C3E50',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #34495E'
        }}
      >
        <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 600 }}>
          用户反馈看板
        </h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => setFormOpen(true)}
            style={{
              backgroundColor: '#27AE60',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '10px 20px',
              fontSize: 14,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              marginRight: 50
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#229954'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#27AE60'
            }}
          >
            + 提交反馈
          </button>
        </div>
      </header>

      <main style={{ backgroundColor: '#ECF0F1', minHeight: 'calc(100vh - 65px)' }}>
        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '50vh',
              color: '#7F8C8D'
            }}
          >
            加载中...
          </div>
        ) : (
          <KanbanBoard feedbacks={feedbacks} onStatusChange={handleStatusChange} />
        )}
      </main>

      <StatPanel
        feedbacks={feedbacks}
        isOpen={statOpen}
        onToggle={() => setStatOpen(!statOpen)}
      />

      {formOpen && (
        <div
          onClick={() => setFormOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 200,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 24,
              width: 440,
              maxWidth: '90vw',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              animation: 'slideUp 0.3s ease-out'
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: '#333' }}>
              提交反馈
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 6 }}>
                  反馈类型
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(Object.keys(TYPE_COLORS) as FeedbackType[]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type }))}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: `2px solid ${formData.type === type ? TYPE_COLORS[type] : '#ddd'}`,
                        backgroundColor: formData.type === type ? `${TYPE_COLORS[type]}15` : '#fff',
                        color: formData.type === type ? TYPE_COLORS[type] : '#666',
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontWeight: formData.type === type ? 600 : 400
                      }}
                    >
                      {TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 6 }}>
                  标题
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="请简要描述您的反馈"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3498DB'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#ddd'
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 6 }}>
                  详细描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="请详细描述您的反馈内容..."
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    fontSize: 14,
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3498DB'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#ddd'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    backgroundColor: '#fff',
                    color: '#666',
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff'
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.title.trim() || !formData.description.trim()}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#3498DB',
                    color: '#fff',
                    fontSize: 14,
                    cursor: formData.title.trim() && formData.description.trim() ? 'pointer' : 'not-allowed',
                    opacity: submitting ? 0.7 : 1,
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = '#2E86C1'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = '#3498DB'
                    }
                  }}
                >
                  {submitting ? '提交中...' : '提交'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
