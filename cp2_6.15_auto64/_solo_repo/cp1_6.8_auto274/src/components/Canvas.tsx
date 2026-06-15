import { useRef, useEffect, useCallback } from 'react'
import {
  type NeonTrail,
  type Point,
  type Particle,
  createParticle,
  updateParticle,
  drawAllTrails,
  smoothPoints,
} from '../utils/drawUtils'

interface CanvasProps {
  color: string
  width: number
  trails: NeonTrail[]
  setTrails: React.Dispatch<React.SetStateAction<NeonTrail[]>>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}

export default function Canvas({ color, width, trails, setTrails, canvasRef }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const drawingRef = useRef(false)
  const currentTrailRef = useRef<NeonTrail | null>(null)
  const rafRef = useRef<number>(0)
  const trailIdRef = useRef(0)
  const particleAccumRef = useRef(0)

  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number): Point => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0, time: 0 }
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
        time: performance.now(),
      }
    },
    [canvasRef],
  )

  const startDrawing = useCallback(
    (clientX: number, clientY: number) => {
      drawingRef.current = true
      const point = getCanvasPoint(clientX, clientY)
      const id = ++trailIdRef.current
      const trail: NeonTrail = {
        id,
        points: [point],
        color,
        width,
        particles: [],
        phase: Math.random() * Math.PI * 2,
        opacity: 1,
        fadingOut: false,
        completed: false,
      }
      currentTrailRef.current = trail
      setTrails((prev) => [...prev, trail])
    },
    [color, width, getCanvasPoint, setTrails],
  )

  const continueDrawing = useCallback(
    (clientX: number, clientY: number) => {
      if (!drawingRef.current || !currentTrailRef.current) return
      const point = getCanvasPoint(clientX, clientY)
      const trail = currentTrailRef.current
      const lastPt = trail.points[trail.points.length - 1]
      const dx = point.x - lastPt.x
      const dy = point.y - lastPt.y
      if (dx * dx + dy * dy < 4) return

      trail.points.push(point)

      particleAccumRef.current += 1
      if (particleAccumRef.current >= 3) {
        particleAccumRef.current = 0
        trail.particles.push(createParticle(point.x, point.y, trail.color))
      }

      setTrails((prev) =>
        prev.map((t) => (t.id === trail.id ? { ...trail } : t)),
      )
    },
    [getCanvasPoint, setTrails],
  )

  const endDrawing = useCallback(() => {
    if (!drawingRef.current || !currentTrailRef.current) return
    drawingRef.current = false
    const trail = currentTrailRef.current
    trail.points = smoothPoints(trail.points, 2)
    trail.completed = true

    const lastPt = trail.points[trail.points.length - 1]
    for (let i = 0; i < 15; i++) {
      trail.particles.push(createParticle(lastPt.x, lastPt.y, trail.color))
    }

    setTrails((prev) =>
      prev.map((t) => (t.id === trail.id ? { ...trail } : t)),
    )
    currentTrailRef.current = null
  }, [setTrails])

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startDrawing(e.clientX, e.clientY)
    },
    [startDrawing],
  )

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      continueDrawing(e.clientX, e.clientY)
    },
    [continueDrawing],
  )

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      endDrawing()
    },
    [endDrawing],
  )

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]
      startDrawing(touch.clientX, touch.clientY)
    },
    [startDrawing],
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]
      continueDrawing(touch.clientX, touch.clientY)
    },
    [continueDrawing],
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      endDrawing()
    },
    [endDrawing],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = containerRef.current
      if (!container) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = container.clientWidth * dpr
      canvas.height = container.clientHeight * dpr
      canvas.style.width = `${container.clientWidth}px`
      canvas.style.height = `${container.clientHeight}px`
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [canvasRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let running = true

    const animate = () => {
      if (!running) return

      const dpr = window.devicePixelRatio || 1
      const w = canvas.width
      const h = canvas.height

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      setTrails((prev) => {
        let needsUpdate = false
        const updated = prev.map((trail) => {
          let modified = { ...trail }

          if (trail.completed && !trail.fadingOut) {
            modified.phase = trail.phase + 0.03
            needsUpdate = true
          }

          if (trail.fadingOut) {
            modified.opacity = Math.max(0, trail.opacity - 0.02)
            modified.phase = trail.phase + 0.03
            needsUpdate = true
          }

          const liveParticles: Particle[] = []
          for (const p of trail.particles) {
            if (updateParticle(p)) {
              liveParticles.push(p)
            }
          }
          if (liveParticles.length !== trail.particles.length) {
            modified.particles = liveParticles
            needsUpdate = true
          }

          if (trail.completed && trail.particles.length > 0) {
            needsUpdate = true
          }

          if (!trail.completed && trail.particles.length > 0) {
            needsUpdate = true
          }

          return needsUpdate ? modified : trail
        })

        const filtered = updated.filter((t) => !(t.fadingOut && t.opacity <= 0))
        return filtered === updated ? updated : filtered
      })

      drawAllTrails(ctx, trails, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1))

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [canvasRef, trails, setTrails])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        touchAction: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />
    </div>
  )
}
