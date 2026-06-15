import { useEffect, useRef } from 'react'

interface ParticleBackgroundProps {
  color: string
  gradientStart?: string
  gradientEnd?: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  color: string
}

const ParticleBackground = ({ 
  color, 
  gradientStart = '#e040fb', 
  gradientEnd = '#00e5ff' 
}: ParticleBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const frameCountRef = useRef<number>(0)
  const fpsRef = useRef<number>(0)

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

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 224, g: 64, b: 251 }
    }

    const baseRgb = hexToRgb(color)
    const startRgb = hexToRgb(gradientStart)
    const endRgb = hexToRgb(gradientEnd)

    const createParticle = (index: number): Particle => {
      const angle = Math.random() * Math.PI * 2
      const speed = 0.2 + Math.random() * 0.5
      const t = index / 150
      const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * t + (Math.random() - 0.5) * 50)
      const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * t + (Math.random() - 0.5) * 50)
      const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * t + (Math.random() - 0.5) * 50)
      
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        alpha: 0.3 + Math.random() * 0.5,
        color: `rgba(${Math.max(0, Math.min(255, r))}, ${Math.max(0, Math.min(255, g))}, ${Math.max(0, Math.min(255, b))}, `
      }
    }

    particlesRef.current = []
    for (let i = 0; i < 150; i++) {
      particlesRef.current.push(createParticle(i))
    }

    const animate = (timestamp: number) => {
      animationRef.current = requestAnimationFrame(animate)

      frameCountRef.current++
      if (timestamp - lastTimeRef.current >= 1000) {
        fpsRef.current = frameCountRef.current
        frameCountRef.current = 0
        lastTimeRef.current = timestamp
      }

      const targetFPS = 30
      const interval = 1000 / targetFPS
      if (timestamp - lastTimeRef.current < interval / 2 && lastTimeRef.current !== 0) {
        return
      }

      const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      bgGradient.addColorStop(0, gradientStart + '10')
      bgGradient.addColorStop(1, gradientEnd + '10')
      ctx.fillStyle = 'rgba(26, 0, 51, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const particles = particlesRef.current
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        const dx = centerX - p.x
        const dy = centerY - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxDist = Math.max(canvas.width, canvas.height) * 0.6
        
        if (dist > 0) {
          const gravity = 0.0005 * (1 - dist / maxDist)
          p.vx += (dx / dist) * gravity
          p.vy += (dy / dist) * gravity
        }

        for (let j = i + 1; j < Math.min(particles.length, i + 10); j++) {
          const p2 = particles[j]
          const ddx = p.x - p2.x
          const ddy = p.y - p2.y
          const distance = Math.sqrt(ddx * ddx + ddy * ddy)
          
          if (distance < 100) {
            const alpha = (1 - distance / 100) * 0.2
            ctx.beginPath()
            ctx.strokeStyle = `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`
            ctx.lineWidth = 1
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }
        }

        p.x += p.vx
        p.y += p.vy

        if (p.x < -50) p.x = canvas.width + 50
        if (p.x > canvas.width + 50) p.x = -50
        if (p.y < -50) p.y = canvas.height + 50
        if (p.y > canvas.height + 50) p.y = -50

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        if (speed > 2) {
          p.vx = (p.vx / speed) * 2
          p.vy = (p.vy / speed) * 2
        }

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2)
        gradient.addColorStop(0, p.color + p.alpha + ')')
        gradient.addColorStop(1, p.color + '0)')

        ctx.beginPath()
        ctx.fillStyle = gradient
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.fillStyle = p.color + p.alpha + ')'
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.font = '10px monospace'
      ctx.fillText(`FPS: ${fpsRef.current}`, 10, 20)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = 0
      }
      particlesRef.current = []
    }
  }, [color, gradientStart, gradientEnd])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: `linear-gradient(135deg, ${gradientStart}15 0%, #1a0033 50%, ${gradientEnd}15 100%)` }}
    />
  )
}

export default ParticleBackground
