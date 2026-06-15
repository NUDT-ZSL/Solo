import { useEffect, useRef } from 'react'
import { Particle, Theme } from '../types'
import { interpolateColor, withAlpha } from '../utils/color'

interface ParticleFieldProps {
  theme: Theme
}

export function ParticleField({ theme }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
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

    const colorStart = theme === 'dark' ? '#c471ed' : '#f97316'
    const colorEnd = theme === 'dark' ? '#f7797d' : '#fde68a'

    const createParticles = () => {
      const particles: Particle[] = []
      const count = 80
      for (let i = 0; i < count; i++) {
        const t = i / count
        const color = interpolateColor(colorStart, colorEnd, t)
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: 2 + Math.random() * 2,
          color,
          angle: Math.random() * Math.PI * 2,
          rotationSpeed: 0.5 * (Math.PI / 180)
        })
      }
      return particles
    }

    particlesRef.current = createParticles()

    let centerX = canvas.width / 2
    let centerY = canvas.height / 2

    const animate = () => {
      if (!isVisibleRef.current) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i]
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
