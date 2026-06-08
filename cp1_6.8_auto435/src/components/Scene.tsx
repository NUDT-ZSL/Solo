import React, { useRef, useEffect, useState, useCallback } from 'react'
import type { Level, SceneObject } from '../data/levels'
import { createRipple, createGlowPulse, createGoldFoilEffect, drawWornEdges, hexToRgba } from '../utils/animations'

interface SceneProps {
  level: Level
  onObjectClick: (obj: SceneObject) => void
  onAllObjectsClicked: () => void
  puzzleSolved: boolean
  showHintFlash: boolean
  hoveredObject: string | null
  onHoverObject: (id: string | null) => void
}

interface RippleState {
  x: number
  y: number
  color: string
  startTime: number
  id: number
}

interface GlowState {
  objId: string
  startTime: number
  id: number
}

export default function Scene({
  level,
  onObjectClick,
  onAllObjectsClicked,
  puzzleSolved,
  showHintFlash,
  hoveredObject,
  onHoverObject,
}: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const objectsRef = useRef<Map<string, { x: number; y: number; w: number; h: number }>>(new Map())
  const ripplesRef = useRef<RippleState[]>([])
  const glowsRef = useRef<GlowState[]>([])
  const clickedRef = useRef<Set<string>>(new Set())
  const animFrameRef = useRef<number>(0)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })
  const edgeDrawnRef = useRef(false)

  useEffect(() => {
    clickedRef.current = new Set<string>()
    edgeDrawnRef.current = false
    ripplesRef.current = []
    glowsRef.current = []
  }, [level.id])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setCanvasSize({ w: Math.floor(width), h: Math.floor(height) })
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (showHintFlash) {
      level.objects.forEach((obj) => {
        glowsRef.current.push({
          objId: obj.id,
          startTime: performance.now(),
          id: Math.random(),
        })
      })
    }
  }, [showHintFlash, level.objects])

  const getObjectRect = useCallback(
    (obj: Omit<SceneObject, 'clicked'>) => {
      return {
        x: (obj.x / 100) * canvasSize.w,
        y: (obj.y / 100) * canvasSize.h,
        w: (obj.width / 100) * canvasSize.w,
        h: (obj.height / 100) * canvasSize.h,
      }
    },
    [canvasSize]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || canvasSize.w === 0) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.w * dpr
    canvas.height = canvasSize.h * dpr
    ctx.scale(dpr, dpr)

    const newMap = new Map<string, { x: number; y: number; w: number; h: number }>()
    level.objects.forEach((obj) => {
      newMap.set(obj.id, getObjectRect(obj))
    })
    objectsRef.current = newMap
    edgeDrawnRef.current = false
  }, [canvasSize, level.objects, getObjectRect])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || canvasSize.w === 0) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1

    let running = true

    function drawBackground() {
      const grad = ctx.createLinearGradient(0, 0, canvasSize.w, canvasSize.h)
      grad.addColorStop(0, level.backgroundGradient[0])
      grad.addColorStop(1, level.backgroundGradient[1])
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)

      ctx.save()
      ctx.fillStyle = 'rgba(200, 180, 150, 0.04)'
      for (let i = 0; i < 20; i++) {
        const px = ((i * 137.5) % canvasSize.w)
        const py = ((i * 89.3) % canvasSize.h)
        ctx.beginPath()
        ctx.arc(px, py, 30 + (i % 3) * 20, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()

      if (!edgeDrawnRef.current) {
        drawWornEdges(ctx, canvasSize.w, canvasSize.h)
        edgeDrawnRef.current = true
      }
    }

    function drawObjects(now: number) {
      level.objects.forEach((obj) => {
        const rect = objectsRef.current.get(obj.id)
        if (!rect) return
        const { x, y, w, h } = rect
        const isClicked = clickedRef.current.has(obj.id)
        const isHovered = hoveredObject === obj.id

        ctx.save()

        if (isClicked) {
          ctx.globalAlpha = 0.5
        } else {
          const hoverAlpha = isHovered ? 0.95 : 0.75
          ctx.globalAlpha = hoverAlpha
        }

        const bgGrad = ctx.createRadialGradient(
          x + w / 2,
          y + h / 2,
          0,
          x + w / 2,
          y + h / 2,
          Math.max(w, h)
        )
        bgGrad.addColorStop(0, hexToRgba(obj.color, 0.3))
        bgGrad.addColorStop(1, hexToRgba(obj.color, 0.05))
        ctx.fillStyle = bgGrad
        ctx.beginPath()
        ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 8)
        ctx.fill()

        ctx.strokeStyle = hexToRgba(obj.color, isHovered ? 0.6 : 0.25)
        ctx.lineWidth = isHovered ? 1.5 : 0.8
        ctx.beginPath()
        ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 8)
        ctx.stroke()

        if (!isClicked && !isHovered) {
          const breathe = Math.sin(now / 2000 + obj.x) * 0.03
          ctx.globalAlpha = 0.7 + breathe
        }

        ctx.font = `${Math.min(w, h) * 0.6}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(obj.emoji, x + w / 2, y + h / 2)

        ctx.restore()
      })
    }

    function drawRipples(now: number) {
      const maxDuration = 1200
      ripplesRef.current = ripplesRef.current.filter((r) => now - r.startTime < maxDuration)
      for (const ripple of ripplesRef.current) {
        const progress = (now - ripple.startTime) / maxDuration
        const radius = progress * 60
        const alpha = (1 - progress) * 0.4
        ctx.save()
        ctx.beginPath()
        ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2)
        ctx.strokeStyle = hexToRgba(ripple.color, alpha)
        ctx.lineWidth = 2 * (1 - progress)
        ctx.stroke()
        ctx.restore()
      }
    }

    function drawGlows(now: number) {
      const glowDuration = 1500
      glowsRef.current = glowsRef.current.filter((g) => now - g.startTime < glowDuration)
      for (const glow of glowsRef.current) {
        const rect = objectsRef.current.get(glow.objId)
        if (!rect) continue
        const progress = (now - glow.startTime) / glowDuration
        const alpha = Math.sin(progress * Math.PI) * 0.4
        const size = Math.sin(progress * Math.PI) * 8 + 4
        ctx.save()
        ctx.shadowColor = level.accentColor
        ctx.shadowBlur = size * 3
        ctx.fillStyle = hexToRgba(level.accentColor, alpha)
        ctx.beginPath()
        ctx.ellipse(
          rect.x + rect.w / 2,
          rect.y + rect.h / 2,
          rect.w / 2 + size,
          rect.h / 2 + size,
          0,
          0,
          Math.PI * 2
        )
        ctx.fill()
        ctx.restore()
      }
    }

    function drawGoldFoil(now: number) {
      if (!puzzleSolved) return
      const foilX = canvasSize.w - 50
      const foilY = canvasSize.h - 50
      const pulse = Math.sin(now / 600) * 0.15 + 0.85

      ctx.save()
      ctx.shadowColor = '#ffd700'
      ctx.shadowBlur = 10 * pulse
      ctx.fillStyle = `rgba(255, 215, 0, ${0.85 * pulse})`
      ctx.beginPath()
      const s = 8
      ctx.moveTo(foilX, foilY - s)
      ctx.lineTo(foilX + s * 0.6, foilY)
      ctx.lineTo(foilX, foilY + s)
      ctx.lineTo(foilX - s * 0.6, foilY)
      ctx.closePath()
      ctx.fill()

      for (let i = 0; i < 4; i++) {
        const angle = (now / 2000) + (i * Math.PI) / 2
        const dist = 15 + Math.sin(now / 800 + i) * 5
        const sx = foilX + Math.cos(angle) * dist
        const sy = foilY + Math.sin(angle) * dist
        const sparkleAlpha = (Math.sin(now / 300 + i * 1.5) * 0.5 + 0.5) * 0.6
        ctx.fillStyle = `rgba(255, 223, 100, ${sparkleAlpha})`
        ctx.beginPath()
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    function render(now: number) {
      if (!running) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, canvasSize.w, canvasSize.h)
      drawBackground()
      drawObjects(now)
      drawRipples(now)
      drawGlows(now)
      drawGoldFoil(now)
      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)

    return () => {
      running = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [canvasSize, level, hoveredObject, puzzleSolved])

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      for (const obj of level.objects) {
        const objRect = objectsRef.current.get(obj.id)
        if (!objRect) continue
        const { x, y, w, h } = objRect
        if (mx >= x - 4 && mx <= x + w + 4 && my >= y - 4 && my <= y + h + 4) {
          if (!clickedRef.current.has(obj.id)) {
            clickedRef.current.add(obj.id)
            ripplesRef.current.push({
              x: x + w / 2,
              y: y + h / 2,
              color: obj.color,
              startTime: performance.now(),
              id: Math.random(),
            })
            glowsRef.current.push({
              objId: obj.id,
              startTime: performance.now(),
              id: Math.random(),
            })
            onObjectClick({ ...obj, clicked: true })
            if (clickedRef.current.size === level.objects.length) {
              setTimeout(onAllObjectsClicked, 600)
            }
          }
          return
        }
      }
    },
    [level.objects, onObjectClick, onAllObjectsClicked]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      let found: string | null = null
      for (const obj of level.objects) {
        const objRect = objectsRef.current.get(obj.id)
        if (!objRect) continue
        const { x, y, w, h } = objRect
        if (mx >= x - 4 && mx <= x + w + 4 && my >= y - 4 && my <= y + h + 4) {
          found = obj.id
          break
        }
      }
      onHoverObject(found)
      canvas.style.cursor = found ? 'pointer' : 'default'
    },
    [level.objects, onHoverObject]
  )

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => onHoverObject(null)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  )
}
