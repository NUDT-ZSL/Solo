import React, { useEffect, useState } from 'react'
import http from '../http'

interface RescheduleRequest {
  id: string
  courseId: string
  courseName: string
  teacher: string
  originalTime: string
  newTime: string
  remark: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

interface DashboardStats {
  weekCourseCount: number
  pendingRequests: number
  activityRate: number
  pendingList: RescheduleRequest[]
}

interface DashboardProps {
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void
}

const pad = (n: number) => n.toString().padStart(2, '0')

const formatDateTime = (iso: string) => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const CheckIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const CloseIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const BookIcon = () => (
  <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
)

const ClockIcon = () => (
  <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const UsersIcon = () => (
  <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const Dashboard: React.FC<DashboardProps> = ({ onNotify }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await http.get('/dashboard/stats')
      setStats(res.data)
    } catch (err: any) {
      onNotify(err.message || '加载数据失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleApprove = async (req: RescheduleRequest) => {
    try {
      setProcessingId(req.id)
      const res = await http.post(`/reschedule/${req.id}/approve`)
      const affected = res.data.affectedStudents?.length || 0
      onNotify(`已批准调课，${affected}位学员将收到通知`, 'success')
      await fetchStats()
    } catch (err: any) {
      if (err.data?.conflict) {
        const ok = window.confirm('新时间与其他课程冲突，是否仍然覆盖？')
        if (ok) {
          try {
            await http.put(`/courses/${req.courseId}`, { startTime: req.newTime })
            await http.post(`/reschedule/${req.id}/approve`)
            onNotify('已强制覆盖课程时间', 'success')
            await fetchStats()
          } catch (err2: any) {
            onNotify(err2.message || '操作失败', 'error')
          }
        }
      } else {
        onNotify(err.message || '批准失败', 'error')
      }
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (req: RescheduleRequest) => {
    try {
      setProcessingId(req.id)
      await http.post(`/reschedule/${req.id}/reject`)
      onNotify('已拒绝该调课申请', 'info')
      await fetchStats()
    } catch (err: any) {
      onNotify(err.message || '拒绝失败', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const metrics = stats ? [
    { label: '本周总课程数', value: stats.weekCourseCount, icon: <BookIcon />, suffix: '节' },
    { label: '待处理调课请求', value: stats.pendingRequests, icon: <ClockIcon />, suffix: '条' },
    { label: '学员活跃度', value: stats.activityRate, icon: <UsersIcon />, suffix: '%' }
  ] : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <div
        style={{
          height: 160,
          background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
          borderRadius: 12,
          padding: 28,
          position: 'relative',
          overflow: 'hidden',
          margin: -24,
          marginBottom: 0
        }}
      >
        <div style={{ color: '#ffffff', fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
          运营总览
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
          {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </div>
        <div
          style={{
            position: 'absolute',
            right: -20,
            bottom: -40,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)'
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: -80, position: 'relative', zIndex: 2 }}>
        {loading ? (
          <div style={{ color: '#7f8c8d', padding: 40 }}>加载中...</div>
        ) : (
          metrics.map((m, i) => (
            <div
              key={i}
              className="metric-card"
              style={{
                width: 200,
                height: 100,
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(12px)',
                borderRadius: 12,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                padding: 16,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ position: 'absolute', top: 12, right: 12 }}>{m.icon}</div>
              <div>
                <span style={{ fontSize: 36, fontWeight: 700, color: '#ffffff' }}>{m.value}</span>
                <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginLeft: 4 }}>{m.suffix}</span>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{m.label}</div>
            </div>
          ))
        )}
      </div>

      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          padding: 20,
          transition: 'box-shadow 0.2s ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)' }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#2c3e50' }}>
            待处理调课申请
            {stats && stats.pendingList.length > 0 && (
              <span style={{ marginLeft: 8, background: '#e74c3c', color: '#fff', fontSize: 12, padding: '2px 8px', borderRadius: 10 }}>
                {stats.pendingList.length}
              </span>
            )}
          </div>
        </div>

        {!stats || stats.pendingList.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#95a5a6', fontSize: 13 }}>
            暂无待处理的调课申请
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.pendingList.map((req) => (
              <div
                key={req.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: 14,
                  background: '#f8f9fa',
                  borderRadius: 10,
                  borderLeft: '3px solid #3498db'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#2c3e50', marginBottom: 4 }}>
                    {req.courseName}
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#7f8c8d', fontWeight: 400 }}>
                      {req.teacher}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#7f8c8d', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: '#e74c3c' }}>{formatDateTime(req.originalTime)}</span>
                    <span>→</span>
                    <span style={{ color: '#2ecc71' }}>{formatDateTime(req.newTime)}</span>
                    {req.remark && <span style={{ color: '#95a5a6' }}>| 备注：{req.remark}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    disabled={processingId === req.id}
                    onClick={() => handleApprove(req)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#2ecc71',
                      color: '#ffffff',
                      fontSize: 12,
                      cursor: processingId === req.id ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      opacity: processingId === req.id ? 0.6 : 1,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => { if (processingId !== req.id) e.currentTarget.style.background = '#27ae60' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#2ecc71' }}
                  >
                    <CheckIcon /> 批准
                  </button>
                  <button
                    disabled={processingId === req.id}
                    onClick={() => handleReject(req)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#e74c3c',
                      color: '#ffffff',
                      fontSize: 12,
                      cursor: processingId === req.id ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      opacity: processingId === req.id ? 0.6 : 1,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => { if (processingId !== req.id) e.currentTarget.style.background = '#c0392b' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#e74c3c' }}
                  >
                    <CloseIcon /> 拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
