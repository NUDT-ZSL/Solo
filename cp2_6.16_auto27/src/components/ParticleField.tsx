import React, { useRef, useEffect, useCallback } from 'react'
import './ParticleField.css'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  life: number
  maxLife: number
  angle: number
  distance: number
  baseAlpha: number
}

interface ParticleFieldProps {
  frequencyDataRef: React.MutableRefObject<Uint8Array>
  frequencyVersionRef: React.MutableRefObject<number>
}

const PARTICLE_COUNT = 500
const BOUNDARY_RADIUS = 200

const ParticleField: React.FC<ParticleFieldProps> = ({ frequencyDataRef, frequencyVersionRef }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const centerRef = useRef({ x: 200, y: 200 })
  const lastVersionRef = useRef(0)
  const cachedEnergyRef = useRef(0)

  const spawnInCircle = useCallback((centerX: number, centerY: number, radius: number): Particle => {
    const angle = Math.random() * Math.PI * 2
    const uniformRand = Math.random()
    const startDistance = radius * Math.sqrt(uniformRand) * (0.1 + 0.9 * Math.random())
    const x = centerX + Math.cos(angle) * startDistance
    const y = centerY + Math.sin(angle) * startDistance

    const inwardAngle = angle + Math.PI + (Math.random() - 0.5) * 0.8
    const speed = 0.3 + Math.random() * 0.5

    return {
      x,
      y,
      vx: Math.cos(inwardAngle) * speed,
      vy: Math.sin(inwardAngle) * speed,
      radius: 1 + Math.random() * 3,
      life: 150 + Math.random() * 150,
      maxLife: 200 + Math.random() * 300,
      angle,
      distance: startDistance,
      baseAlpha: 0.3 + Math.random() * 0.4,
    }
  }, [])

  const createInitialParticle = useCallback((centerX: number, centerY: number, radius: number): Particle => {
    const angle = Math.random() * Math.PI * 2
    const startDistance = Math.random() * radius * 0.8

    return {
      x: centerX + Math.cos(angle) * startDistance,
      y: centerY + Math.sin(angle) * startDistance,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: 1 + Math.random() * 3,
      life: Math.random() * 200 + 100,
      maxLife: 200 + Math.random() * 300,
      angle,
      distance: startDistance,
      baseAlpha: 0.3 + Math.random() * 0.4,
    }
  }, [])

  const computeEnergy = useCallback((): number => {
    const data = frequencyDataRef.current
    if (!data || data.length === 0) return 0

    const version = frequencyVersionRef.current
    if (version === lastVersionRef.current) {
      return cachedEnergyRef.current
    }
    lastVersionRef.current = version

    let sum = 0
    const len = Math.min(32, data.length)
    for (let i = 0; i < len; i++) {
      sum += data[i]
    }
    const energy = sum / len / 255
    cachedEnergyRef.current = energy
    return energy
  }, [frequencyDataRef, frequencyVersionRef])

  const getParticleColor = useCallback(
    (energy: number, lifeRatio: number, baseAlpha: number): string => {
      const r = Math.floor(255 - energy * 80)
      const g = Math.floor(23 + energy * 80)
      const b = Math.floor(68 + energy * 150)
      const a = (0.3 + energy * 0.7) * lifeRatio * baseAlpha / 0.5
      return `rgba(${r}, ${g}, ${b}, ${Math.min(1, a)})`
    },
    []
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      animationFrameRef.current = requestAnimationFrame(draw)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(draw)
      return
    }

    const width = canvas.width
    const height = canvas.height
    const dpr = window.devicePixelRatio || 1

    const centerX = centerRef.current.x
    const centerY = centerRef.current.y
    const boundaryRadius = Math.min(BOUNDARY_RADIUS, width / 2, height / 2) * dpr

    ctx.fillStyle = 'rgba(26, 26, 26, 0.18)'
    ctx.fillRect(0, 0, width, height)

    const energy = computeEnergy()
    const baseAngularSpeed = 0.02
    const maxAngularSpeedIncrease = 0.1
    const angularSpeed = (baseAngularSpeed + energy * maxAngularSpeedIncrease) * dpr

    const expandForce = energy * 2.5 * dpr
    const particles = particlesRef.current

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]

      p.angle += angularSpeed * 0.04
      p.distance += expandForce * 0.25

      const targetX = centerX + Math.cos(p.angle) * p.distance
      const targetY = centerY + Math.sin(p.angle) * p.distance

      p.x += (targetX - p.x) * 0.08
      p.y += (targetY - p.y) * 0.08

      p.vx += (Math.random() - 0.5) * 0.08 * dpr
      p.vy += (Math.random() - 0.5) * 0.08 * dpr
      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.985
      p.vy *= 0.985

      const distFromCenter = Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2))

      if (distFromCenter > boundaryRadius * 0.92) {
        p.life -= 2.5
      }

      p.life -= 0.25 + energy * 0.45

      const lifeRatio = Math.max(0, Math.min(1, p.life / p.maxLife))

      if (p.life > 0 && distFromCenter <= boundaryRadius) {
        const radius = p.radius * (0.5 + energy * 0.5) * dpr

        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = getParticleColor(energy, lifeRatio, p.baseAlpha)
        ctx.fill()

        if (energy > 0.3) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, radius * 2.2, 0, Math.PI * 2)
          ctx.fillStyle = getParticleColor(energy, lifeRatio * 0.18, p.baseAlpha)
          ctx.fill()
        }
      }

      if (p.life <= 0 || distFromCenter > boundaryRadius * 1.15) {
        particles[i] = spawnInCircle(centerX, centerY, boundaryRadius)
      }
    }

    if (energy > 0.4) {
      const glowRadius = boundaryRadius * 0.65
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius)
      gradient.addColorStop(0, `rgba(255, 64, 129, ${energy * 0.13})`)
      gradient.addColorStop(1, 'rgba(255, 64, 129, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.beginPath()
    ctx.arc(centerX, centerY, boundaryRadius, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255, 64, 129, ${0.08 + energy * 0.18})`
    ctx.lineWidth = 2 * dpr
    ctx.stroke()

    animationFrameRef.current = requestAnimationFrame(draw)
  }, [computeEnergy, getParticleColor, spawnInCircle])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return

      const dpr = window.devicePixelRatio || 1
      const size = Math.min(container.clientWidth, container.clientHeight, 400)
      canvas.width = size * dpr
      canvas.height = size * dpr
      canvas.style.width = size + 'px'
      canvas.style.height = size + 'px'

      const cx = (size * dpr) / 2
      const cy = (size * dpr) / 2
      centerRef.current = { x: cx, y: cy }

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#1a1a1a'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      const boundaryR = Math.min(BOUNDARY_RADIUS, size / 2) * dpr
      const particles: Particle[] = []
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(createInitialParticle(cx, cy, boundaryR))
      }
      particlesRef.current = particles
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [createInitialParticle])

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(draw)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [draw])

  return (
    <div className="particle-field-container">
      <canvas ref={canvasRef} className="particle-field-canvas" />
    </div>
  )
}

export default ParticleField
