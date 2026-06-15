import { useRef, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { ParticleEngine } from '@/utils/particles'

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<ParticleEngine | null>(null)
  const animRef = useRef<number>(0)

  const text = useStore((s) => s.text)
  const style = useStore((s) => s.style)
  const speed = useStore((s) => s.speed)
  const particleSize = useStore((s) => s.particleSize)
  const color = useStore((s) => s.color)
  const isDissolving = useStore((s) => s.isDissolving)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const engine = new ParticleEngine()
    engineRef.current = engine

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      engine.resize(w, h, ctx)
    }

    resize()
    window.addEventListener('resize', resize)

    let lastTime = performance.now()
    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now
      engine.update(dt)
      engine.draw(ctx)
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animRef.current)
    }
  }, [])

  useEffect(() => {
    const engine = engineRef.current
    const canvas = canvasRef.current
    if (!engine || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = window.innerWidth
    const h = window.innerHeight
    engine.init(text, w, h, ctx)
  }, [text])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.setStyle(style)
  }, [style])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.speed = speed
    engine.particleSize = particleSize
    engine.color = color
    engine.dissolving = isDissolving
  }, [speed, particleSize, color, isDissolving])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  )
}
