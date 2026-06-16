import { useState, useEffect } from 'react'
import type { Course } from '@/types'
import PlayLogPanel from '@/components/PlayLogPanel'
import { useAppStore } from '@/store/useAppStore'
import { Clock, Music, Calendar, Plus, X } from 'lucide-react'
import { pieces } from '@/data/pieces'

export default function TeacherDashboard() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { showConflictDialog } = useAppStore()

  const [form, setForm] = useState({
    studentName: '',
    dayOfWeek: new Date().getDay() || 7,
    startTime: '09:00',
    endTime: '09:45',
    piece: '',
  })

  useEffect(() => {
    fetchSchedule()
  }, [])

  async function fetchSchedule() {
    try {
      const res = await fetch('/api/teacher/schedule')
      const data = await res.json()
      setCourses(data.courses || [])
    } catch {
      setCourses([])
    }
    setLoading(false)
  }

  async function handleAddSchedule(e: React.FormEvent) {
    e.preventDefault()
    if (!form.studentName || !form.piece) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (data.success) {
        fetchSchedule()
        setShowAddForm(false)
        setForm({
          studentName: '',
          dayOfWeek: new Date().getDay() || 7,
          startTime: '09:00',
          endTime: '09:45',
          piece: '',
        })
      } else if (data.conflicts && data.conflicts.length > 0) {
        showConflictDialog(data.conflicts)
      }
    } catch {
      // ignore
    }
    setSubmitting(false)
  }

  const today = new Date()
  const weekdayNames = ['日', '一', '二', '三', '四', '五', '六']
  const todayStr = `${today.getMonth() + 1}月${today.getDate()}日 星期${weekdayNames[today.getDay()]}`

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#333' }}>
            今日课表
          </h1>
          <p className="flex items-center gap-1 mt-1" style={{ fontSize: '14px', color: '#999' }}>
            <Calendar size={14} />
            {todayStr}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: '#F0F4F8', color: '#4A90D9' }}
          >
            共 {courses.length} 节课
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: '#4A90D9' }}
          >
            {showAddForm ? <X size={16} /> : <Plus size={16} />}
            {showAddForm ? '取消' : '添加课表'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div
          className="mb-6 p-5 rounded-xl animate-fade-in"
          style={{ background: '#fff', border: '1px solid #E0E6ED' }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#333', marginBottom: '16px' }}>
            添加新课程
          </h3>
          <form onSubmit={handleAddSchedule} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
                学生姓名
              </label>
              <input
                type="text"
                value={form.studentName}
                onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                placeholder="请输入学生姓名"
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E0E6ED' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
                星期
              </label>
              <select
                value={form.dayOfWeek}
                onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E0E6ED' }}
                required
              >
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>
                    星期{weekdayNames[d % 7]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
                开始时间
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E0E6ED' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
                结束时间
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E0E6ED' }}
                required
              />
            </div>
            <div className="md:col-span-2">
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
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#4A90D9' }}
              >
                {submitting ? '添加中...' : '添加课表'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: '#F0F4F8' }} />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center py-16" style={{ color: '#999' }}>
          <Calendar size={48} strokeWidth={1} style={{ color: '#D0D5DD' }} />
          <p style={{ fontSize: '16px', marginTop: '12px' }}>今天没有课程安排</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="course-card p-4 rounded-xl"
              style={{
                background: '#F0F4F8',
                borderLeft: '4px solid #4A90D9',
                borderRadius: '12px',
              }}
            >
              <div className="flex items-start gap-3">
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>
                      {course.studentName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 mt-1" style={{ fontSize: '13px', color: '#666' }}>
                    <span className="flex items-center gap-1">
                      <Clock size={13} />
                      {course.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Music size={13} />
                      {course.piece}
                    </span>
                  </div>
                  <div className="mt-3">
                    <PlayLogPanel course={course} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
