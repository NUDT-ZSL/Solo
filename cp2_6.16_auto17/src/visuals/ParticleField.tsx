import { useEffect, useRef } from 'react'
import { Particle, Theme } from '../types'
import { interpolateColor, withAlpha } from '../utils/color'
import { createFPSMonitor } from '../utils/fpsMonitor'

interface ParticleFieldProps {
  theme: Theme
}

interface ParticlePool {
  pool: Particle[]
  activeCount: number
}

const HIGH_END_PARTICLES = 80
const MID_END_PARTICLES = 50
const LOW_END_PARTICLES = 30

function detectDeviceTier(): 'high' | 'mid' | 'low' {
  const dpr = window.devicePixelRatio || 1
  const cores = navigator.hardwareConcurrency || 4

  if (dpr <= 1 || cores <= 2) {
    return 'low'
  }
  if (dpr >= 2 && cores >= 6) {
    return 'high'
  }
  return 'mid'
}

function getParticleCount(tier: 'high' | 'mid' | 'low'): number {
  switch (tier) {
    case 'high':
      return HIGH_END_PARTICLES
    case 'mid':
      return MID_END_PARTICLES
    case 'low':
      return LOW_END_PARTICLES
  }
}

function createParticle(canvas: HTMLCanvasElement, colorStart: string, colorEnd: string, index: number, total: number): Particle {
  const t = index / total
  const color = interpolateColor(colorStart, colorEnd, t)
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    radius: 2 + Math.random() * 2,
    color,
    angle: Math.random() * Math.PI * 2,
    rotationSpeed: 0.5 * (Math.PI / 180)
  }
}

function createParticlePool(canvas: HTMLCanvasElement, colorStart: string, colorEnd: string, count: number): ParticlePool {
  const pool: Particle[] = []
  for (let i = 0; i < count; i++) {
    pool.push(createParticle(canvas, colorStart, colorEnd, i, count))
  }
  return { pool, activeCount: count }
}

function resetParticle(particle: Particle, canvas: HTMLCanvasElement, colorStart: string, colorEnd: string, index: number, total: number): void {
  const t = index / total
  const color = interpolateColor(colorStart, colorEnd, t)
  particle.x = Math.random() * canvas.width
  particle.y = Math.random() * canvas.height
  particle.vx = (Math.random() - 0.5) * 0.5
  particle.vy = (Math.random() - 0.5) * 0.5
  particle.radius = 2 + Math.random() * 2
  particle.color = color
  particle.angle = Math.random() * Math.PI * 2
  particle.rotationSpeed = 0.5 * (Math.PI / 180)
}

function updateParticlePool(
  pool: ParticlePool,
  canvas: HTMLCanvasElement,
  colorStart: string,
  colorEnd: string,
  newCount: number
): void {
  const { pool: particles } = pool

  while (particles.length < newCount) {
    particles.push(createParticle(canvas, colorStart, colorEnd, particles.length, newCount))
  }

  pool.activeCount = newCount

  for (let i = 0; i < newCount; i++) {
    if (!particles[i].color.startsWith('rgb')) {
      resetParticle(particles[i], canvas, colorStart, colorEnd, i, newCount)
    }
  }
}

export function ParticleField({ theme }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlePoolRef = useRef<ParticlePool | null>(null)
  const animationRef = useRef<number | null>(null)
  const isVisibleRef = useRef(true)
  const fpsMonitorRef = useRef(createFPSMonitor())
  const deviceTierRef = useRef(detectDeviceTier())
  const hasReducedRef = useRef(false)

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

    const colorStart = theme === 'dark' ? '#c471ed' : '#f97316'
    const colorEnd = theme === 'dark' ? '#f7797d' : '#fde68a'

    const initialCount = getParticleCount(deviceTierRef.current)
    particlePoolRef.current = createParticlePool(canvas, colorStart, colorEnd, initialCount)

    let centerX = canvas.width / 2
    let centerY = canvas.height / 2

    const animate = () => {
      if (!isVisibleRef.current) {
        animationRef.current = null
        return
      }

      const fps = fpsMonitorRef.current.checkFPS()
      if (fps !== null && fpsMonitorRef.current.isLowPerf() && !hasReducedRef.current) {
        hasReducedRef.current = true
        const currentCount = particlePoolRef.current?.activeCount || initialCount
        const reducedCount = Math.max(LOW_END_PARTICLES, Math.floor(currentCount * 0.6))
        if (particlePoolRef.current) {
          updateParticlePool(particlePoolRef.current, canvas, colorStart, colorEnd, reducedCount)
        }
        console.warn(`[ParticleField] Reduced particle count to ${reducedCount} due to low FPS`)
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const pool = particlePoolRef.current
      if (!pool) return

      const { pool: particles, activeCount } = pool

      for (let i = 0; i < activeCount; i++) {
        const p = particles[i]
        const dx = p.x - centerX
        const dy = p.y - centerY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const angle = Math.atan2(dy, dx) + p.rotationSpeed
        p.angle = angle
        p.x = centerX + Math.cos(angle) * dist + p.vx
        p.y = centerY + Math.sin(angle) * dist + p.vy

        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 1000 + i * 0.1) * 0.4
        ctx.fill()
        ctx.globalAlpha = 1

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3)
        gradient.addColorStop(0, withAlpha(p.color, 0.25))
        gradient.addColorStop(1, withAlpha(p.color, 0))
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    const handleVisibilityChange = () => {
      const wasVisible = isVisibleRef.current
      isVisibleRef.current = !document.hidden

      if (isVisibleRef.current && !wasVisible && animationRef.current === null) {
        animate()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    if (isVisibleRef.current) {
      animate()
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
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
