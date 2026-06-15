import React, { useEffect, useState } from 'react'
import axios from 'axios'

interface Appointment {
  _id: string
  storeId: string
  date: string
  time: string
  service: string
  petName: string
  petBreed: string
  petWeight: string
  ownerPhone: string
  ownerName: string
  groomerId: string
  status: string
  price: number
  rating: number | null
  review: string | null
}

const serviceBgMap: Record<string, string> = {
  '洗澡': '#dbeafe',
  '剪毛': '#d1fae5',
  'SPA': '#e9d5ff',
}

const serviceDurationMap: Record<string, string> = {
  '洗澡': '60分钟',
  '剪毛': '90分钟',
  'SPA': '120分钟',
}

const GroomerSchedule: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [ratingModal, setRatingModal] = useState<{ aptId: string; petName: string } | null>(null)
  const [ratingValue, setRatingValue] = useState(5)
  const [reviewText, setReviewText] = useState('')

  const today = new Date().toISOString().slice(0, 10)
  const groomerId = 'groomer-1'

  useEffect(() => {
    const fetchSchedule = async () => {
      const start = performance.now()
      try {
        const res = await axios.get('/api/appointments', {
          params: { groomerId, date: today },
        })
        setAppointments(res.data)
        const elapsed = performance.now() - start
        console.log(`Groomer schedule rendered in ${elapsed.toFixed(0)}ms`)
      } catch (err) {
        console.error('Failed to load schedule:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSchedule()
  }, [today])

  const handleStatusChange = async (aptId: string, newStatus: string) => {
    if (newStatus === 'completed') {
      const apt = appointments.find(a => a._id === aptId)
      if (apt) {
        setRatingModal({ aptId, petName: apt.petName })
      }
      return
    }

    try {
      await axios.put(`/api/appointments/${aptId}`, { status: newStatus })
      setAppointments(prev =>
        prev.map(a => (a._id === aptId ? { ...a, status: newStatus } : a))
      )
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const submitRating = async () => {
    if (!ratingModal) return
    try {
      await axios.put(`/api/appointments/${ratingModal.aptId}`, {
        status: 'completed',
        rating: ratingValue,
        review: reviewText,
      })
      setAppointments(prev =>
        prev.map(a =>
          a._id === ratingModal.aptId
            ? { ...a, status: 'completed', rating: ratingValue, review: reviewText }
            : a
        )
      )
      setRatingModal(null)
      setRatingValue(5)
      setReviewText('')
    } catch (err) {
      console.error('Failed to submit rating:', err)
    }
  }

  const sorted = [...appointments].sort((a, b) => a.time.localeCompare(b.time))

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ fontSize: 16, color: '#64748b' }}>加载日程中...</div>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>
        ✂️ 今日日程 <span style={{ fontSize: 14, fontWeight: 400, color: '#64748b' }}>({today})</span>
      </h2>

      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: 15 }}>
          今日暂无预约
        </div>
      ) : (
        <div className="groomer-schedule-container" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {sorted.map(apt => {
            const isCompleted = apt.status === 'completed'
            const bgColor = isCompleted ? '#f3f4f6' : serviceBgMap[apt.service] || '#f1f5f9'

            return (
              <div
                key={apt._id}
                style={{
                  width: 280,
                  minHeight: 160,
                  background: bgColor,
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: isCompleted ? 'default' : 'pointer',
                  position: 'relative',
                  opacity: isCompleted ? 0.7 : 1,
                }}
                onMouseEnter={e => {
                  if (!isCompleted) {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 8px 12px -2px rgba(0,0,0,0.15)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isCompleted) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }
                }}
                onClick={() => {
                  if (isCompleted) return
                  if (apt.status === 'pending') {
                    handleStatusChange(apt._id, 'in_progress')
                  } else if (apt.status === 'in_progress') {
                    handleStatusChange(apt._id, 'completed')
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{apt.time}</span>
                  {isCompleted ? (
                    <span style={{ fontSize: 12, background: '#94a3b8', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>已完成</span>
                  ) : apt.status === 'in_progress' ? (
                    <span style={{ fontSize: 12, background: '#f97316', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>进行中</span>
                  ) : (
                    <span style={{ fontSize: 12, background: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>待开始</span>
                  )}
                </div>
                <div style={{ fontSize: 14, color: '#334155', marginBottom: 4 }}>
                  🐾 <strong>{apt.petName}</strong> ({apt.petBreed})
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
                  📞 {apt.ownerPhone}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
                  ✂️ {apt.service}
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  ⏱️ 预计 {serviceDurationMap[apt.service] || '60分钟'}
                </div>
                {isCompleted && apt.rating && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                    评分：{'⭐'.repeat(apt.rating)} {apt.review && `— "${apt.review}"`}
                  </div>
                )}
                {!isCompleted && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
                    {apt.status === 'pending' ? '点击开始服务' : '点击完成服务'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {ratingModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
          }}
          onClick={() => setRatingModal(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 28,
              width: 360,
              maxWidth: '90vw',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
              服务评价 — {ratingModal.petName}
            </h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 8 }}>评分</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    onClick={() => setRatingValue(v)}
                    style={{
                      fontSize: 28,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      opacity: v <= ratingValue ? 1 : 0.3,
                      transition: 'opacity 0.15s',
                      padding: 0,
                    }}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              <span style={{ fontSize: 13, color: '#f97316' }}>{ratingValue} 星</span>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 8 }}>文字评价</label>
              <textarea
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                placeholder="请输入评价内容..."
                style={{
                  width: '100%',
                  height: 80,
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 14,
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRatingModal(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                取消
              </button>
              <button
                onClick={submitRating}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#f97316',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                提交评价
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroomerSchedule
