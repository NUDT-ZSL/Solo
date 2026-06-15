import { useEffect, useRef } from 'react'
import { WaveLayer, Theme } from '../types'
import { interpolateColor, withAlpha } from '../utils/color'

interface WaveSceneProps {
  theme: Theme
}

export function WaveScene({ theme }: WaveSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wavesRef = useRef<WaveLayer[]>([])
  const animationRef = useRef<number | null>(null)
  const isVisibleRef = useRef(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const colorStart = theme === 'dark' ? '#4fc3f7' : '#f97316'
    const colorEnd = theme === 'dark' ? '#0288d1' : '#fde68a'

    const createWaves = () => {
      const waves: WaveLayer[] = []
      const count = 6
      const heartRate = 60 + Math.random() * 20
      const seasonFactor = 0.8 + Math.random() * 0.4

      for (let i = 0; i < count; i++) {
        const t = i / count
        const color = interpolateColor(colorStart, colorEnd, t)
        waves.push({
          amplitude: (20 + i * 8) * seasonFactor,
          frequency: 0.005 + i * 0.001,
          speed: (0.02 + heartRate / 10000) * seasonFactor,
          phase: Math.random() * Math.PI * 2,
          color
        })
      }
      return waves
    }

    wavesRef.current = createWaves()

    const animate = () => {
      if (!isVisibleRef.current) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let index = 0; index < wavesRef.current.length; index++) {
        const wave = wavesRef.current[index]
        wave.phase += wave.speed

        ctx.beginPath()
        ctx.moveTo(0, canvas.height)

        for (let x = 0; x <= canvas.width; x += 2) {
          const y =
            canvas.height * (0.3 + index * 0.08) +
            Math.sin(x * wave.frequency + wave.phase) * wave.amplitude
          ctx.lineTo(x, y)
        }

        ctx.lineTo(canvas.width, canvas.height)
        ctx.closePath()

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
        gradient.addColorStop(0, withAlpha(wave.color, 0.375))
        gradient.addColorStop(1, withAlpha(wave.color, 0))
        ctx.fillStyle = gradient
        ctx.fill()

        ctx.beginPath()
        for (let x = 0; x <= canvas.width; x += 2) {
          const y =
            canvas.height * (0.3 + index * 0.08) +
            Math.sin(x * wave.frequency + wave.phase) * wave.amplitude
          if (x === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.strokeStyle = wave.color
        ctx.lineWidth = 2
        ctx.globalAlpha = 0.8
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden
      if (isVisibleRef.current && animationRef.current === null) {
        animate()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [theme])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
      }}
    />
  )
}
