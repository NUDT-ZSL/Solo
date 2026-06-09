import React, { useEffect, useRef } from 'react'
import { HSL, hslToCssString, clamp } from './utils/color'

export interface ParticleBurstRequest {
  id: number
  source: 'wheel' | 'preset'
  x: number
  y: number
  hsl: HSL
  count?: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  hsl: HSL
  trail: { x: number; y: number }[]
}

interface Star {
  x: number
  y: number
  size: number
  phase: number
  period: number
  baseAlpha: number
}

interface Props {
  currentHsl: HSL
  bursts: ParticleBurstRequest[]
  colorDisplayPos: { x: number; y: number; w: number; h: number } | null
  wheelsPos: Array<{ x: number; y: number; angle: number }> | null
}

const MAX_PARTICLES = 200
const STAR_COUNT = 50
const WHEEL_RADIUS = 50

export default function ParticleEffect({ currentHsl, bursts, colorDisplayPos, wheelsPos }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const starsRef = useRef<Star[]>([])
  const processedBurstsRef = useRef<Set<number>>(new Set())
  const startTimeRef = useRef<number>(performance.now())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    if (starsRef.current.length === 0) {
      for (let i = 0; i < STAR_COUNT; i++) {
        starsRef.current.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          size: 1 + Math.random(),
          phase: Math.random() * Math.PI * 2,
          period: 3000 + Math.random() * 2000,
          baseAlpha: 0.1 + Math.random() * 0.2
        })
      }
    }

    let rafId = 0
    let lastTs = performance.now()

    const spawnWheelBurst = (x: number, y: number, hsl: HSL, count = 12) => {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2
        const particleHsl: HSL = {
          h: (hsl.h + (Math.random() - 0.5) * 20 + 360) % 360,
          s: clamp(hsl.s + (Math.random() - 0.5) * 30, 0, 100),
          l: clamp(hsl.l + (Math.random() - 0.5) * 20, 0, 100)
        }
        const speed = 60 + Math.random() * 40
        const px = x + Math.cos(angle) * WHEEL_RADIUS
        const py = y + Math.sin(angle) * WHEEL_RADIUS
        particlesRef.current.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 2000,
          maxLife: 2000,
          size: 3 + Math.random() * 3,
          color: hslToCssString(particleHsl, 0.9),
          hsl: particleHsl,
          trail: []
        })
      }
      while (particlesRef.current.length > MAX_PARTICLES) {
        particlesRef.current.shift()
      }
    }

    const spawnPresetBurst = (x: number, y: number, hsl: HSL, count = 20) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 30 + Math.random() * 60
        const particleHsl: HSL = {
          h: (hsl.h + (Math.random() - 0.5) * 20 + 360) % 360,
          s: clamp(hsl.s + (Math.random() - 0.5) * 20, 0, 100),
          l: clamp(hsl.l + (Math.random() - 0.5) * 15, 0, 100)
        }
        particlesRef.current.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1200,
          maxLife: 1200,
          size: 4,
          color: hslToCssString(particleHsl, 0.9),
          hsl: particleHsl,
          trail: []
        })
      }
      while (particlesRef.current.length > MAX_PARTICLES) {
        particlesRef.current.shift()
      }
    }

    const renderStars = (elapsed: number) => {
      for (const s of starsRef.current) {
        const t = elapsed / s.period
        const alpha = s.baseAlpha * (0.6 + 0.4 * Math.sin(t * Math.PI * 2 + s.phase))
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const renderConnector = () => {
      if (!colorDisplayPos || !wheelsPos || wheelsPos.length < 3) return
      const targetX = colorDisplayPos.x - 20
      const targetY = colorDisplayPos.y + colorDisplayPos.h / 2
      const startX = wheelsPos[1].x + WHEEL_RADIUS + 10
      const startY = wheelsPos[1].y

      const cp1x = startX + (targetX - startX) * 0.3
      const cp1y = startY - 40 + (wheelsPos[0].angle / 360) * 30
      const cp2x = startX + (targetX - startX) * 0.7
      const cp2y = targetY + 40 - (wheelsPos[2].angle / 360) * 30

      const grad = ctx.createLinearGradient(startX, startY, targetX, targetY)
      grad.addColorStop(0, hslToCssString(currentHsl, 0.05))
      grad.addColorStop(0.5, hslToCssString(currentHsl, 0.4))
      grad.addColorStop(1, hslToCssString(currentHsl, 0.7))

      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, targetX, targetY)
      ctx.strokeStyle = grad
      ctx.lineWidth = 2
      ctx.stroke()
    }

    const loop = (ts: number) => {
      const dt = Math.min(64, ts - lastTs)
      lastTs = ts
      const elapsed = ts - startTimeRef.current

      for (const b of bursts) {
        if (!processedBurstsRef.current.has(b.id)) {
          processedBurstsRef.current.add(b.id)
          if (b.source === 'wheel') {
            spawnWheelBurst(b.x, b.y, b.hsl, b.count ?? 12)
          } else {
            spawnPresetBurst(b.x, b.y, b.hsl, b.count ?? 20)
          }
        }
      }
      if (processedBurstsRef.current.size > 500) {
        processedBurstsRef.current.clear()
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      renderStars(elapsed)
      renderConnector()

      const nextParticles: Particle[] = []
      for (const p of particlesRef.current) {
        p.trail.push({ x: p.x, y: p.y })
        if (p.trail.length > 5) p.trail.shift()
        p.x += p.vx * (dt / 1000)
        p.y += p.vy * (dt / 1000)
        p.vx *= 0.98
        p.vy *= 0.98
        p.life -= dt

        if (p.life > 0 && p.x > -50 && p.x < window.innerWidth + 50 && p.y > -50 && p.y < window.innerHeight + 50) {
          const lifeRatio = p.life / p.maxLife
          const currentSize = p.size * lifeRatio

          if (p.trail.length >= 2) {
            for (let ti = 1; ti < p.trail.length; ti++) {
              const t = ti / p.trail.length
              ctx.strokeStyle = `hsla(${Math.round(p.hsl.h)}, ${Math.round(p.hsl.s)}%, ${Math.round(p.hsl.l)}%, ${0.15 * t * lifeRatio})`
              ctx.lineWidth = 1
              ctx.beginPath()
              ctx.moveTo(p.trail[ti - 1].x, p.trail[ti - 1].y)
              ctx.lineTo(p.trail[ti].x, p.trail[ti].y)
              ctx.stroke()
            }
          }

          ctx.fillStyle = `hsla(${Math.round(p.hsl.h)}, ${Math.round(p.hsl.s)}%, ${Math.round(p.hsl.l)}%, ${(0.9 * lifeRatio).toFixed(3)})`
          ctx.shadowColor = `hsla(${Math.round(p.hsl.h)}, ${Math.round(p.hsl.s)}%, ${Math.round(p.hsl.l)}%, 0.6)`
          ctx.shadowBlur = 8
          ctx.beginPath()
          ctx.arc(p.x, p.y, Math.max(0.2, currentSize), 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0

          nextParticles.push(p)
        }
      }
      particlesRef.current = nextParticles

      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [bursts, currentHsl, colorDisplayPos, wheelsPos])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}
    />
  )
}
