import { useState, useEffect } from 'react'
import type { Course, PlayLog } from '@/types'
import { ChevronDown, ChevronUp, Clock, Send, FileText } from 'lucide-react'
import { pieces } from '@/data/pieces'

interface PlayLogPanelProps {
  course: Course
}

export default function PlayLogPanel({ course }: PlayLogPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [logs, setLogs] = useState<PlayLog[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [form, setForm] = useState({
    piece: '',
    duration: 30,
    note: '',
  })

  useEffect(() => {
    if (expanded) {
      fetchLogs()
    }
  }, [expanded])

  async function fetchLogs() {
    setLoading(true)
    try {
      const res = await fetch(`/api/student/logs?studentId=${course.studentId}`)
      const data = await res.json()
      setLogs(data.logs || [])
    } catch {
      setLogs([])
    }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.piece || !form.note) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: course.studentId,
          piece: form.piece,
          duration: form.duration,
          note: form.note,
        }),
      })
      const data = await res.json()

      if (data.success) {
        showToast('success', '日志提交成功')
        setForm({ piece: '', duration: 30, note: '' })
        fetchLogs()
      } else {
        showToast('error', data.message || '提交失败')
      }
    } catch {
      showToast('error', '网络错误，请重试')
    }
    setSubmitting(false)
  }

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 1500)
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-sm transition-colors hover:opacity-80"
        style={{ color: '#4A90D9' }}
      >
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {expanded ? '收起日志' : '查看练琴日志'}
      </button>

      {expanded && (
        <div className="mt-4 animate-slide-down" style={{ paddingLeft: '56px' }}>
          {toast && (
            <div
              className="animate-toast-in mb-4 px-4 py-2 rounded-lg text-sm text-white"
              style={{
                backgroundColor: toast.type === 'success' ? '#27AE60' : '#E74C3C',
              }}
            >
              {toast.message}
            </div>
          )}

          <div className="mb-6">
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '12px' }}>
              历史练琴记录
            </h4>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: '#F0F4F8' }} />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center py-8" style={{ color: '#999' }}>
                <FileText size={40} strokeWidth={1} style={{ color: '#D0D5DD' }} />
                <p style={{ fontSize: '14px', marginTop: '8px' }}>暂无练琴记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log, index) => (
                  <div
                    key={log.id}
                    className="animate-fade-in p-3 rounded-lg"
                    style={{
                      background: '#fff',
                      border: '1px solid #E0E6ED',
                      animationDelay: `${index * 0.05}s`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#333' }}>
                        {log.piece}
                      </span>
                      <span style={{ fontSize: '12px', color: '#999' }}>
                        {log.date}
                      </span>
                    </div>
                    <div className="flex items-center gap-4" style={{ fontSize: '12px', color: '#666' }}>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {log.duration}分钟
                      </span>
                    </div>
                    {log.note && (
                      <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                        {log.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-4 rounded-lg" style={{ background: '#fff', border: '1px solid #E0E6ED' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '12px' }}>
              提交练琴日志
            </h4>

            <div className="space-y-4">
              <div>
                <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
                  练习曲目
                </label>
                <select
                  value={form.piece}
                  onChange={(e) => setForm({ ...form, piece: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
                  style={{ borderColor: '#E0E6ED' }}
                  required
                >
                  <option value="">请选择曲目</option>
                  {pieces.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} ({p.tags.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
                  练习时长（分钟）
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
                  style={{ borderColor: '#E0E6ED' }}
                  required
                />
                <span style={{ fontSize: '11px', color: '#999' }}>5-120分钟</span>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
                  练习心得
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 resize-none"
                  style={{ borderColor: '#E0E6ED' }}
                  placeholder="记录今天的练习心得..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#4A90D9' }}
              >
                <Send size={14} />
                {submitting ? '提交中...' : '提交日志'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
