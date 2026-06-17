import React, { useMemo } from 'react'
import { Feedback, FeedbackType } from '../utils/api'

interface StatPanelProps {
  feedbacks: Feedback[]
  isOpen: boolean
  onToggle: () => void
}

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

function calculateStats(feedbacks: Feedback[]) {
  const typeCounts: Record<FeedbackType, number> = {
    feature: 0,
    bug: 0,
    performance: 0
  }

  let closedCount = 0
  let totalProcessingDays = 0
  let closedWithTime = 0

  for (const fb of feedbacks) {
    typeCounts[fb.type]++
    if (fb.status === 'closed' && fb.closedAt) {
      closedCount++
      const created = new Date(fb.createdAt).getTime()
      const closed = new Date(fb.closedAt).getTime()
      const days = (closed - created) / (1000 * 60 * 60 * 24)
      totalProcessingDays += days
      closedWithTime++
    }
  }

  const total = feedbacks.length
  const resolveRate = total > 0 ? (closedCount / total) * 100 : 0
  const avgProcessingTime = closedWithTime > 0 ? totalProcessingDays / closedWithTime : 0

  const last7Days: { date: string; count: number }[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const dayEnd = dayStart + 24 * 60 * 60 * 1000
    const count = feedbacks.filter(fb => {
      const t = new Date(fb.createdAt).getTime()
      return t >= dayStart && t < dayEnd
    }).length
    last7Days.push({ date: dateStr, count })
  }

  return {
    typeCounts,
    total,
    closedCount,
    resolveRate,
    avgProcessingTime,
    last7Days
  }
}

function RingProgress({ percent, size = 120, strokeWidth = 6 }: { percent: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percent / 100) * circumference

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#E0E0E0"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#27AE60"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="20"
        fontWeight="bold"
        fill="#333"
      >
        {percent.toFixed(1)}%
      </text>
    </svg>
  )
}

function LineChart({ data, width = 280, height = 160 }: { data: { date: string; count: number }[]; width?: number; height?: number }) {
  const padding = { top: 20, right: 20, bottom: 30, left: 30 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const maxCount = Math.max(...data.map(d => d.count), 1)
  const stepX = chartWidth / (data.length - 1)

  const points = data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + chartHeight - (d.count / maxCount) * chartHeight
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  const yTicks = 4
  const yLabels = []
  for (let i = 0; i <= yTicks; i++) {
    const value = Math.round((maxCount / yTicks) * i)
    const y = padding.top + chartHeight - (value / maxCount) * chartHeight
    yLabels.push({ value, y })
  }

  return (
    <svg width={width} height={height}>
      {yLabels.map((tick, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={tick.y}
            x2={width - padding.right}
            y2={tick.y}
            stroke="#eee"
            strokeWidth="1"
          />
          <text
            x={padding.left - 8}
            y={tick.y + 4}
            fontSize="10"
            fill="#999"
            textAnchor="end"
          >
            {tick.value}
          </text>
        </g>
      ))}

      <path
        d={pathD}
        fill="none"
        stroke="#3498DB"
        strokeWidth="2"
        style={{ transition: 'all 0.3s ease' }}
      />

      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          fill="#2E86C1"
          style={{ transition: 'all 0.3s ease' }}
        />
      ))}

      {data.map((d, i) => (
        <text
          key={i}
          x={padding.left + i * stepX}
          y={height - 10}
          fontSize="10"
          fill="#999"
          textAnchor="middle"
        >
          {d.date}
        </text>
      ))}
    </svg>
  )
}

const StatPanel: React.FC<StatPanelProps> = ({ feedbacks, isOpen, onToggle }) => {
  const stats = useMemo(() => calculateStats(feedbacks), [feedbacks])

  return (
    <>
      <button
        onClick={onToggle}
        style={{
          position: 'fixed',
          top: 20,
          right: isOpen ? 340 : 20,
          zIndex: 101,
          backgroundColor: '#3498DB',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '10px 16px',
          fontSize: 14,
          cursor: 'pointer',
          transition: 'right 0.4s ease, background-color 0.2s',
          boxShadow: '2px 2px 8px rgba(0,0,0,0.15)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#2E86C1'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#3498DB'
        }}
      >
        {isOpen ? '收起统计' : '统计分析'}
      </button>

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: isOpen ? 0 : -320,
          width: 320,
          height: '100vh',
          backgroundColor: '#F8F9FA',
          borderRadius: '12px 0 0 12px',
          boxShadow: '4px 4px 16px rgba(0,0,0,0.1)',
          zIndex: 100,
          transition: 'right 0.4s ease',
          overflowY: 'auto',
          padding: '70px 20px 20px'
        }}
        className="stat-panel"
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: '#333' }}>
          数据统计
        </h3>

        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: '#666' }}>
            各类型反馈数量
          </h4>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {(Object.keys(TYPE_COLORS) as FeedbackType[]).map(type => (
              <div key={type} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: TYPE_COLORS[type],
                    margin: '0 auto 6px'
                  }}
                />
                <div style={{ fontSize: 20, fontWeight: 600, color: '#333' }}>
                  {stats.typeCounts[type]}
                </div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                  {TYPE_LABELS[type]}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: '#666' }}>
            整体解决率
          </h4>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <RingProgress percent={stats.resolveRate} />
          </div>
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#999' }}>
            已解决 {stats.closedCount} / 总计 {stats.total}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: '#666' }}>
            平均处理时间
          </h4>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: '#27AE60' }}>
              {stats.avgProcessingTime.toFixed(1)}
            </span>
            <span style={{ fontSize: 14, color: '#999', marginLeft: 4 }}>天</span>
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: '#666' }}>
            近7天反馈趋势
          </h4>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <LineChart data={stats.last7Days} />
          </div>
        </div>
      </div>
    </>
  )
}

export default StatPanel
