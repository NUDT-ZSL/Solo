import { useRef, useEffect, useCallback } from 'react'
import { ColorTheme, THEMES, ThemeColors } from '../App'

interface Props {
  inkConcentration: number
  brushSize: number
  diffusionSpeed: number
  colorTheme: ColorTheme
  resetTrigger: number
  onStrokeLengthChange: (length: number) => void
  onInkDotCountChange: (count: number) => void
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
  type: 'gold' | 'splatter'
}

interface StrokePoint {
  x: number
  y: number
  pressure: number
  time: number
}

function setAlpha(rgba: string, alpha: number): string {
  return rgba.replace(/[\d.]+\)$/, `${Math.max(0, Math.min(1, alpha))})`)
}

function generatePaperTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = 'rgba(245, 235, 220, 0.06)'
  ctx.fillRect(0, 0, w, h)

  ctx.save()
  ctx.globalAlpha = 0.025
  ctx.strokeStyle = 'rgba(200, 185, 165, 1)'
  ctx.lineWidth = 0.5
  for (let i = 0; i < 1500; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const len = Math.random() * 25 + 5
    const angle = Math.random() * Math.PI
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
    ctx.stroke()
  }
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = 0.015
  ctx.fillStyle = 'rgba(180, 165, 145, 1)'
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const r = Math.random() * 1.2 + 0.2
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export default function InkCanvas({
  inkConcentration,
  brushSize,
  diffusionSpeed,
  colorTheme,
  resetTrigger,
  onStrokeLengthChange,
  onInkDotCountChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const paperRef = useRef<HTMLCanvasElement | null>(null)
  const wetRef = useRef<HTMLCanvasElement | null>(null)
  const traceRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef(0)
  const drawingRef = useRef(false)
  const lastPtRef = useRef<StrokePoint | null>(null)
  const prevPtRef = useRef<StrokePoint | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const goldTimerRef = useRef(0)
  const strokeLenRef = useRef(0)
  const dotCountRef = useRef(0)
  const frameRef = useRef(0)
  const propsRef = useRef({ inkConcentration, brushSize, diffusionSpeed, colorTheme })

  propsRef.current = { inkConcentration, brushSize, diffusionSpeed, colorTheme }

  const getColors = useCallback((): ThemeColors => THEMES[propsRef.current.colorTheme], [])

  const initOffscreen = useCallback((w: number, h: number) => {
    const make = () => {
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      return c
    }
    const paper = make()
    const wet = make()
    const trace = make()
    const pCtx = paper.getContext('2d')!
    generatePaperTexture(pCtx, w, h)
    paperRef.current = paper
    wetRef.current = wet
    traceRef.current = trace
  }, [])

  const drawInkDot = useCallback(
    (ctx: CanvasRenderingContext2D, pt: StrokePoint, size: number, conc: number, colors: ThemeColors) => {
      const radius = size * (0.5 + pt.pressure * 0.5)
      const alpha = (conc / 10) * (0.35 + pt.pressure * 0.65)

      const gGlow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius * 2.5)
      gGlow.addColorStop(0, setAlpha(colors.glow, alpha * 0.35))
      gGlow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gGlow
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, radius * 2.5, 0, Math.PI * 2)
      ctx.fill()

      const gCore = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius)
      gCore.addColorStop(0, setAlpha(colors.primary, alpha))
      gCore.addColorStop(0.5, setAlpha(colors.primary, alpha * 0.7))
      gCore.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gCore
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2)
      ctx.fill()
    },
    [],
  )

  const drawSegment = useCallback(
    (ctx: CanvasRenderingContext2D, from: StrokePoint, to: StrokePoint) => {
      const { brushSize: sz, inkConcentration: conc } = propsRef.current
      const colors = getColors()
      const dist = Math.hypot(to.x - from.x, to.y - from.y)
      const steps = Math.max(1, Math.ceil(dist / 2))

      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const pt: StrokePoint = {
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
          pressure: from.pressure + (to.pressure - from.pressure) * t,
          time: from.time + (to.time - from.time) * t,
        }
        drawInkDot(ctx, pt, sz, conc, colors)
      }
    },
    [drawInkDot, getColors],
  )

  const spawnSplatter = useCallback((x: number, y: number, speed: number) => {
    const colors = getColors()
    const count = Math.min(Math.floor(speed * 0.8) + 1, 8)
    const arr: Particle[] = []
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const v = Math.random() * speed * 0.4 + 0.5
      arr.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 0.5,
        life: 1,
        maxLife: 0.4 + Math.random() * 0.6,
        size: Math.random() * 2.5 + 0.8,
        color: colors.particle,
        type: 'splatter',
      })
    }
    particlesRef.current.push(...arr)
    dotCountRef.current += count
    onInkDotCountChange(dotCountRef.current)
  }, [getColors, onInkDotCountChange])

  const spawnGold = useCallback((w: number, h: number) => {
    const colors = getColors()
    particlesRef.current.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -Math.random() * 0.15 - 0.05,
      life: 1,
      maxLife: 4 + Math.random() * 6,
      size: Math.random() * 1.8 + 0.5,
      color: colors.gold,
      type: 'gold',
    })
  }, [getColors])

  const getPos = useCallback((e: MouseEvent): StrokePoint => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    let pressure = 0.7
    if (lastPtRef.current) {
      const dist = Math.hypot(x - lastPtRef.current.x, y - lastPtRef.current.y)
      pressure = Math.max(0.3, Math.min(1, 1 - dist / 50))
    }
    return { x, y, pressure, time: performance.now() }
  }, [])

  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      drawingRef.current = true
      const pt = getPos(e)
      lastPtRef.current = pt
      prevPtRef.current = pt
      const wet = wetRef.current
      if (wet) {
        const ctx = wet.getContext('2d')!
        drawInkDot(ctx, pt, propsRef.current.brushSize, propsRef.current.inkConcentration, getColors())
      }
    },
    [getPos, drawInkDot, getColors],
  )

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!drawingRef.current) return
      const pt = getPos(e)
      const wet = wetRef.current
      if (wet && lastPtRef.current) {
        const ctx = wet.getContext('2d')!
        drawSegment(ctx, lastPtRef.current, pt)

        const dist = Math.hypot(pt.x - lastPtRef.current.x, pt.y - lastPtRef.current.y)
        strokeLenRef.current += dist
        onStrokeLengthChange(strokeLenRef.current)

        if (prevPtRef.current) {
          const speed = Math.hypot(pt.x - prevPtRef.current.x, pt.y - prevPtRef.current.y)
          if (speed > 6 && Math.random() < 0.3) {
            spawnSplatter(pt.x, pt.y, speed)
          }
        }
      }
      prevPtRef.current = lastPtRef.current
      lastPtRef.current = pt
    },
    [getPos, drawSegment, onStrokeLengthChange, spawnSplatter],
  )

  const onMouseUp = useCallback(() => {
    drawingRef.current = false
    lastPtRef.current = null
    prevPtRef.current = null
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      initOffscreen(w * dpr, h * dpr)
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [initOffscreen])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseDown, onMouseMove, onMouseUp])

  useEffect(() => {
    strokeLenRef.current = 0
    dotCountRef.current = 0
    onStrokeLengthChange(0)
    onInkDotCountChange(0)
    particlesRef.current = []

    const wet = wetRef.current
    const trace = traceRef.current
    if (wet) {
      const ctx = wet.getContext('2d')!
      ctx.clearRect(0, 0, wet.width, wet.height)
    }
    if (trace) {
      const ctx = trace.getContext('2d')!
      ctx.clearRect(0, 0, trace.width, trace.height)
    }
  }, [resetTrigger, onStrokeLengthChange, onInkDotCountChange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const loop = () => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.width
      const h = canvas.height
      const paper = paperRef.current
      const wet = wetRef.current
      const trace = traceRef.current
      if (!paper || !wet || !trace) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const wetCtx = wet.getContext('2d')!
      const traceCtx = trace.getContext('2d')!
      const { diffusionSpeed: dSpeed } = propsRef.current
      frameRef.current++

      // Diffusion: draw wet ink slightly scaled up with low alpha
      if (frameRef.current % 3 === 0) {
        wetCtx.save()
        wetCtx.globalAlpha = 0.012 * dSpeed
        const expand = 1 + 0.0008 * dSpeed
        const offsetX = w * (1 - expand) / 2
        const offsetY = h * (1 - expand) / 2
        wetCtx.drawImage(wet, offsetX, offsetY, w * expand, h * expand)
        wetCtx.restore()
      }

      // Fade wet ink
      wetCtx.save()
      wetCtx.globalCompositeOperation = 'destination-out'
      wetCtx.fillStyle = `rgba(0,0,0,${0.002 * dSpeed})`
      wetCtx.fillRect(0, 0, w, h)
      wetCtx.restore()

      // Stamp to trace periodically
      if (frameRef.current % 120 === 0) {
        traceCtx.save()
        traceCtx.globalAlpha = 0.06
        traceCtx.drawImage(wet, 0, 0)
        traceCtx.restore()
      }

      // Gold particles
      goldTimerRef.current++
      if (goldTimerRef.current % 8 === 0 && particlesRef.current.length < 200) {
        spawnGold(w / dpr, h / dpr)
      }

      // Update particles
      const dt = 1 / 60
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx
        p.y += p.vy
        if (p.type === 'splatter') {
          p.vy += 0.1
          p.vx *= 0.98
          p.vy *= 0.98
        } else {
          p.vx += (Math.random() - 0.5) * 0.02
          p.vy += (Math.random() - 0.5) * 0.02
        }
        p.life -= dt / p.maxLife
        return p.life > 0
      })

      // Compose
      ctx.clearRect(0, 0, w, h)

      // Paper texture
      ctx.drawImage(paper, 0, 0)

      // Traces
      ctx.drawImage(trace, 0, 0)

      // Wet ink
      ctx.drawImage(wet, 0, 0)

      // Particles
      ctx.save()
      ctx.scale(dpr, dpr)
      for (const p of particlesRef.current) {
        const alpha = p.life * (p.type === 'gold' ? 0.5 : 0.8)
        ctx.globalAlpha = alpha
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * (p.type === 'gold' ? p.life : 1), 0, Math.PI * 2)
        ctx.fill()

        if (p.type === 'splatter' && p.life > 0.5) {
          ctx.globalAlpha = alpha * 0.3
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.restore()

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [spawnGold])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        cursor: 'crosshair',
      }}
    />
  )
}
