import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  opacityDir: number
  hue: number
}

interface ParticleBackgroundProps {
  speed?: number
}

export default function ParticleBackground({ speed = 1 }: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const count = Math.floor((window.innerWidth * window.innerHeight) / 12000)
    const particles: Particle[] = []
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2 - 0.15,
        radius: Math.random() * 2.5 + 0.8,
        opacity: Math.random() * 0.4 + 0.15,
        opacityDir: Math.random() > 0.5 ? 1 : -1,
        hue: Math.random() * 40 + 30,
      })
    }
    particlesRef.current = particles

    let lastTime = 0
    const animate = (timestamp: number) => {
      const dt = lastTime ? Math.min((timestamp - lastTime) / 16.667, 3) : 1
      lastTime = timestamp

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const p of particles) {
        p.x += p.vx * speed * dt
        p.y += p.vy * speed * dt

        p.opacity += p.opacityDir * 0.002 * speed * dt
        if (p.opacity > 0.55) { p.opacity = 0.55; p.opacityDir = -1 }
        if (p.opacity < 0.1) { p.opacity = 0.1; p.opacityDir = 1 }

        if (p.x < -10) p.x = canvas.width + 10
        if (p.x > canvas.width + 10) p.x = -10
        if (p.y < -10) p.y = canvas.height + 10
        if (p.y > canvas.height + 10) p.y = -10

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 50%, 75%, ${p.opacity})`
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafRef.current)
    }
  }, [speed])

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
        zIndex: 0,
      }}
    />
  )
}
