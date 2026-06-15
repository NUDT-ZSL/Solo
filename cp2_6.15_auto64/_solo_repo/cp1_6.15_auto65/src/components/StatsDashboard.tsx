import { useEffect, useState, useMemo } from 'react'
import { Card, getCardsByLevel, getDailyNewCards, getTotalReviewCount } from '../utils/cards'

interface StatsDashboardProps {
  cards: Card[]
}

export default function StatsDashboard({ cards }: StatsDashboardProps) {
  const cardsByLevel = useMemo(() => getCardsByLevel(cards), [cards])
  const dailyNewCards = useMemo(() => getDailyNewCards(cards, 7), [cards])
  const totalReviewCount = useMemo(() => getTotalReviewCount(cards), [cards])

  const [animatedReviewCount, setAnimatedReviewCount] = useState(0)
  const [animatedBars, setAnimatedBars] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
  const [animatedLineData, setAnimatedLineData] = useState<number[]>(new Array(7).fill(0))

  const maxLevelCount = Math.max(...Object.values(cardsByLevel), 1)
  const maxDailyCount = Math.max(...dailyNewCards.map(d => d.count), 1)

  useEffect(() => {
    let current = 0
    const target = totalReviewCount
    const steps = 30
    const increment = target / steps
    const interval = setInterval(() => {
      current += increment
      if (current >= target) {
        current = target
        clearInterval(interval)
      }
      setAnimatedReviewCount(Math.round(current))
    }, 30)

    return () => clearInterval(interval)
  }, [totalReviewCount])

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedBars(cardsByLevel)
    }, 100)
    return () => clearTimeout(timer)
  }, [cardsByLevel])

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedLineData(dailyNewCards.map(d => d.count))
    }, 200)
    return () => clearTimeout(timer)
  }, [dailyNewCards])

  const getLevelColor = (level: number) => {
    if (level >= 4) return '#2ED573'
    if (level === 3) return '#FFA502'
    return '#FF4757'
  }

  const chartWidth = 560
  const chartHeight = 200
  const padding = { top: 20, right: 20, bottom: 30, left: 40 }
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom

  const points = animatedLineData.map((count, i) => {
    const x = padding.left + (i / (dailyNewCards.length - 1)) * innerWidth
    const y = padding.top + innerHeight - (count / maxDailyCount) * innerHeight
    return { x, y }
  })

  const linePath = points.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = points[i - 1]
    const cpx = (prev.x + p.x) / 2
    return `C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`
  }).join(' ')

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`

  return (
    <div style={{
    flex: 1,
    padding: 32,
    overflowY: 'auto',
    background: '#F8F9FA'
  }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ fontSize: 22, marginBottom: 24, color: '#2D3436' }}>📊 学习统计</h2>

        <div style={{
        background: '#5352ED',
        borderRadius: 8,
        padding: 24,
        marginBottom: 24,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
          <div>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>总复习次数</div>
            <div style={{ fontSize: 42, fontWeight: 'bold' }} className="count-animate">
              {animatedReviewCount.toLocaleString()}
            </div>
          </div>
          <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '50%',
          width: 80,
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 40
        }}>
            📝
          </div>
        </div>

        <div style={{
        background: 'white',
        border: '1px solid #E0E0E0',
        borderRadius: 8,
        padding: 24,
        marginBottom: 24
      }}>
          <h3 style={{ fontSize: 16, marginBottom: 20, color: '#2D3436' }}>记忆等级分布</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[5, 4, 3, 2, 1].map(level => {
              const count = animatedBars[level] || 0
              const percentage = (count / maxLevelCount) * 100
              return (
                <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                  width: 50,
                  fontSize: 13,
                  color: '#636E72',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                    {level}星
                    <span style={{ color: getLevelColor(level) }}>{'★'.repeat(level)}</span>
                  </div>
                  <div style={{
                  flex: 1,
                  height: 28,
                  background: '#F1F3F5',
                  borderRadius: 4,
                  overflow: 'hidden'
                }}>
                    <div style={{
                    height: '100%',
                    width: `${percentage}%`,
                    background: getLevelColor(level),
                    borderRadius: 4,
                    transition: 'width 0.6s ease-out',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: 8
                  }}>
                      {count > 0 && (
                        <span style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>{count}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ width: 40, textAlign: 'right', fontSize: 13, color: '#2D3436', fontWeight: 600 }}>
                    {count}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{
        background: 'white',
        border: '1px solid #E0E0E0',
        borderRadius: 8,
        padding: 24
      }}>
          <h3 style={{ fontSize: 16, marginBottom: 20, color: '#2D3436' }}>近7日新增卡片</h3>
          <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ maxWidth: '100%' }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1E90FF" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#1E90FF" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = padding.top + innerHeight * (1 - ratio)
              const value = Math.round(maxDailyCount * ratio)
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke="#F1F3F5"
                    strokeDasharray="4,4"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 4}
                    fontSize="10"
                    fill="#636E72"
                    textAnchor="end"
                  >
                    {value}
                  </text>
                </g>
              )
            })}

            <path
              d={areaPath}
              fill="url(#areaGradient)"
              style={{ transition: 'all 0.6s ease-out' }}
            />

            <path
              d={linePath}
              fill="none"
              stroke="#1E90FF"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ transition: 'all 0.6s ease-out' }}
            />

            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="white"
                  stroke="#1E90FF"
                  strokeWidth="2"
                  style={{ transition: 'all 0.6s ease-out' }}
                />
                <text
                  x={p.x}
                  y={chartHeight - 10}
                  fontSize="11"
                  fill="#636E72"
                  textAnchor="middle"
                >
                  {dailyNewCards[i].date}
                </text>
                {animatedLineData[i] > 0 && (
                  <text
                    x={p.x}
                    y={p.y - 10}
                    fontSize="11"
                    fill="#1E90FF"
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {animatedLineData[i]}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  )
}
