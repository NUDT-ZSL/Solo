import React, { useMemo, useRef, useState } from 'react'
import type { MoodRecord } from './types'

interface Props {
  moods: MoodRecord[]
}

interface ChartPoint {
  date: string
  label: string
  dateKey: string
  value: number
  color: string
  x: number
  y: number
}

function formatDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const TrendChart: React.FC<Props> = ({ moods }) => {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null)
  const [dims, setDims] = useState({ w: 900, h: 180 })

  React.useEffect(() => {
    if (!wrapRef.current) return
    const el = wrapRef.current
    const update = () => {
      const rect = el.getBoundingClientRect()
      setDims({ w: Math.max(280, rect.width), h: rect.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const points: ChartPoint[] = useMemo(() => {
    const days: Date[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      days.push(d)
    }

    const paddingL = 40
    const paddingR = 24
    const paddingT = 24
    const paddingB = 32
    const innerW = dims.w - paddingL - paddingR
    const innerH = dims.h - paddingT - paddingB

    return days.map((d, i) => {
      const key = dateKey(d)
      const dayMoods = moods.filter((m) => dateKey(new Date(m.timestamp)) === key)
      let value = 0
      let label = '—'
      let color = '#D0D6E0'
      if (dayMoods.length > 0) {
        const avg = dayMoods.reduce((s, m) => s + m.score, 0) / dayMoods.length
        value = Math.round(avg * 10) / 10
        const latest = dayMoods[dayMoods.length - 1]
        label = latest.label
        color = latest.color
      }
      const x = paddingL + (innerW * i) / 6
      const y = paddingT + innerH - (value === 0 ? innerH * 0.5 : innerH * ((value - 1) / 9))
      return {
        date: formatDate(d),
        dateKey: key,
        label,
        value,
        color,
        x,
        y,
      }
    })
  }, [moods, dims])

  const paddingL = 40
  const paddingT = 24
  const paddingB = 32
  const innerH = dims.h - paddingT - paddingB

  const gradientId = 'line-grad'
  const areaId = 'area-grad'

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ')

  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(2)} ${paddingT + innerH} L ${points[0].x.toFixed(2)} ${paddingT + innerH} Z`

  const handleHover = (idx: number, e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    setHover({
      idx,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <div className="trend-chart-wrap">
      <div className="chart-title">📈 近7日情绪趋势</div>
      <div className="trend-chart" ref={wrapRef}>
        <svg width={dims.w} height={dims.h} viewBox={`0 0 ${dims.w} ${dims.h}`}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF6B8A" />
              <stop offset="100%" stopColor="#7C8CFF" />
            </linearGradient>
            <linearGradient id={areaId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7C8CFF" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#7C8CFF" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[2, 5, 8].map((v) => {
            const y = paddingT + innerH - (innerH * (v - 1)) / 9
            return (
              <g key={v}>
                <line
                  x1={paddingL - 6}
                  x2={dims.w - 16}
                  y1={y}
                  y2={y}
                  stroke="#E8ECF3"
                  strokeDasharray="3 4"
                />
                <text x={paddingL - 10} y={y + 4} fontSize="10" fill="#A0A8BA" textAnchor="end">
                  {v}
                </text>
              </g>
            )
          })}

          <path d={areaD} fill={`url(#${areaId})`} opacity="0.5" />
          <path
            d={pathD}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="11"
                fill={p.value === 0 ? '#E0E6ED' : p.color}
                opacity="0.18"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r="7"
                fill="white"
                stroke={p.value === 0 ? '#C5CBD6' : p.color}
                strokeWidth="2.5"
                style={{
                  filter:
                    p.value === 0 ? 'none' : `drop-shadow(0 0 4px ${p.color}cc)`,
                  cursor: p.value === 0 ? 'default' : 'pointer',
                }}
                onMouseEnter={(e) => p.value > 0 && handleHover(i, e)}
                onMouseMove={(e) => p.value > 0 && handleHover(i, e)}
                onMouseLeave={() => setHover(null)}
              />
              <text
                x={p.x}
                y={dims.h - paddingB + 18}
                fontSize="11"
                fill="#8890A4"
                textAnchor="middle"
              >
                {p.date}
              </text>
            </g>
          ))}
        </svg>

        {hover && points[hover.idx] && points[hover.idx].value > 0 && (
          <div
            className="chart-tooltip"
            style={{
              left: points[hover.idx].x,
              top: points[hover.idx].y,
            }}
          >
            <div><strong>{points[hover.idx].dateKey}</strong></div>
            <div>情绪：{points[hover.idx].label} · {points[hover.idx].value}分</div>
          </div>
        )}
      </div>
    </div>
  )
}
