import { useRef, useCallback, useEffect, useState } from 'react'
import TextInput from '@/components/TextInput'
import WordCloud from '@/components/WordCloud'
import PoemDisplay from '@/components/PoemDisplay'
import InkParticles from '@/components/InkParticles'

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

export default function App() {
  const burstCanvasRef = useRef<HTMLCanvasElement>(null)
  const burstParticlesRef = useRef<BurstParticle[]>([])
  const burstRafRef = useRef<number>(0)
  const [appLoaded, setAppLoaded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAppLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const animateBurst = useCallback(() => {
    const canvas = burstCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const particles = burstParticlesRef.current

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
      burstRafRef.current = requestAnimationFrame(animateBurst)
    }
  }, [])

  const burst = useCallback(
    (x: number, y: number, color: string) => {
      const canvas = burstCanvasRef.current
      if (!canvas) return

      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
        canvas.width = canvas.offsetWidth
        canvas.height = canvas.offsetHeight
      }

      const particles = burstParticlesRef.current
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
      cancelAnimationFrame(burstRafRef.current)
      burstRafRef.current = requestAnimationFrame(animateBurst)
    },
    [animateBurst],
  )

  const burstApi = useRef({ burst }).current
  burstApi.burst = burst

  return (
    <div
      className="relative min-h-screen transition-opacity duration-700"
      style={{
        background: '#FAF7F2',
        opacity: appLoaded ? 1 : 0,
      }}
    >
      <InkParticles />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <header className="mb-6 text-center">
          <h1
            className="mb-1 font-serif text-3xl font-bold tracking-wide text-amber-900 lg:text-4xl"
            style={{ textShadow: '0 1px 2px rgba(184,134,11,0.15)' }}
          >
            词云诗镜
          </h1>
          <p className="font-serif text-sm text-amber-700/50">以词为镜，照见诗意</p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <TextInput />

            <div
              className="rounded-xl border border-amber-200/50 p-4 lg:hidden"
              style={{
                background: 'rgba(255, 252, 245, 0.6)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <PoemDisplay />
            </div>
          </aside>

          <main className="relative">
            <div
              className="relative min-h-[420px] overflow-hidden rounded-2xl border border-amber-100/40 lg:min-h-[520px]"
              style={{
                background: 'rgba(255, 253, 248, 0.5)',
                backdropFilter: 'blur(4px)',
                boxShadow: '0 8px 40px rgba(184, 134, 11, 0.06), inset 0 1px 0 rgba(255,255,255,0.6)',
              }}
            >
              <WordCloud burstApi={burstApi} />
              <canvas
                ref={burstCanvasRef}
                className="pointer-events-none absolute inset-0 z-30"
                style={{ width: '100%', height: '100%' }}
              />
            </div>

            <div
              id="poem-display"
              className="mt-6 hidden rounded-xl border border-amber-200/50 p-4 lg:block"
              style={{
                background: 'rgba(255, 252, 245, 0.6)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 20px rgba(184, 134, 11, 0.06)',
              }}
            >
              <PoemDisplay />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
