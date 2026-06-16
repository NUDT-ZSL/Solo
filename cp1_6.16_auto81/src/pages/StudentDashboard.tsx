import { useState, useEffect } from 'react'
import type { Course } from '@/types'
import { Clock, Music, Send, Calendar } from 'lucide-react'
import { pieces } from '@/data/pieces'

export default function StudentDashboard() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const studentId = 's1'

  const [form, setForm] = useState({
    piece: '',
    duration: 30,
    note: '',
  })

  useEffect(() => {
    fetchSchedule().finally(() => setLoading(false))
  }, [])

  async function fetchSchedule() {
    try {
      const res = await fetch('/api/teacher/schedule')
      const data = await res.json()
      setCourses((data.courses || []).filter((c: Course) => c.studentId === studentId))
    } catch {
      setCourses([])
    }
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
          studentId,
          piece: form.piece,
          duration: form.duration,
          note: form.note,
        }),
      })
      const data = await res.json()

      if (data.success) {
        showToast('success', '日志提交成功')
        setForm({ piece: '', duration: 30, note: '' })
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

  const today = new Date()
  const weekdayNames = ['日', '一', '二', '三', '四', '五', '六']
  const todayStr = `${today.getMonth() + 1}月${today.getDate()}日 星期${weekdayNames[today.getDay()]}`

  return (
    <div>
      <div className="mb-6">
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#333' }}>
          我今日的课程
        </h1>
        <p className="flex items-center gap-1 mt-1" style={{ fontSize: '14px', color: '#999' }}>
          <Calendar size={14} />
          {todayStr}
        </p>
      </div>

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

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: '#F0F4F8' }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {courses.length === 0 ? (
            <div className="col-span-2 flex flex-col items-center py-12" style={{ color: '#999' }}>
              <Calendar size={48} strokeWidth={1} style={{ color: '#D0D5DD' }} />
              <p style={{ fontSize: '16px', marginTop: '12px' }}>今天没有课程安排</p>
            </div>
          ) : (
            courses.map((course) => (
              <div
                key={course.id}
                className="course-card p-4 rounded-xl"
                style={{
                  background: '#F0F4F8',
                  borderLeft: '4px solid #4A90D9',
                  borderRadius: '12px',
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex-shrink-0 flex items-center justify-center text-white font-medium"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: course.studentAvatar,
                      fontSize: '14px',
                    }}
                  >
                    {course.studentName.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>
                      {course.piece}
                    </h3>
                    <div className="flex items-center gap-4 mt-1" style={{ fontSize: '13px', color: '#666' }}>
                      <span className="flex items-center gap-1">
                        <Clock size={13} />
                        {course.time}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="p-6 rounded-xl" style={{ background: '#fff', border: '1px solid #E0E6ED' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginBottom: '16px' }}>
          <Music size={18} className="inline mr-2" style={{ color: '#4A90D9' }} />
          提交练琴日志
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              rows={4}
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
        </form>
      </div>
    </div>
  )
}
