import { useEffect, useRef, useState } from 'react'
import { NutritionData } from '../types'

interface NutritionChartProps {
  data: NutritionData
}

interface Slice {
  key: string
  label: string
  value: number
  colorStart: string
  colorEnd: string
  glowColor: string
}

const NUTRIENT_COLORS: Record<string, { colorStart: string; colorEnd: string; glowColor: string }> = {
  protein: { colorStart: '#FF6B6B', colorEnd: '#EE5A5A', glowColor: 'rgba(255, 107, 107, 0.6)' },
  fat: { colorStart: '#FFD93D', colorEnd: '#F5C800', glowColor: 'rgba(255, 217, 61, 0.6)' },
  carbs: { colorStart: '#6BCB77', colorEnd: '#4CAF50', glowColor: 'rgba(107, 203, 119, 0.6)' }
}

const ANIMATION_DURATION = 300
const CANVAS_SIZE = 280

export default function NutritionChart({ data }: NutritionChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const [rotation, setRotation] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const lastAngleRef = useRef(0)
  const currentSlicesRef = useRef<number[]>([0, 0, 0])
  const targetSlicesRef = useRef<number[]>([0, 0, 0])
  const scaleRef = useRef(1)
  const animationStartTimeRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = CANVAS_SIZE * dpr
    canvas.height = CANVAS_SIZE * dpr
    canvas.style.width = `${CANVAS_SIZE}px`
    canvas.style.height = `${CANVAS_SIZE}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    const slices: Slice[] = [
      { key: 'protein', label: '蛋白质', value: data.proteinPercent, ...NUTRIENT_COLORS.protein },
      { key: 'fat', label: '脂肪', value: data.fatPercent, ...NUTRIENT_COLORS.fat },
      { key: 'carbs', label: '碳水', value: data.carbsPercent, ...NUTRIENT_COLORS.carbs }
    ]

    const total = slices.reduce((s, item) => s + item.value, 0)
    const normalized = total > 0 ? slices.map(s => s.value / total * 100) : [0, 0, 0]

    targetSlicesRef.current = normalized
    animationStartTimeRef.current = performance.now()
    scaleRef.current = 0.92

    animate(ctx, slices)
  }, [data])

  const animate = (ctx: CanvasRenderingContext2D, slices: Slice[]) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    const draw = (now: number) => {
      const elapsed = now - animationStartTimeRef.current
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1)
      const easeProgress = easeOutCubic(progress)

      const interpolated = currentSlicesRef.current.map((curr, i) => {
        const target = targetSlicesRef.current[i]
        return curr + (target - curr) * easeProgress
      })
      currentSlicesRef.current = interpolated

      scaleRef.current = 0.92 + 0.08 * easeProgress

      drawChart(ctx, slices, interpolated, rotation, scaleRef.current)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(draw)
      }
    }

    animationRef.current = requestAnimationFrame(draw)
  }

  const drawChart = (
    ctx: CanvasRenderingContext2D,
    slices: Slice[],
    values: number[],
    rot: number,
    scale: number
  ) => {
    const cx = CANVAS_SIZE / 2
    const cy = CANVAS_SIZE / 2
    const outerRadius = (CANVAS_SIZE / 2 - 20) * scale
    const innerRadius = outerRadius * 0.45

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    const bgGradient = ctx.createRadialGradient(cx, cy, innerRadius * 0.8, cx, cy, outerRadius * 1.1)
    bgGradient.addColorStop(0, 'rgba(255, 248, 240, 0.8)')
    bgGradient.addColorStop(1, 'rgba(255, 248, 240, 0.2)')
    ctx.fillStyle = bgGradient
    ctx.beginPath()
    ctx.arc(cx, cy, outerRadius + 8, 0, Math.PI * 2)
    ctx.fill()

    const total = values.reduce((s, v) => s + v, 0)

    if (total === 0) {
      ctx.strokeStyle = 'rgba(232, 133, 93, 0.3)'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.arc(cx, cy, (outerRadius + innerRadius) / 2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = 'rgba(109, 76, 65, 0.5)'
      ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('暂无数据', cx, cy)
      return
    }

    let startAngle = rot * (Math.PI / 180) - Math.PI / 2

    slices.forEach((slice, i) => {
      const value = values[i]
      if (value <= 0.01) return

      const percent = value / total
      const sweep = percent * Math.PI * 2
      const endAngle = startAngle + sweep

      const gradient = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, outerRadius)
      gradient.addColorStop(0, slice.colorStart)
      gradient.addColorStop(1, slice.colorEnd)

      ctx.save()
      ctx.shadowColor = slice.glowColor
      ctx.shadowBlur = 12
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      ctx.beginPath()
      ctx.arc(cx, cy, outerRadius, startAngle, endAngle)
      ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true)
      ctx.closePath()
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.restore()

      ctx.save()
      ctx.strokeStyle = `rgba(255, 255, 255, 0.9)`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(cx, cy, outerRadius, startAngle, endAngle)
      ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true)
      ctx.closePath()
      ctx.stroke()
      ctx.restore()

      if (percent > 0.08) {
        const midAngle = startAngle + sweep / 2
        const labelRadius = (outerRadius + innerRadius) / 2
        const lx = cx + Math.cos(midAngle) * labelRadius
        const ly = cy + Math.sin(midAngle) * labelRadius

        ctx.save()
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
        ctx.shadowBlur = 2
        ctx.fillText(`${value.toFixed(0)}%`, lx, ly)
        ctx.restore()
      }

      startAngle = endAngle
    })

    const centerGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerRadius)
    centerGradient.addColorStop(0, '#FFFFFF')
    centerGradient.addColorStop(1, '#FFF8F0')
    ctx.fillStyle = centerGradient
    ctx.beginPath()
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(232, 133, 93, 0.2)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = CANVAS_SIZE * dpr
    canvas.height = CANVAS_SIZE * dpr
    canvas.style.width = `${CANVAS_SIZE}px`
    canvas.style.height = `${CANVAS_SIZE}px`
    ctx.scale(dpr, dpr)

    const slices: Slice[] = [
      { key: 'protein', label: '蛋白质', value: data.proteinPercent, ...NUTRIENT_COLORS.protein },
      { key: 'fat', label: '脂肪', value: data.fatPercent, ...NUTRIENT_COLORS.fat },
      { key: 'carbs', label: '碳水', value: data.carbsPercent, ...NUTRIENT_COLORS.carbs }
    ]
    drawChart(ctx, slices, currentSlicesRef.current, rotation, scaleRef.current)
  }, [rotation, data])

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = CANVAS_SIZE / 2
    const cy = CANVAS_SIZE / 2
    const x = (e.clientX - rect.left) * (CANVAS_SIZE / rect.width) - cx
    const y = (e.clientY - rect.top) * (CANVAS_SIZE / rect.height) - cy
    lastAngleRef.current = Math.atan2(y, x) * (180 / Math.PI)
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = CANVAS_SIZE / 2
    const cy = CANVAS_SIZE / 2
    const x = (e.clientX - rect.left) * (CANVAS_SIZE / rect.width) - cx
    const y = (e.clientY - rect.top) * (CANVAS_SIZE / rect.height) - cy
    const angle = Math.atan2(y, x) * (180 / Math.PI)
    const delta = angle - lastAngleRef.current
    setRotation(prev => prev + delta)
    lastAngleRef.current = angle
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches[0]
    const cx = CANVAS_SIZE / 2
    const cy = CANVAS_SIZE / 2
    const x = (touch.clientX - rect.left) * (CANVAS_SIZE / rect.width) - cx
    const y = (touch.clientY - rect.top) * (CANVAS_SIZE / rect.height) - cy
    lastAngleRef.current = Math.atan2(y, x) * (180 / Math.PI)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches[0]
    const cx = CANVAS_SIZE / 2
    const cy = CANVAS_SIZE / 2
    const x = (touch.clientX - rect.left) * (CANVAS_SIZE / rect.width) - cx
    const y = (touch.clientY - rect.top) * (CANVAS_SIZE / rect.height) - cy
    const angle = Math.atan2(y, x) * (180 / Math.PI)
    const delta = angle - lastAngleRef.current
    setRotation(prev => prev + delta)
    lastAngleRef.current = angle
  }

  const legendItems = [
    { key: 'protein', label: '蛋白质', grams: data.protein, percent: data.proteinPercent, colors: NUTRIENT_COLORS.protein },
    { key: 'fat', label: '脂肪', grams: data.fat, percent: data.fatPercent, colors: NUTRIENT_COLORS.fat },
    { key: 'carbs', label: '碳水化合物', grams: data.carbs, percent: data.carbsPercent, colors: NUTRIENT_COLORS.carbs }
  ]

  return (
    <>
      <div className="calories-display">
        <div className="calories-value">{Math.round(data.totalCalories)}</div>
        <div className="calories-label">总热量 (kcal)</div>
      </div>

      <div className="chart-container">
        <div className="chart-halo"></div>
        <canvas
          ref={canvasRef}
          className="nutrition-chart"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        />
      </div>

      <div className="nutrition-legend">
        {legendItems.map(item => (
          <div key={item.key} className="legend-item">
            <div className="legend-label">
              <span
                className="legend-color"
                style={{
                  background: `linear-gradient(135deg, ${item.colors.colorStart}, ${item.colors.colorEnd})`
                }}
              ></span>
              {item.label}
            </div>
            <div className="legend-value">
              <span>{item.grams.toFixed(1)}g</span>
              <span className="legend-percent">{item.percent.toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}
