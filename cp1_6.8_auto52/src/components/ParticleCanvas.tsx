import { useEffect, useRef, useCallback } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

interface ParticleCanvasProps {
  particles: Particle[]
  onDone?: () => void
}

const COLOR_MAP: Record<string, string> = {
  'warm-yellow': '#fbbf24',
  'cyan-green': '#34d399',
  'light-blue': '#60a5fa',
}

export function spawnBurstParticles(
  x: number,
  y: number,
  color: string,
  count: number = 24
): Particle[] {
  const baseColor = COLOR_MAP[color] || '#fbbf24'
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
    const speed = 2 + Math.random() * 4
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 0.6 + Math.random() * 0.4,
      color: baseColor,
      size: 2 + Math.random() * 3,
    })
  }
  return particles
}

export function spawnShatterParticles(
  x: number,
  y: number,
  color: string,
  count: number = 40
): Particle[] {
  const colors = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa']
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 6
    particles.push({
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 40,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1,
      maxLife: 0.8 + Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 5,
    })
  }
  return particles
}

export default function ParticleCanvas({ particles, onDone }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>(particles)
  const onDoneRef = useRef(onDone)

  onDoneRef.current = onDone

  useEffect(() => {
    particlesRef.current = particles
  }, [particles])

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const pts = particlesRef.current
    if (pts.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      onDoneRef.current?.()
      return
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    let alive = false
    for (const p of pts) {
      if (p.life <= 0) continue
      alive = true
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.08
      p.vx *= 0.99
      p.life -= 1 / 60 / p.maxLife

      const alpha = Math.max(0, p.life)
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.globalAlpha = alpha * 0.9
      ctx.fill()

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * alpha * 1.8, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.globalAlpha = alpha * 0.15
      ctx.fill()
    }

    ctx.globalAlpha = 1

    if (!alive) {
      onDoneRef.current?.()
      return
    }

    animRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    if (particles.length > 0) {
      cancelAnimationFrame(animRef.current)
      animRef.current = requestAnimationFrame(animate)
    }
    return () => cancelAnimationFrame(animRef.current)
  }, [particles, animate])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 100 }}
    />
  )
}
