import { useRef, useEffect, useCallback } from 'react'
import { usePlayerStore } from '@/store/playerStore'

interface VisualizerProps {
  getFrequencyData: () => Uint8Array
}

const BAR_COUNT = 64
const SMOOTHING_FACTOR = 0.15
const TARGET_FPS = 60
const FRAME_INTERVAL = 1000 / TARGET_FPS

function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t
  return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1
}

export default function Visualizer({ getFrequencyData }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const smoothedHeightsRef = useRef<Float32Array>(new Float32Array(BAR_COUNT))
  const targetHeightsRef = useRef<Float32Array>(new Float32Array(BAR_COUNT))
  const frameCountRef = useRef(0)
  const lastDrawTimeRef = useRef(0)
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  const draw = useCallback(() => {
    const now = performance.now()
    frameCountRef.current++

    if (now - lastDrawTimeRef.current >= FRAME_INTERVAL) {
      lastDrawTimeRef.current = now - (now % FRAME_INTERVAL)

      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        ctx.scale(dpr, dpr)
      }

      const width = rect.width
      const height = rect.height
      ctx.clearRect(0, 0, width, height)

      const frequencyData = getFrequencyData()
      const barWidth = width / BAR_COUNT
      const gap = 2

      for (let i = 0; i < BAR_COUNT; i++) {
        const raw = frequencyData[i] / 255
        const targetHeight = isPlaying ? raw * height * 0.9 : 0
        targetHeightsRef.current[i] = targetHeight

        const diff = targetHeightsRef.current[i] - smoothedHeightsRef.current[i]
        smoothedHeightsRef.current[i] += diff * (diff > 0 ? 0.3 : SMOOTHING_FACTOR)

        const easedHeight = easeOutElastic(Math.min(1, smoothedHeightsRef.current[i] / (height * 0.9)))
        const barHeight = isPlaying ? easedHeight * smoothedHeightsRef.current[i] : smoothedHeightsRef.current[i]

        const x = i * barWidth
        const y = height - barHeight

        const gradient = ctx.createLinearGradient(x, height, x, y)
        gradient.addColorStop(0, '#00d4ff')
        gradient.addColorStop(0.5, '#a855f7')
        gradient.addColorStop(1, '#ff3366')

        ctx.fillStyle = gradient
        ctx.beginPath()
        const radius = Math.min(3, (barWidth - gap) / 2)
        const bw = barWidth - gap
        if (barHeight > radius * 2) {
          ctx.moveTo(x, height)
          ctx.lineTo(x, y + radius)
          ctx.quadraticCurveTo(x, y, x + radius, y)
          ctx.lineTo(x + bw - radius, y)
          ctx.quadraticCurveTo(x + bw, y, x + bw, y + radius)
          ctx.lineTo(x + bw, height)
        } else if (barHeight > 0) {
          ctx.rect(x, y, bw, barHeight)
        }
        ctx.fill()

        ctx.shadowColor = '#00d4ff'
        ctx.shadowBlur = barHeight > height * 0.6 ? 8 : 0
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    rafRef.current = requestAnimationFrame(draw)
  }, [getFrequencyData, isPlaying])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      className="visualizer-canvas"
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
