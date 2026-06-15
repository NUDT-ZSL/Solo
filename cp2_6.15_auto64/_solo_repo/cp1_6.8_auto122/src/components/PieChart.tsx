import { useRef, useEffect, useCallback } from 'react'
import { WEATHER_CONFIG, WEATHER_TYPES } from '../MoodEngine'
import type { MoodStats, WeatherType } from '../MoodEngine'
import { useMoodStore } from '../store'

interface Props {
  stats: MoodStats
}

const PIE_COLORS = WEATHER_TYPES.map(w => WEATHER_CONFIG[w].color)

export default function PieChart({ stats }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { filterWeather, setFilterWeather } = useMoodStore()
  const hoverRef = useRef<WeatherType | null>(null)

  const total = WEATHER_TYPES.reduce((sum, w) => sum + stats[w], 0)

  const draw = useCallback((progress: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 200
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, size, size)

    if (total === 0) {
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, 70, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      ctx.fill()
      ctx.font = '13px "Noto Sans SC", sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('暂无数据', size / 2, size / 2)
      return
    }

    const cx = size / 2
    const cy = size / 2
    const radius = 70
    const eased = 1 - Math.pow(1 - Math.min(1, progress), 3)

    let startAngle = -Math.PI / 2

    WEATHER_TYPES.forEach((w, i) => {
      const value = stats[w]
      if (value === 0) return
      const sliceAngle = (value / total) * Math.PI * 2 * eased
      const endAngle = startAngle + sliceAngle
      const isHovered = hoverRef.current === w
      const isSelected = filterWeather === w
      const offset = (isHovered || isSelected) ? 6 : 0
      const midAngle = startAngle + sliceAngle / 2
      const ox = Math.cos(midAngle) * offset
      const oy = Math.sin(midAngle) * offset

      ctx.beginPath()
      ctx.moveTo(cx + ox, cy + oy)
      ctx.arc(cx + ox, cy + oy, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = PIE_COLORS[i]
      ctx.globalAlpha = isHovered || isSelected ? 1 : 0.8
      ctx.fill()

      ctx.strokeStyle = 'rgba(26,26,46,0.5)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.globalAlpha = 1

      if (sliceAngle > 0.3) {
        const labelRadius = radius * 0.65
        const lx = cx + ox + Math.cos(midAngle) * labelRadius
        const ly = cy + oy + Math.sin(midAngle) * labelRadius
        ctx.font = '11px "Noto Sans SC", sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(WEATHER_CONFIG[w].emoji, lx, ly - 7)
        ctx.font = '10px "Noto Sans SC", sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.fillText(`${value}次`, lx, ly + 8)
      }

      startAngle = endAngle
    })
  }, [stats, total, filterWeather])

  useEffect(() => {
    let progress = 0
    let frame: number
    const animate = () => {
      progress += 0.03
      if (progress > 1.2) progress = 1.2
      draw(progress)
      if (progress < 1.2) {
        frame = requestAnimationFrame(animate)
      }
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [draw])

  const getSliceAtPoint = (x: number, y: number): WeatherType | null => {
    const cx = 100, cy = 100, radius = 70
    const dx = x - cx, dy = y - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > radius + 10 || dist < 20) return null

    let angle = Math.atan2(dy, dx) + Math.PI / 2
    if (angle < 0) angle += Math.PI * 2

    let cumAngle = 0
    for (const w of WEATHER_TYPES) {
      const value = stats[w]
      if (value === 0) continue
      const sliceAngle = (value / total) * Math.PI * 2
      cumAngle += sliceAngle
      if (angle <= cumAngle) return w
    }
    return null
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const w = getSliceAtPoint(x, y)
    hoverRef.current = w
    canvas.style.cursor = w ? 'pointer' : 'default'
    draw(1.2)
  }

  const handleMouseLeave = () => {
    hoverRef.current = null
    draw(1.2)
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const w = getSliceAtPoint(x, y)
    if (w) setFilterWeather(w)
  }

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-sm font-medium text-white/60 mb-3">心情统计</h3>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
      {filterWeather && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-white/40">
            筛选: {WEATHER_CONFIG[filterWeather].emoji} {WEATHER_CONFIG[filterWeather].label}
          </span>
          <button
            onClick={() => setFilterWeather(filterWeather)}
            className="text-xs text-purple-400 hover:text-purple-300"
          >
            清除
          </button>
        </div>
      )}
    </div>
  )
}
