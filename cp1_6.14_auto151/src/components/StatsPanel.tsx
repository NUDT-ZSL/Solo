import { useEffect, useRef, useState } from 'react'

interface StatsPanelProps {
  totalWorks: number
  totalFavorites: number
  totalRevenue: number
}

function AnimatedNumber({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current) return
    hasAnimated.current = true

    const startTime = performance.now()
    const startValue = 0
    const endValue = target

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const value = Math.round(startValue + (endValue - startValue) * eased)
      setCurrent(value)
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [target, duration])

  return <span>{current.toLocaleString()}</span>
}

export default function StatsPanel({ totalWorks, totalFavorites, totalRevenue }: StatsPanelProps) {
  const stats = [
    { label: '作品总数', value: totalWorks, prefix: '' },
    { label: '被收藏总数', value: totalFavorites, prefix: '' },
    { label: '总销售额', value: totalRevenue, prefix: '¥' },
  ]

  return (
    <div style={{
      background: '#1e293b', borderRadius: 16, padding: 16, marginTop: 32,
      display: 'flex', gap: 16, flexWrap: 'wrap' as const,
    }}>
      {stats.map(s => (
        <div
          key={s.label}
          style={{
            width: 150, height: 80, borderRadius: 12,
            background: 'linear-gradient(135deg, #374151, #4b5563)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
          }}
        >
          <span style={{ fontSize: 24, color: '#fff', fontWeight: 700 }}>
            {s.prefix}<AnimatedNumber target={s.value} />
          </span>
          <span style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{s.label}</span>
        </div>
      ))}
    </div>
  )
}
