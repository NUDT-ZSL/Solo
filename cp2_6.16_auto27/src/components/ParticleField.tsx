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
  speed: number
}

interface ParticleFieldProps {
  frequencyDataRef: React.MutableRefObject<Uint8Array>
}

const ParticleField: React.FC<ParticleFieldProps> = ({ frequencyDataRef }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const centerRef = useRef({ x: 200, y: 200 })

  const PARTICLE_COUNT = 500
  const BOUNDARY_RADIUS = 200

  const createParticle = useCallback((centerX: number, centerY: number): Particle => {
    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * BOUNDARY_RADIUS * 0.3

    return {
      x: centerX + Math.cos(angle) * distance,
      y: centerY + Math.sin(angle) * distance,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: 1 + Math.random() * 3,
      life: Math.random() * 100 + 100,
      maxLife: 200 + Math.random() * 300,
      angle,
      distance,
      speed: 0.5 + Math.random() * 1,
    }
  }, [])

  const getLowFrequencyEnergy = useCallback((): number => {
    const data = frequencyDataRef.current
    if (!data || data.length === 0) return 0
    const lowFreq = data.slice(0, 32)
    const sum = lowFreq.reduce((acc, val) => acc + val, 0)
    return sum / 32 / 255
  }, [frequencyDataRef])

  const getParticleColor = useCallback((energy: number, lifeRatio: number): string => {
    const r = Math.floor(255 - energy * 80)
    const g = Math.floor(23 + energy * 80)
    const b = Math.floor(68 + energy * 150)
    const a = (0.3 + energy * 0.7) * lifeRatio
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const dpr = window.devicePixelRatio || 1

    const centerX = centerRef.current.x
    const centerY = centerRef.current.y
    const boundaryRadius = BOUNDARY_RADIUS * dpr

    ctx.fillStyle = 'rgba(26, 26, 26, 0.15)'
    ctx.fillRect(0, 0, width, height)

    const energy = getLowFrequencyEnergy()
    const baseAngularSpeed = 0.02
    const maxAngularSpeedIncrease = 0.1
    const angularSpeed = (baseAngularSpeed + energy * maxAngularSpeedIncrease) * dpr

    const expandForce = energy * 2 * dpr
    const particles = particlesRef.current

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]

      p.angle += angularSpeed * 0.05
      p.distance += expandForce * 0.3

      const targetX = centerX + Math.cos(p.angle) * p.distance
      const targetY = centerY + Math.sin(p.angle) * p.distance

      p.x += (targetX - p.x) * 0.1
      p.y += (targetY - p.y) * 0.1

      p.vx += (Math.random() - 0.5) * 0.1 * dpr
      p.vy += (Math.random() - 0.5) * 0.1 * dpr
      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.98
      p.vy *= 0.98

      const distFromCenter = Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2))

      if (distFromCenter > boundaryRadius * 0.9) {
        p.life -= 2
      }

      p.life -= 0.3 + energy * 0.5

      const lifeRatio = Math.max(0, Math.min(1, p.life / p.maxLife))

      if (p.life > 0 && distFromCenter <= boundaryRadius) {
        const radius = p.radius * (0.5 + energy * 0.5) * dpr

        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = getParticleColor(energy, lifeRatio)
        ctx.fill()

        if (energy > 0.3) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, radius * 2, 0, Math.PI * 2)
          ctx.fillStyle = getParticleColor(energy, lifeRatio * 0.2)
          ctx.fill()
        }
      }

      if (p.life <= 0 || distFromCenter > boundaryRadius * 1.2) {
        const newAngle = Math.random() * Math.PI * 2
        const newDistance = Math.random() * boundaryRadius * 0.2
        particles[i] = {
          x: centerX + Math.cos(newAngle) * newDistance,
          y: centerY + Math.sin(newAngle) * newDistance,
          vx: (Math.random() - 0.5) * 0.3 * dpr,
          vy: (Math.random() - 0.5) * 0.3 * dpr,
          radius: 1 + Math.random() * 3,
          life: 150 + Math.random() * 150,
          maxLife: 200 + Math.random() * 300,
          angle: newAngle,
          distance: newDistance,
          speed: 0.5 + Math.random() * 1,
        }
      }
    }

    if (energy > 0.4) {
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        boundaryRadius * 0.6
      )
      gradient.addColorStop(0, `rgba(255, 64, 129, ${energy * 0.12})`)
      gradient.addColorStop(1, 'rgba(255, 64, 129, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, boundaryRadius * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.beginPath()
    ctx.arc(centerX, centerY, boundaryRadius, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255, 64, 129, ${0.1 + energy * 0.2})`
    ctx.lineWidth = 2 * dpr
    ctx.stroke()

    animationFrameRef.current = requestAnimationFrame(draw)
  }, [getLowFrequencyEnergy, getParticleColor])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (container) {
        const dpr = window.devicePixelRatio || 1
        const size = Math.min(container.clientWidth, container.clientHeight, 400)
        canvas.width = size * dpr
        canvas.height = size * dpr
        canvas.style.width = size + 'px'
        canvas.style.height = size + 'px'

        centerRef.current = {
          x: (size * dpr) / 2,
          y: (size * dpr) / 2,
        }

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#1a1a1a'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    const particles: Particle[] = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle(centerX, centerY))
    }
    particlesRef.current = particles

    animationFrameRef.current = requestAnimationFrame(draw)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [createParticle, draw])

  return (
    <div className="particle-field-container">
      <canvas ref={canvasRef} className="particle-field-canvas" />
    </div>
  )
}

export default ParticleField
