import { useState, useEffect } from 'react'
import type { Course } from '@/types'
import PlayLogPanel from '@/components/PlayLogPanel'
import { Clock, Music, Calendar } from 'lucide-react'

export default function TeacherDashboard() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

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
        <div
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: '#F0F4F8', color: '#4A90D9' }}
        >
          共 {courses.length} 节课
        </div>
      </div>

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
