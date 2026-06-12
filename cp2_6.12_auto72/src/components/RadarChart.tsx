import { useRef, useEffect, useState } from 'react'
import { drawRadarChart } from '@/utils/chartUtils'
import type { StyleMetrics } from '@/types'

interface RadarChartProps {
  metrics: StyleMetrics
  size?: number
}

const RadarChart = ({ metrics, size = 320 }: RadarChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [progress, setProgress] = useState(0)
  const animationRef = useRef<number>()

  useEffect(() => {
    const duration = 600
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
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    drawRadarChart(ctx, metrics, { size }, progress)
  }, [metrics, size, progress])

  return (
    <div className="radar-chart-container">
      <canvas ref={canvasRef} />
    </div>
  )
}

export default RadarChart
