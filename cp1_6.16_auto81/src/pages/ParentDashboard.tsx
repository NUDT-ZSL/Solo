import { useState } from 'react'
import type { WeeklyStat } from '@/types'
import AttendanceRing from '@/components/AttendanceRing'
import { Search, TrendingUp } from 'lucide-react'

export default function ParentDashboard() {
  const [searchKey, setSearchKey] = useState('')
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null)
  const [weeklyLogs, setWeeklyLogs] = useState<WeeklyStat[]>([])
  const [studentName, setStudentName] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchKey.trim()) return

    setLoading(true)
    setError('')
    setSearched(true)

    try {
      const isId = searchKey.startsWith('s')
      const url = isId
        ? `/api/parent/data?studentId=${searchKey}`
        : `/api/parent/data?studentName=${encodeURIComponent(searchKey)}`

      const res = await fetch(url)
      const data = await res.json()

      if (data.attendanceRate !== undefined) {
        setAttendanceRate(data.attendanceRate)
        setWeeklyLogs(data.weeklyLogs || [])
        setStudentName(data.studentName || searchKey)
      } else {
        setError(data.message || '未找到该学生')
        setAttendanceRate(null)
        setWeeklyLogs([])
      }
    } catch {
      setError('查询失败，请重试')
      setAttendanceRate(null)
      setWeeklyLogs([])
    }
    setLoading(false)
  }

  const maxMinutes = Math.max(...weeklyLogs.map((l) => l.totalMinutes), 1)

  return (
    <div>
      <div className="mb-8">
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#333' }}>
          家长看板
        </h1>
        <p style={{ fontSize: '14px', color: '#999', marginTop: '4px' }}>
          查看孩子的学习进度与练琴统计
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: '#999' }}
            />
            <input
              type="text"
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              placeholder="输入孩子姓名或学生ID（如：张小明 或 s1）"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-2"
              style={{ borderColor: '#E0E6ED' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#4A90D9' }}
          >
            {loading ? '查询中...' : '查询'}
          </button>
        </div>
      </form>

      {error && (
        <div
          className="mb-6 px-4 py-3 rounded-lg text-sm"
          style={{ background: '#FFF5F5', color: '#E74C3C', border: '1px solid #FECACA' }}
        >
          {error}
        </div>
      )}

      {attendanceRate !== null && (
        <div className="animate-fade-in">
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginBottom: '24px' }}>
            {studentName} 的学习报告
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl text-center" style={{ background: '#fff', border: '1px solid #E0E6ED' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#666', marginBottom: '20px' }}>
                课程出勤率
              </h3>
              <div className="flex justify-center">
                <AttendanceRing rate={attendanceRate} />
              </div>
            </div>

            <div className="p-6 rounded-xl" style={{ background: '#fff', border: '1px solid #E0E6ED' }}>
              <h3 className="flex items-center gap-2" style={{ fontSize: '14px', fontWeight: 500, color: '#666', marginBottom: '20px' }}>
                <TrendingUp size={16} style={{ color: '#6C63FF' }} />
                最近7天练琴时长
              </h3>

              <div className="flex items-end gap-2 justify-between" style={{ height: '180px' }}>
                {weeklyLogs.map((log, index) => {
                  const height = log.totalMinutes > 0
                    ? Math.max((log.totalMinutes / maxMinutes) * 140, 8)
                    : 0
                  const dayLabel = new Date(log.date).toLocaleDateString('zh-CN', { weekday: 'short' })
                  const hasData = log.totalMinutes > 0

                  return (
                    <div key={index} className="flex flex-col items-center flex-1" style={{ height: '100%' }}>
                      <div className="flex-1 flex items-end w-full justify-center">
                        {hasData ? (
                          <div
                            className="w-full rounded-t-md transition-all"
                            style={{
                              height: `${height}px`,
                              maxWidth: '36px',
                              background: `linear-gradient(180deg, #6C63FF 0%, #4A90D9 100%)`,
                              animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
                            }}
                          />
                        ) : (
                          <div
                            className="w-full rounded-t-md"
                            style={{
                              height: '8px',
                              maxWidth: '36px',
                              border: '2px dashed #D0D5DD',
                              borderTop: 'none',
                              borderLeft: 'none',
                              borderRight: 'none',
                            }}
                          />
                        )}
                      </div>
                      <div className="mt-2 text-center">
                        <span style={{ fontSize: '11px', color: '#999' }}>
                          {dayLabel}
                        </span>
                        {hasData && (
                          <div style={{ fontSize: '10px', color: '#666' }}>
                            {log.totalMinutes}分
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {!searched && !error && (
        <div className="flex flex-col items-center py-16" style={{ color: '#999' }}>
          <Search size={48} strokeWidth={1} style={{ color: '#D0D5DD' }} />
          <p style={{ fontSize: '16px', marginTop: '12px' }}>输入孩子姓名或ID查看学习进度</p>
          <p style={{ fontSize: '13px', color: '#BBB', marginTop: '4px' }}>
            示例：张小明 或 s1
          </p>
        </div>
      )}
    </div>
  )
}
