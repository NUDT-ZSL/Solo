import { useMemo } from 'react'
import { getEmotionKeyword, getGradientColor } from '../utils/emotionAnalyzer'

interface MoodRecord {
  id: string
  date: string
  emotionResult: {
    dominantEmotion: string
    dominantColor: string
    emotions: Record<string, number>
  }
}

interface SidebarProps {
  records: MoodRecord[]
  currentDate: string
  onDateSelect: (date: string) => void
  isMobile: boolean
  user: { id: string; username: string } | null
}

export default function Sidebar({ records, currentDate, onDateSelect, isMobile, user }: SidebarProps) {
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => b.date.localeCompare(a.date))
  }, [records])

  const chartData = useMemo(() => {
    const last7Days: string[] = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      last7Days.push(d.toISOString().split('T')[0])
    }

    return last7Days.map((date) => {
      const record = records.find((r) => r.date === date)
      return {
        date,
        hasRecord: !!record,
        dominantColor: record?.emotionResult.dominantColor || '#888',
        intensity: record ? calculateOverallIntensity(record.emotionResult.emotions) : 0,
        emotions: record?.emotionResult.emotions || null,
      }
    })
  }, [records])

  const chartPath = useMemo(() => {
    const width = 240
    const height = 120
    const padding = 10
    const innerWidth = width - padding * 2
    const innerHeight = height - padding * 2
    const pointCount = chartData.length

    if (pointCount === 0) return ''

    const points = chartData.map((d, i) => {
      const x = padding + (innerWidth / (pointCount - 1)) * i
      const y = padding + innerHeight - d.intensity * innerHeight
      return { x, y, color: d.dominantColor }
    })

    let path = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const cpx = (prev.x + curr.x) / 2
      path += ` Q ${cpx} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2}`
      path += ` Q ${cpx} ${curr.y} ${curr.x} ${curr.y}`
    }

    return path
  }, [chartData])

  const gradientId = 'sidebar-line-gradient'

  function calculateOverallIntensity(emotions: Record<string, number>): number {
    const positive = (emotions.joy || 0) + (emotions.trust || 0) + (emotions.anticipation || 0)
    const negative = (emotions.sadness || 0) + (emotions.anger || 0) + (emotions.fear || 0)
    return Math.min(1, 0.3 + positive * 0.5 + negative * 0.2)
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr)
    const month = d.getMonth() + 1
    const day = d.getDate()
    return `${month}月${day}日`
  }

  function formatDayOfWeek(dateStr: string): string {
    const d = new Date(dateStr)
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return days[d.getDay()]
  }

  const isToday = (dateStr: string) => {
    return dateStr === new Date().toISOString().split('T')[0]
  }

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <h2 style={styles.title}>情绪调色盘</h2>
        {user && <span style={styles.username}>{user.username}</span>}
      </div>

      <div style={styles.chartSection}>
        <h3 style={styles.sectionTitle}>情绪趋势</h3>
        <div style={styles.chartContainer}>
          <svg width="100%" height="120" viewBox="0 0 240 120">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                {chartData.map((d, i) => (
                  <stop
                    key={i}
                    offset={`${(i / (chartData.length - 1)) * 100}%`}
                    stopColor={d.dominantColor}
                    stopOpacity={d.hasRecord ? 1 : 0.3}
                  />
                ))}
              </linearGradient>
            </defs>
            <path
              d={chartPath}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {chartData.map((d, i) => {
              const x = 10 + (220 / (chartData.length - 1)) * i
              const y = 10 + 100 - d.intensity * 100
              const isActive = d.date === currentDate
              return (
                <g key={d.date}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isActive ? 6 : 4}
                    fill={d.dominantColor}
                    stroke="white"
                    strokeWidth={isActive ? 2 : 1}
                    style={{
                      cursor: 'pointer',
                      transition: 'r 0.2s ease',
                      filter: isActive ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none',
                    }}
                    onClick={() => onDateSelect(d.date)}
                  />
                  <text
                    x={x}
                    y={115}
                    textAnchor="middle"
                    fontSize="10"
                    fill="rgba(255,255,255,0.6)"
                  >
                    {formatDayOfWeek(d.date).replace('周', '')}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      <div style={styles.dateListSection}>
        <h3 style={styles.sectionTitle}>日期记录</h3>
        <div style={styles.dateList}>
          {sortedRecords.length === 0 ? (
            <p style={styles.emptyText}>暂无记录</p>
          ) : (
            sortedRecords.map((record) => {
              const isSelected = record.date === currentDate
              return (
                <div
                  key={record.id}
                  style={{
                    ...styles.dateItem,
                    ...(isSelected ? styles.dateItemActive : {}),
                  }}
                  onClick={() => onDateSelect(record.date)}
                >
                  <div
                    style={{
                      ...styles.colorDot,
                      backgroundColor: record.emotionResult.dominantColor,
                    }}
                  />
                  <div style={styles.dateInfo}>
                    <span style={styles.dateText}>
                      {formatDate(record.date)}
                      {isToday(record.date) && (
                        <span style={styles.todayBadge}>今天</span>
                      )}
                    </span>
                    <span style={styles.emotionText}>
                      {getEmotionKeyword(record.emotionResult.dominantEmotion)}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '100%',
    height: '100%',
    padding: '20px 16px',
    background: 'rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRight: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '4px 0 20px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: 'white',
    margin: 0,
  },
  username: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  chartSection: {
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  chartContainer: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: '8px',
  },
  dateListSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  dateList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingRight: 4,
  },
  dateItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: 'rgba(255, 255, 255, 0.05)',
  },
  dateItemActive: {
    background: 'rgba(255, 255, 255, 0.15)',
    transform: 'translateX(2px)',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },
  dateInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  dateText: {
    fontSize: 14,
    color: 'white',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  todayBadge: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 8,
    background: 'rgba(181, 126, 220, 0.3)',
    color: '#B57EDC',
    fontWeight: 600,
  },
  emotionText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    padding: '20px 0',
  },
}
