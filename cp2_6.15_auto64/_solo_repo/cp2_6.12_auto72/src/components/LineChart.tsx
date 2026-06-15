import { useRef, useEffect, useState, useCallback } from 'react'
import { drawLineChart } from '@/utils/chartUtils'
import type { TrendDataPoint } from '@/types'

interface LineChartProps {
  data: TrendDataPoint[]
  width?: number
  height?: number
  title?: string
}

const LineChart = ({ data, width = 600, height = 300, title }: LineChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [pointPositions, setPointPositions] = useState<{ x: number; y: number; data: TrendDataPoint }[]>([])
  const animationRef = useRef<number>()

  useEffect(() => {
    const duration = 800
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const currentProgress = Math.min(elapsed / duration, 1)

      const easeOutQuart = 1 - Math.pow(1 - currentProgress, 4)
      setProgress(easeOutQuart)

      if (currentProgress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    const result = drawLineChart(ctx, data, { width, height }, progress, hoverIndex)
    setPointPositions(result.pointPositions)
  }, [data, width, height, progress, hoverIndex])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      let nearestIndex: number | null = null
      let nearestDistance = 20

      pointPositions.forEach((point, index) => {
        const distance = Math.sqrt(
          Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2)
        )
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestIndex = index
        }
      })

      setHoverIndex(nearestIndex)

      if (nearestIndex !== null) {
        setTooltipPos({
          x: e.clientX + 15,
          y: e.clientY - 10
        })
      }
    },
    [pointPositions]
  )

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null)
  }, [])

  return (
    <div ref={containerRef} className="line-chart-container">
      {title && <h3 className="dashboard-section-title">{title}</h3>}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'pointer', maxWidth: '100%', height: 'auto' }}
      />
      {hoverIndex !== null && pointPositions[hoverIndex] && (
        <div
          className="chart-tooltip visible"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y
          }}
        >
          <div className="chart-tooltip-value">{pointPositions[hoverIndex].data.value}%</div>
          <div>{pointPositions[hoverIndex].data.date}</div>
        </div>
      )}
    </div>
  )
}

export default LineChart
