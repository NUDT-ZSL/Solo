import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  baseHue: number
  hueOffset: number
  size: number
  baseSize: number
  sizePhase: number
  sizePeriod: number
  opacity: number
  life: number
  maxLife: number
}

interface EmotionParticleProps {
  hue: number
  saturation: number
  lightness: number
  intensity: number
  width?: number
  height?: number
  duration?: number
  onComplete?: () => void
  playKey?: number
}

export interface EmotionParticleHandle {
  replay: () => void
}

const EmotionParticle = forwardRef<EmotionParticleHandle, EmotionParticleProps>(({
  hue,
  saturation,
  lightness,
  intensity,
  width = 400,
  height = 200,
  duration = 0,
  onComplete,
  playKey = 0,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const runningRef = useRef<boolean>(false)

  const createParticles = (count: number): Particle[] => {
    const particles: Particle[] = []
    const cx = width / 2
    const cy = height / 2
    const radius = Math.min(width, height) * 0.35

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * radius
      const baseSize = 3 + Math.random() * 5
      particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        baseHue: hue,
        hueOffset: (Math.random() - 0.5) * 30,
        size: baseSize,
        baseSize,
        sizePhase: Math.random() * Math.PI * 2,
        sizePeriod: 2000 + Math.random() * 2000,
        opacity: 0,
        life: 0,
        maxLife: 5000 + Math.random() * 5000,
      })
    }
    return particles
  }

  const hsl = (h: number, s: number, l: number, a: number = 1) =>
    `hsla(${h}, ${s}%, ${l}%, ${a})`

  const render = (ctx: CanvasRenderingContext2D, time: number) => {
    ctx.clearRect(0, 0, width, height)

    const particles = particlesRef.current
    const toRemove: number[] = []

    particles.forEach((p, idx) => {
      const elapsed = time - startTimeRef.current

      p.vx += (Math.random() - 0.5) * 0.4
      p.vy += (Math.random() - 0.5) * 0.4
      p.vx *= 0.92
      p.vy *= 0.92
      p.x += p.vx
      p.y += p.vy

      const sizeT = (time % p.sizePeriod) / p.sizePeriod
      p.size = p.baseSize + Math.sin(sizeT * Math.PI * 2 + p.sizePhase) * 2.5

      p.life = elapsed

      let alpha: number
      const fadeIn = Math.min(1, elapsed / 500)
      if (duration > 0) {
        const fadeOut = Math.max(0, 1 - Math.max(0, elapsed - duration + 1000) / 1000)
        const edgeFactor = Math.min(
          p.x / (width * 0.2),
          (width - p.x) / (width * 0.2),
          p.y / (height * 0.2),
          (height - p.y) / (height * 0.2)
        )
        const edgeAlpha = 0.2 + Math.max(0, Math.min(1, edgeFactor)) * 0.7
        alpha = fadeIn * fadeOut * edgeAlpha
      } else {
        const edgeFactor = Math.min(
          p.x / (width * 0.2),
          (width - p.x) / (width * 0.2),
          p.y / (height * 0.2),
          (height - p.y) / (height * 0.2)
        )
        const edgeAlpha = 0.2 + Math.max(0, Math.min(1, edgeFactor)) * 0.7
        alpha = fadeIn * edgeAlpha
      }

      p.opacity = alpha

      const currentHue = p.baseHue + Math.sin(time / 800 + idx * 0.5) * 15 + p.hueOffset * 0.3
      const color = hsl(currentHue, saturation, lightness, alpha * 0.85)
      const glow = hsl(currentHue, saturation, lightness, alpha * 0.3)

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2)
      ctx.fillStyle = glow
      ctx.fill()

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()

      ctx.beginPath()
      ctx.arc(p.x - p.size * 0.25, p.y - p.size * 0.25, p.size * 0.35, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`
      ctx.fill()

      if (duration > 0 && elapsed >= duration) {
        toRemove.push(idx)
      }
    })

    if (toRemove.length > 0) {
      for (let i = toRemove.length - 1; i >= 0; i--) {
        particles.splice(toRemove[i], 1)
      }
    }
  }

  const start = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    const particleCount = Math.min(500, Math.max(20, intensity * 50))
    particlesRef.current = createParticles(particleCount)
    startTimeRef.current = performance.now()
    runningRef.current = true

    const loop = (time: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      render(ctx, time)

      if (duration > 0 && time - startTimeRef.current >= duration + 500) {
        runningRef.current = false
        if (onComplete) onComplete()
        return
      }

      if (runningRef.current) {
        animationRef.current = requestAnimationFrame(loop)
      }
    }

    animationRef.current = requestAnimationFrame(loop)
  }

  useImperativeHandle(ref, () => ({
    replay: () => {
      start()
    },
  }))

  useEffect(() => {
    start()
    return () => {
      runningRef.current = false
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        display: 'block',
        borderRadius: '12px',
        background: `linear-gradient(135deg, ${hsl(hue, saturation * 0.3, lightness * 0.4, 0.15)} 0%, ${hsl(hue, saturation * 0.2, 10, 0.3)} 100%)`,
      }}
    />
  )
})

EmotionParticle.displayName = 'EmotionParticle'

export default EmotionParticle
