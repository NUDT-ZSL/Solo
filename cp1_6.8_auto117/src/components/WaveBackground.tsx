import { useRef, useEffect, useCallback } from 'react'
import type { EmotionTag } from '@/types'
import WaveEngine from '@/WaveEngine'

interface WaveBackgroundProps {
  emotions: EmotionTag[]
}

export default function WaveBackground({ emotions }: WaveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const timeRef = useRef<number>(0)

  const animate = useCallback(() => {
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

    ctx.clearRect(0, 0, rect.width, rect.height)

    const isMobile = rect.width < 768
    WaveEngine.renderWaves(ctx, rect.width, rect.height, timeRef.current, emotions, isMobile)

    timeRef.current += 1 / 60
    animFrameRef.current = requestAnimationFrame(animate)
  }, [emotions])

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(animate)
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [animate])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
