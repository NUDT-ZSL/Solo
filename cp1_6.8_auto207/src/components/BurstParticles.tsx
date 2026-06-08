import { useRef, useCallback } from 'react'
import { useStore } from '@/store'

interface BurstParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

export function useBurstParticles(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const particlesRef = useRef<BurstParticle[]>([])
  const rafRef = useRef<number>(0)

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const particles = particlesRef.current
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.15
      p.vx *= 0.98
      p.life -= 1

      if (p.life <= 0) {
        particles.splice(i, 1)
        continue
      }

      const alpha = p.life / p.maxLife
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = 1

    if (particles.length > 0) {
      rafRef.current = requestAnimationFrame(animate)
    }
  }, [canvasRef])

  const burst = useCallback(
    (x: number, y: number, color: string) => {
      const particles = particlesRef.current
      const count = 24
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
        const speed = 2 + Math.random() * 4
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 30 + Math.random() * 20,
          maxLife: 50,
          size: 2 + Math.random() * 3,
          color,
        })
      }
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(animate)
    },
    [animate, canvasRef],
  )

  return { burst }
}

export function BurstCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const burstRef = useRef<ReturnType<typeof useBurstParticles> | null>(null)

  if (!burstRef.current) {
    burstRef.current = { burst: () => {} }
  }

  const particles = useBurstParticles(canvasRef)
  burstRef.current = particles

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-30"
      style={{ width: '100%', height: '100%' }}
    />
  )
}

export { burstRef as globalBurstRef }
