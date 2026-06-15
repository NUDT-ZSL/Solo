import { useRef, useEffect, useCallback, useState } from 'react'
import { useTimelineStore } from './store'
import { CATEGORY_COLORS } from './data'
import EventCard from './EventCard'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  life: number
  maxLife: number
}

interface FlowParticle {
  x: number
  y: number
  speed: number
  alpha: number
  size: number
}

interface Ripple {
  x: number
  y: number
  radius: number
  maxRadius: number
  alpha: number
}

export default function Timeline() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)
  const offsetRef = useRef(0)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, offset: 0 })
  const particlesRef = useRef<Particle[]>([])
  const flowParticlesRef = useRef<FlowParticle[]>([])
  const ripplesRef = useRef<Ripple[]>([])
  const nodePositionsRef = useRef<{ id: string; x: number; y: number; radius: number }[]>([])
  const hoveredIdRef = useRef<string | null>(null)

  const { filteredEvents, hoveredEvent, selectedEvent, selectEvent, hoverEvent } = useTimelineStore()
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const sortedEvents = [...filteredEvents].sort((a, b) => a.year - b.year)
  const TIMELINE_Y_RATIO = 0.55
  const NODE_SPACING = 220
  const NODE_BASE_RADIUS = 14
  const NODE_HOVER_RADIUS = 22

  const getTimelineY = useCallback(() => canvasSize.h * TIMELINE_Y_RATIO, [canvasSize.h])

  const getNodeX = useCallback(
    (index: number) => {
      const totalWidth = (sortedEvents.length - 1) * NODE_SPACING
      const startX = (canvasSize.w - totalWidth) / 2
      return startX + index * NODE_SPACING + offsetRef.current
    },
    [sortedEvents.length, canvasSize.w]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
      setCanvasSize({ w: rect.width, h: rect.height })
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    particlesRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvasSize.w,
      y: Math.random() * canvasSize.h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.6 + 0.1,
      life: 0,
      maxLife: Math.random() * 600 + 300,
    }))
  }, [canvasSize.w, canvasSize.h])

  useEffect(() => {
    flowParticlesRef.current = Array.from({ length: 30 }, () => ({
      x: Math.random() * canvasSize.w,
      y: getTimelineY() + (Math.random() - 0.5) * 4,
      speed: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.7 + 0.3,
      size: Math.random() * 2.5 + 1,
    }))
  }, [canvasSize.w, canvasSize.h, getTimelineY])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = (time: number) => {
      const w = canvasSize.w
      const h = canvasSize.h
      if (w === 0 || h === 0) {
        animFrameRef.current = requestAnimationFrame(draw)
        return
      }

      ctx.clearRect(0, 0, w, h)

      const bgGrad = ctx.createLinearGradient(0, 0, w, h)
      bgGrad.addColorStop(0, '#0a0e27')
      bgGrad.addColorStop(0.5, '#1a1040')
      bgGrad.addColorStop(1, '#2d1b69')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, w, h)

      for (let i = 0; i < 3; i++) {
        const nx = w * (0.3 + i * 0.2) + Math.sin(time * 0.0003 + i) * 50
        const ny = h * (0.3 + i * 0.15) + Math.cos(time * 0.0002 + i) * 30
        const nebula = ctx.createRadialGradient(nx, ny, 0, nx, ny, 200 + i * 50)
        nebula.addColorStop(0, 'rgba(100, 50, 180, 0.08)')
        nebula.addColorStop(0.5, 'rgba(60, 30, 120, 0.04)')
        nebula.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = nebula
        ctx.fillRect(0, 0, w, h)
      }

      const starSeed = 42
      const starCount = 60
      for (let i = 0; i < starCount; i++) {
        const sx = ((starSeed * (i + 1) * 7919) % 10000) / 10000 * w
        const sy = ((starSeed * (i + 1) * 6271) % 10000) / 10000 * h
        const twinkle = Math.sin(time * 0.002 + i * 1.7) * 0.3 + 0.7
        ctx.beginPath()
        ctx.arc(sx, sy, 1, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200, 200, 255, ${twinkle * 0.5})`
        ctx.fill()
      }

      particlesRef.current.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.life++
        if (p.life > p.maxLife || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          p.x = Math.random() * w
          p.y = Math.random() * h
          p.life = 0
          p.maxLife = Math.random() * 600 + 300
        }
        const fadeIn = Math.min(p.life / 60, 1)
        const fadeOut = Math.max(1 - (p.life - p.maxLife + 60) / 60, 0)
        const alpha = p.alpha * fadeIn * (p.life > p.maxLife - 60 ? fadeOut : 1)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(180, 160, 255, ${alpha})`
        ctx.fill()
      })

      const ty = getTimelineY()

      ctx.beginPath()
      ctx.moveTo(0, ty)
      ctx.lineTo(w, ty)
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.15)'
      ctx.lineWidth = 2
      ctx.stroke()

      const glowGrad = ctx.createLinearGradient(0, ty - 8, 0, ty + 8)
      glowGrad.addColorStop(0, 'rgba(255, 215, 0, 0)')
      glowGrad.addColorStop(0.5, 'rgba(255, 215, 0, 0.06)')
      glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)')
      ctx.fillStyle = glowGrad
      ctx.fillRect(0, ty - 8, w, 16)

      flowParticlesRef.current.forEach((fp) => {
        fp.x += fp.speed
        if (fp.x > w + 10) {
          fp.x = -10
          fp.y = ty + (Math.random() - 0.5) * 4
        }
        ctx.beginPath()
        ctx.arc(fp.x, fp.y, fp.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 215, 0, ${fp.alpha * 0.5})`
        ctx.fill()
      })

      const newNodePositions: typeof nodePositionsRef.current = []

      sortedEvents.forEach((event, index) => {
        const nx = getNodeX(index)
        const isHovered = hoveredEvent?.id === event.id
        const isSelected = selectedEvent?.id === event.id
        const r = isHovered || isSelected ? NODE_HOVER_RADIUS : NODE_BASE_RADIUS
        const categoryColor = CATEGORY_COLORS[event.category] || '#ffb347'

        newNodePositions.push({ id: event.id, x: nx, y: ty, radius: r })

        if (nx < -50 || nx > w + 50) return

        const yearStr = event.year < 0 ? `公元前${Math.abs(event.year)}年` : `${event.year}年`
        ctx.save()
        ctx.font = '11px "Space Mono", "IBM Plex Mono", monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(200, 200, 220, 0.6)'
        ctx.fillText(yearStr, nx, ty + r + 22)
        ctx.font = '12px "Space Mono", "IBM Plex Mono", monospace'
        ctx.fillStyle = isHovered || isSelected ? 'rgba(255, 255, 255, 0.95)' : 'rgba(200, 200, 220, 0.8)'
        const maxWidth = NODE_SPACING - 20
        const titleText = event.title.length > 8 ? event.title.slice(0, 7) + '…' : event.title
        ctx.fillText(titleText, nx, ty - r - 14)
        ctx.restore()

        ctx.save()
        if (isHovered || isSelected) {
          ctx.shadowColor = categoryColor
          ctx.shadowBlur = 30
        }

        const ringGrad = ctx.createRadialGradient(nx, ty, r * 0.4, nx, ty, r)
        ringGrad.addColorStop(0, 'rgba(255, 179, 71, 0.9)')
        ringGrad.addColorStop(1, categoryColor + 'cc')
        ctx.beginPath()
        ctx.arc(nx, ty, r, 0, Math.PI * 2)
        ctx.fillStyle = ringGrad
        ctx.fill()

        ctx.beginPath()
        ctx.arc(nx, ty, r * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = isHovered || isSelected ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)'
        ctx.fill()

        if (isHovered || isSelected) {
          const pulseR = r + Math.sin(time * 0.005) * 4 + 6
          ctx.beginPath()
          ctx.arc(nx, ty, pulseR, 0, Math.PI * 2)
          ctx.strokeStyle = categoryColor + '40'
          ctx.lineWidth = 2
          ctx.stroke()
        }
        ctx.restore()
      })

      nodePositionsRef.current = newNodePositions

      ripplesRef.current = ripplesRef.current.filter((rip) => {
        rip.radius += 3
        rip.alpha -= 0.02
        if (rip.alpha <= 0) return false
        ctx.beginPath()
        ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255, 215, 0, ${rip.alpha})`
        ctx.lineWidth = 1.5
        ctx.stroke()
        return true
      })

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [canvasSize, sortedEvents, hoveredEvent, selectedEvent, getTimelineY, getNodeX])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true
    dragStartRef.current = { x: e.clientX, offset: offsetRef.current }
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      setMousePos({ x: mx, y: my })

      if (isDraggingRef.current) {
        const dx = e.clientX - dragStartRef.current.x
        offsetRef.current = dragStartRef.current.offset + dx
        return
      }

      const ty = getTimelineY()
      let found: string | null = null
      for (const node of nodePositionsRef.current) {
        const dist = Math.sqrt((mx - node.x) ** 2 + (my - node.y) ** 2)
        if (dist < node.radius + 10) {
          found = node.id
          break
        }
      }

      if (found !== hoveredIdRef.current) {
        hoveredIdRef.current = found
        const event = found ? filteredEvents.find((ev) => ev.id === found) || null : null
        hoverEvent(event)
      }
    },
    [filteredEvents, getTimelineY, hoverEvent]
  )

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      const wasDragging = Math.abs(e.clientX - dragStartRef.current.x) > 5
      if (wasDragging) return

      for (const node of nodePositionsRef.current) {
        const dist = Math.sqrt((mx - node.x) ** 2 + (my - node.y) ** 2)
        if (dist < node.radius + 10) {
          const event = filteredEvents.find((ev) => ev.id === node.id) || null
          if (event) {
            selectEvent(event)
            ripplesRef.current.push({
              x: node.x,
              y: node.y,
              radius: node.radius,
              maxRadius: 80,
              alpha: 0.6,
            })
          }
          return
        }
      }
      selectEvent(null)
    },
    [filteredEvents, selectEvent]
  )

  const handleMouseLeave = useCallback(() => {
    isDraggingRef.current = false
    hoveredIdRef.current = null
    hoverEvent(null)
  }, [hoverEvent])

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />

      {hoveredEvent && !isDraggingRef.current && (
        <EventCard
          event={hoveredEvent}
          x={mousePos.x}
          y={mousePos.y}
          containerWidth={canvasSize.w}
          containerHeight={canvasSize.h}
          onSelect={() => {
            selectEvent(hoveredEvent)
            const node = nodePositionsRef.current.find((n) => n.id === hoveredEvent.id)
            if (node) {
              ripplesRef.current.push({ x: node.x, y: node.y, radius: node.radius, maxRadius: 80, alpha: 0.6 })
            }
          }}
        />
      )}
    </div>
  )
}
