import React, { useEffect, useRef } from 'react'
import { hslString } from './utils/colorUtils'
import type { ColorScheme } from './ColorPanel'

interface GeometricCanvasProps {
  scheme: ColorScheme
}

interface Ripple {
  x: number
  y: number
  hue: number
  startTime: number
  duration: number
}

interface Dot {
  baseAngle: number
  radius: number
  driftPhase: number
  driftSpeed: number
  driftRadius: number
  attractions: Attraction[]
}

interface Attraction {
  rippleX: number
  rippleY: number
  startTime: number
  duration: number
}

const RING_RADIUS = 200
const RING_LINE_WIDTH = 10
const RING_ALPHA = 0.3

const HEX_SIDE = 80
const HEX_ROTATION_PERIOD = 4000

const DOT_COUNT = 15
const DOT_MIN_RADIUS = 5
const DOT_MAX_RADIUS = 12
const DOT_DRIFT_SPEED = 0.3
const HEX_VERTEX_RADIUS = HEX_SIDE

const RIPPLE_MAX_RADIUS = 150
const RIPPLE_DURATION = 1500
const RIPPLE_INIT_ALPHA = 0.8
const RIPPLE_SATURATION = 80
const RIPPLE_LIGHTNESS = 70

const ATTRACTION_DURATION = 500
const ATTRACTION_MAX_OFFSET = 10

const SATURATION = 70
const LIGHTNESS = 60

function createDots(): Dot[] {
  const dots: Dot[] = []
  for (let i = 0; i < DOT_COUNT; i++) {
    dots.push({
      baseAngle: (i / DOT_COUNT) * Math.PI * 2,
      radius:
        DOT_MIN_RADIUS + Math.random() * (DOT_MAX_RADIUS - DOT_MIN_RADIUS),
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.5 + Math.random() * 0.5,
      driftRadius: 20 + Math.random() * 40,
      attractions: [],
    })
  }
  return dots
}

const GeometricCanvas: React.FC<GeometricCanvasProps> = ({ scheme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const schemeRef = useRef(scheme)
  const rafRef = useRef<number>(0)
  const ripplesRef = useRef<Ripple[]>([])
  const dotsRef = useRef<Dot[]>(createDots())
  const lastRippleTimeRef = useRef(0)
  const isDraggingRef = useRef(false)
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })

  useEffect(() => {
    schemeRef.current = scheme
  }, [scheme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      sizeRef.current = { w, h, dpr }
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    window.addEventListener('resize', resize)

    const startTime = performance.now()

    const getCanvasPos = (e: MouseEvent | PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const spawnRipple = (x: number, y: number, hue: number, now: number) => {
      if (now - lastRippleTimeRef.current < 16) return
      lastRippleTimeRef.current = now
      ripplesRef.current.push({
        x,
        y,
        hue,
        startTime: now,
        duration: RIPPLE_DURATION,
      })
      for (const d of dotsRef.current) {
        d.attractions.push({
          rippleX: x,
          rippleY: y,
          startTime: now,
          duration: ATTRACTION_DURATION,
        })
      }
    }

    const handlePointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true
      canvas.setPointerCapture(e.pointerId)
      const { x, y } = getCanvasPos(e)
      spawnRipple(x, y, schemeRef.current.bgHue, performance.now())
    }
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return
      const { x, y } = getCanvasPos(e)
      spawnRipple(x, y, schemeRef.current.bgHue, performance.now())
    }
    const handlePointerUp = (e: PointerEvent) => {
      isDraggingRef.current = false
      try {
        canvas.releasePointerCapture(e.pointerId)
      } catch {
        /* noop */
      }
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointercancel', handlePointerUp)
    canvas.addEventListener('pointerleave', handlePointerUp)

    const drawBackground = (w: number, h: number) => {
      const grad = ctx.createLinearGradient(0, 0, w, h)
      grad.addColorStop(0, '#1a1a2e')
      grad.addColorStop(1, '#16213e')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)
    }

    const drawRing = (cx: number, cy: number, hue: number) => {
      ctx.beginPath()
      ctx.arc(cx, cy, RING_RADIUS, 0, Math.PI * 2)
      ctx.lineWidth = RING_LINE_WIDTH
      ctx.strokeStyle = hslString(hue, SATURATION, LIGHTNESS, RING_ALPHA)
      ctx.stroke()
    }

    const drawHexagon = (cx: number, cy: number, rotation: number, hue: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rotation)
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2
        const px = Math.cos(angle) * HEX_SIDE
        const py = Math.sin(angle) * HEX_SIDE
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fillStyle = hslString(hue, SATURATION, LIGHTNESS, 0.55)
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = hslString(hue, SATURATION, LIGHTNESS, 0.85)
      ctx.stroke()
      ctx.restore()
    }

    const drawDots = (
      cx: number,
      cy: number,
      time: number,
      hexRotation: number,
      hue: number
    ) => {
      for (const d of dotsRef.current) {
        d.driftPhase += DOT_DRIFT_SPEED * 0.01 * d.driftSpeed

        let offsetX = 0
        let offsetY = 0
        const now = time
        d.attractions = d.attractions.filter(
          (a) => now - a.startTime < a.duration
        )
        for (const a of d.attractions) {
          const t = (now - a.startTime) / a.duration
          const ease = 1 - t
          const baseX =
            cx +
            Math.cos(d.baseAngle + hexRotation) * HEX_VERTEX_RADIUS +
            Math.cos(d.driftPhase) * d.driftRadius
          const baseY =
            cy +
            Math.sin(d.baseAngle + hexRotation) * HEX_VERTEX_RADIUS +
            Math.sin(d.driftPhase) * d.driftRadius
          const dx = a.rippleX - baseX
          const dy = a.rippleY - baseY
          const dist = Math.hypot(dx, dy) || 1
          const pull = ATTRACTION_MAX_OFFSET * ease
          offsetX += (dx / dist) * pull
          offsetY += (dy / dist) * pull
        }

        const x =
          cx +
          Math.cos(d.baseAngle + hexRotation) * HEX_VERTEX_RADIUS +
          Math.cos(d.driftPhase) * d.driftRadius +
          offsetX
        const y =
          cy +
          Math.sin(d.baseAngle + hexRotation) * HEX_VERTEX_RADIUS +
          Math.sin(d.driftPhase) * d.driftRadius +
          offsetY

        ctx.beginPath()
        ctx.arc(x, y, d.radius, 0, Math.PI * 2)
        ctx.fillStyle = hslString(hue, SATURATION, LIGHTNESS, 0.9)
        ctx.fill()
      }
    }

    const drawRipples = (time: number) => {
      const alive: Ripple[] = []
      for (const r of ripplesRef.current) {
        const t = (time - r.startTime) / r.duration
        if (t >= 1) continue
        alive.push(r)
        const radius = t * RIPPLE_MAX_RADIUS
        const alpha = RIPPLE_INIT_ALPHA * (1 - t)
        ctx.beginPath()
        ctx.arc(r.x, r.y, radius, 0, Math.PI * 2)
        ctx.lineWidth = 3
        ctx.strokeStyle = hslString(
          r.hue,
          RIPPLE_SATURATION,
          RIPPLE_LIGHTNESS,
          alpha
        )
        ctx.stroke()
      }
      ripplesRef.current = alive
    }

    const render = () => {
      const t = performance.now()
      const elapsed = t - startTime
      const { w, h } = sizeRef.current
      const cx = w / 2
      const cy = h / 2
      const hexRotation = (elapsed / HEX_ROTATION_PERIOD) * Math.PI * 2
      const s = schemeRef.current

      drawBackground(w, h)
      drawRing(cx, cy, s.bgHue)
      drawHexagon(cx, cy, hexRotation, s.mainHue)
      drawDots(cx, cy, t, hexRotation, s.accentHue)
      drawRipples(t)

      rafRef.current = requestAnimationFrame(render)
    }
    rafRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafRef.current)
      resizeObserver.disconnect()
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointercancel', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerUp)
    }
  }, [])

  return (
    <div className="canvas-container">
      <canvas ref={canvasRef} />
    </div>
  )
}

export default GeometricCanvas
