import { useState, useEffect, useCallback, useRef } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { api, AnalyticsData } from '../api'

export default function Dashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await api.getAnalytics()
      setData(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      await api.addArtwork(fd)
      formRef.current?.reset()
      await loadAnalytics()
      alert('作品添加成功！')
    } catch (err) {
      console.error(err)
      alert('添加失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const gradientColors = ['#7986cb', '#9fa8da', '#5c6bc0', '#3f51b5']

  if (loading) {
    return <div className="page-container"><div className="loading-state">加载中...</div></div>
  }

  return (
    <div className="page-container">
      <div className="dashboard-grid">
        <div className="chart-card">
          <div className="chart-title">类别热度分布</div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart
                data={data?.categoryStats || []}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ecf8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#757575' }} />
                <YAxis
                  dataKey="category"
                  type="category"
                  width={60}
                  tick={{ fontSize: 13, fill: '#424242' }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(v: number) => [`${v} 次浏览`, '浏览量']}
                />
                <Bar dataKey="views" radius={[0, 6, 6, 0]} barSize={24}>
                  {data?.categoryStats.map((_, idx) => (
                    <Cell key={idx} fill={gradientColors[idx % gradientColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">过去24小时浏览趋势</div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={data?.hourlyStats || []} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ecf8" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 11, fill: '#757575' }}
                  interval={3}
                />
                <YAxis tick={{ fontSize: 12, fill: '#757575' }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(v: number) => [`${v} 次`, '浏览量']}
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="#4fc3f7"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#4fc3f7', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="add-artwork-form">
        <div className="chart-title">添加新作品</div>
        <form ref={formRef} onSubmit={handleSubmit} style={{ marginTop: 4 }}>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">作品标题</label>
              <input name="title" className="form-input" required placeholder="请输入作品标题" />
            </div>
            <div className="form-field">
              <label className="form-label">艺术家名</label>
              <input name="artist" className="form-input" required placeholder="请输入艺术家姓名" />
            </div>
            <div className="form-field">
              <label className="form-label">类别</label>
              <select name="category" className="form-select" required>
                <option value="painting">绘画</option>
                <option value="sculpture">雕塑</option>
                <option value="photography">摄影</option>
                <option value="digital">数字艺术</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">价格（元）</label>
              <input name="price" type="number" min="0" step="1" className="form-input" required placeholder="请输入价格" />
            </div>
            <div className="form-field full">
              <label className="form-label">作品描述</label>
              <textarea name="description" className="form-textarea" required placeholder="请输入作品描述" />
            </div>
            <div className="form-field full">
              <label className="form-label">封面图（JPG/PNG，≤5MB，可选）</label>
              <input name="image" type="file" accept=".jpg,.jpeg,.png" className="form-input" />
            </div>
          </div>
          <button type="submit" className="form-submit" disabled={submitting}>
            {submitting ? '提交中...' : '添加作品'}
          </button>
        </form>
      </div>
    </div>
  )
}
