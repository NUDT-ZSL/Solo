import { useRef, useEffect, useCallback } from 'react'
import { ParticleSystem, THEMES, type ThemeConfig } from './utils/particleSystem'

interface ParticleCanvasProps {
  themeIndex: number
  particleSize: number
  dissipationSpeed: number
  onFpsUpdate: (fps: number) => void
  onClear: () => void
  clearSignal: number
}

export default function ParticleCanvas({
  themeIndex,
  particleSize,
  dissipationSpeed,
  onFpsUpdate,
  onClear,
  clearSignal,
}: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const systemRef = useRef<ParticleSystem | null>(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const animFrameRef = useRef<number>(0)
  const fpsFramesRef = useRef<number[]>([])

  const getCanvasPoint = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      if ('touches' in e) {
        const touch = e.touches[0] || e.changedTouches[0]
        if (!touch) return null
        return {
          x: (touch.clientX - rect.left) * (canvas.width / rect.width),
          y: (touch.clientY - rect.top) * (canvas.height / rect.height),
        }
      }
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
      }
    },
    []
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      const parent = canvas.parentElement!
      const w = parent.clientWidth
      const h = parent.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    if (!systemRef.current) {
      systemRef.current = new ParticleSystem({
        themeIndex,
        particleSize,
        dissipationSpeed,
        maxParticles: 600,
        trailLength: 50,
        emitRate: 4,
      })
    }

    const system = systemRef.current

    const loop = (now: number) => {
      animFrameRef.current = requestAnimationFrame(loop)

      fpsFramesRef.current.push(now)
      while (fpsFramesRef.current.length > 0 && fpsFramesRef.current[0] <= now - 1000) {
        fpsFramesRef.current.shift()
      }
      if (fpsFramesRef.current.length > 1) {
        onFpsUpdate(fpsFramesRef.current.length)
      }

      system.update(now)

      const w = canvas.width / dpr
      const h = canvas.height / dpr

      ctx.globalCompositeOperation = 'source-over'
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h)
      bgGrad.addColorStop(0, '#0a0a12')
      bgGrad.addColorStop(0.5, '#0d0b1a')
      bgGrad.addColorStop(1, '#150d20')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, w, h)

      ctx.globalCompositeOperation = 'lighter'

      const currentTheme: ThemeConfig = THEMES[themeIndex]

      for (const p of system.particles) {
        if (p.trail.length > 1) {
          for (let i = 1; i < p.trail.length; i++) {
            const tp0 = p.trail[i - 1]
            const tp1 = p.trail[i]
            const alpha = tp1.opacity * 0.6
            if (alpha < 0.005) continue
            const lineW = Math.max(0.3, tp1.size * 0.4)
            ctx.beginPath()
            ctx.moveTo(tp0.x / dpr, tp0.y / dpr)
            ctx.lineTo(tp1.x / dpr, tp1.y / dpr)
            ctx.strokeStyle = `rgba(${Math.round(tp1.r)},${Math.round(tp1.g)},${Math.round(tp1.b)},${alpha})`
            ctx.lineWidth = lineW / dpr
            ctx.lineCap = 'round'
            ctx.stroke()
          }
        }

        if (p.opacity > 0.01) {
          const px = p.x / dpr
          const py = p.y / dpr
          const ps = Math.max(0.5, p.size) / dpr

          const glowRadius = ps * 3
          const glow = ctx.createRadialGradient(px, py, 0, px, py, glowRadius)
          glow.addColorStop(0, `rgba(${Math.round(p.r)},${Math.round(p.g)},${Math.round(p.b)},${p.opacity * 0.5})`)
          glow.addColorStop(0.4, `rgba(${Math.round(p.r)},${Math.round(p.g)},${Math.round(p.b)},${p.opacity * 0.2})`)
          glow.addColorStop(1, `rgba(${Math.round(p.r)},${Math.round(p.g)},${Math.round(p.b)},0)`)
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(px, py, glowRadius, 0, Math.PI * 2)
          ctx.fill()

          const core = ctx.createRadialGradient(px, py, 0, px, py, ps)
          core.addColorStop(0, `rgba(255,255,255,${p.opacity * 0.9})`)
          core.addColorStop(0.3, `rgba(${Math.round(p.r)},${Math.round(p.g)},${Math.round(p.b)},${p.opacity})`)
          core.addColorStop(1, `rgba(${Math.round(p.r)},${Math.round(p.g)},${Math.round(p.b)},0)`)
          ctx.fillStyle = core
          ctx.beginPath()
          ctx.arc(px, py, ps, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      if (isDrawingRef.current && system.particles.length > 0) {
        const lastP = system.particles[system.particles.length - 1]
        const cx = lastP.x / dpr
        const cy = lastP.y / dpr
        const cursorGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40)
        cursorGlow.addColorStop(0, currentTheme.glowColor)
        cursorGlow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = cursorGlow
        ctx.beginPath()
        ctx.arc(cx, cy, 40, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'
    }

    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  useEffect(() => {
    if (systemRef.current) {
      systemRef.current.setTheme(themeIndex)
    }
  }, [themeIndex])

  useEffect(() => {
    if (systemRef.current) {
      systemRef.current.setParticleSize(particleSize)
    }
  }, [particleSize])

  useEffect(() => {
    if (systemRef.current) {
      systemRef.current.setDissipationSpeed(dissipationSpeed)
    }
  }, [dissipationSpeed])

  useEffect(() => {
    if (systemRef.current) {
      systemRef.current.clear()
    }
    onClear()
  }, [clearSignal])

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      const pt = getCanvasPoint(e)
      if (!pt) return
      isDrawingRef.current = true
      lastPosRef.current = pt
      if (systemRef.current) {
        systemRef.current.emit(pt.x, pt.y, 0, 0)
      }
    },
    [getCanvasPoint]
  )

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      if (!isDrawingRef.current) return
      const pt = getCanvasPoint(e)
      if (!pt) return
      const dx = pt.x - lastPosRef.current.x
      const dy = pt.y - lastPosRef.current.y
      if (systemRef.current) {
        systemRef.current.emit(pt.x, pt.y, dx, dy)
      }
      lastPosRef.current = pt
    },
    [getCanvasPoint]
  )

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false
    if (systemRef.current) {
      systemRef.current.deactivateAll()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        cursor: 'crosshair',
        touchAction: 'none',
      }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      onTouchCancel={handlePointerUp}
    />
  )
}
