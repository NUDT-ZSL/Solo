import { useMemo } from 'react'
import type { BadgeColors } from '@/utils/audioAnalysis'

interface EchoBadgeProps {
  badge: BadgeColors
  size?: number
  spinning?: boolean
}

export default function EchoBadge({ badge, size = 160, spinning = true }: EchoBadgeProps) {
  const conicGradient = useMemo(() => {
    const stops = badge.gradientStops
      .map((color, i, arr) => {
        const percent = (i / (arr.length - 1)) * 100
        return `${color} ${percent}%`
      })
      .join(', ')
    return `conic-gradient(${stops})`
  }, [badge.gradientStops])

  const particles = useMemo(() => {
    const items = []
    const radius = size / 2 + 10
    const center = size / 2 + 10
    for (let i = 0; i < badge.particleCount; i++) {
      const angle = (i / badge.particleCount) * Math.PI * 2 - Math.PI / 2
      const x = center + radius * Math.cos(angle)
      const y = center + radius * Math.sin(angle)
      const delay = (i / badge.particleCount) * 3
      const dotSize = 3 + Math.sin(i * 1.7) * 1.2
      items.push({ x, y, delay, dotSize, key: i })
    }
    return items
  }, [badge.particleCount, size])

  const containerSize = size + 20

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: containerSize, height: containerSize }}
    >
      <div
        className={spinning ? 'animate-spin' : undefined}
        style={{
          animationDuration: spinning ? '8s' : undefined,
          animationTimingFunction: 'linear',
          animationIterationCount: spinning ? 'infinite' : undefined,
          width: containerSize,
          height: containerSize,
          position: 'relative',
        }}
      >
        <div
          className="absolute rounded-full"
          style={{
            width: size,
            height: size,
            top: 10,
            left: 10,
            background: conicGradient,
            boxShadow: '0 0 24px 4px rgba(255,255,255,0.08)',
          }}
        />
        {particles.map((p) => (
          <span
            key={p.key}
            className="absolute rounded-full animate-pulse"
            style={{
              width: p.dotSize,
              height: p.dotSize,
              left: p.x - p.dotSize / 2,
              top: p.y - p.dotSize / 2,
              background: 'rgba(255,255,255,0.85)',
              filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.6))',
              animationDelay: `${p.delay}s`,
              animationDuration: '2.4s',
            }}
          />
        ))}
      </div>
    </div>
  )
}
