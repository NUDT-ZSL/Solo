import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'

export interface MemoryRecord {
  id: string
  text: string
  timestamp: number
  sentimentScore: number
  color: string
  size: number
  brightness: number
}

interface StarPosition {
  x: number
  y: number
}

interface OrbitInfo {
  from: MemoryRecord
  to: MemoryRecord
  fromPos: StarPosition
  toPos: StarPosition
}

interface StarMapProps {
  records: MemoryRecord[]
  onStarClick: (record: MemoryRecord, screenX: number, screenY: number) => void
  canvasRefProp?: React.RefObject<HTMLCanvasElement>
}

export interface StarMapHandle {
  exportCanvas: () => Promise<void>
}

const MIN_SCALE = 0.5
const MAX_SCALE = 3.0
const SPIRAL_SPACING = 80
const PANEL_WIDTH = 240

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    }
  }
  const rgbMatch = /rgb\((\d+),(\d+),(\d+)\)/.exec(hex)
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3])
    }
  }
  return { r: 221, g: 160, b: 221 }
}

const lerpColor = (color1: string, color2: string, t: number): string => {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b = Math.round(c1.b + (c2.b - c1.b) * t)
  return `rgb(${r},${g},${b})`
}

const getSpiralPosition = (index: number): StarPosition => {
  const phi = Math.PI * (3 - Math.sqrt(5))
  const theta = index * phi
  const radius = SPIRAL_SPACING * Math.sqrt(index)
  return {
    x: Math.cos(theta) * radius,
    y: Math.sin(theta) * radius
  }
}

const getSameDayGroups = (records: MemoryRecord[]): MemoryRecord[][] => {
  const groups: Map<string, MemoryRecord[]> = new Map()
  records.forEach(r => {
    const date = new Date(r.timestamp)
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(r)
  })
  return Array.from(groups.values()).map(g => g.sort((a, b) => a.timestamp - b.timestamp))
}

const getBezierPoint = (p0: StarPosition, p1: StarPosition, t: number): StarPosition => {
  const midX = (p0.x + p1.x) / 2
  const midY = (p0.y + p1.y) / 2
  const dx = p1.x - p0.x
  const dy = p1.y - p0.y
  const perpX = -dy * 0.2
  const perpY = dx * 0.2
  const cpX = midX + perpX
  const cpY = midY + perpY

  const t2 = t * t
  const mt = 1 - t
  const mt2 = mt * mt

  return {
    x: mt2 * p0.x + 2 * mt * t * cpX + t2 * p1.x,
    y: mt2 * p0.y + 2 * mt * t * cpY + t2 * p1.y
  }
}

const pointToSegmentDistance = (p: StarPosition, a: StarPosition, b: StarPosition): number => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) {
    return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2)
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const projX = a.x + t * dx
  const projY = a.y + t * dy
  return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2)
}

const StarMap = forwardRef<StarMapHandle, StarMapProps>(({ records, onStarClick }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const startTimeRef = useRef<number>(performance.now())

  const transformRef = useRef({ offsetX: 0, offsetY: 0, scale: 1 })
  const isDraggingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const dragMovedRef = useRef(false)
  const mouseDownPosRef = useRef({ x: 0, y: 0 })
  const hoveredStarRef = useRef<string | null>(null)
  const hoveredOrbitRef = useRef<OrbitInfo | null>(null)

  const [, forceRender] = useState(0)
  const tooltipRef = useRef<{ visible: boolean; x: number; y: number; text: string }>({
    visible: false, x: 0, y: 0, text: ''
  })

  const starPositions = useRef<Map<string, StarPosition>>(new Map())

  useImperativeHandle(ref, () => ({
    exportCanvas: async () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const link = document.createElement('a')
      link.download = 'recall-star-map.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
  }))

  const computeStarPositions = useCallback(() => {
    starPositions.current.clear()
    records.forEach((record, index) => {
      starPositions.current.set(record.id, getSpiralPosition(index))
    })
  }, [records])

  const worldToScreen = useCallback((wx: number, wy: number): StarPosition => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const { offsetX, offsetY, scale } = transformRef.current
    return {
      x: (wx + offsetX) * scale + canvas.width / 2,
      y: (wy + offsetY) * scale + canvas.height / 2
    }
  }, [])

  const screenToWorld = useCallback((sx: number, sy: number): StarPosition => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const { offsetX, offsetY, scale } = transformRef.current
    return {
      x: (sx - canvas.width / 2) / scale - offsetX,
      y: (sy - canvas.height / 2) / scale - offsetY
    }
  }, [])

  const playChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioCtx()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.value = 500 + Math.random() * 300

      gainNode.gain.setValueAtTime(0, ctx.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5)

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 1.5)
    } catch (e) {
      // Audio not available
    }
  }, [])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }, [])

  const drawBackgroundStars = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => {
    const count = 100
    for (let i = 0; i < count; i++) {
      const seed = i * 12345.6789
      const x = ((Math.sin(seed) * 10000) % 1 + 1) % 1 * w
      const y = ((Math.cos(seed * 1.3) * 10000) % 1 + 1) % 1 * h
      const size = ((Math.sin(seed * 2.1) * 10000) % 1 + 1) % 1 * 1.5 + 0.3
      const twinkle = Math.sin(time / 1000 + i * 0.7) * 0.3 + 0.7
      ctx.fillStyle = `rgba(255,255,255,${0.3 * twinkle})`
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [])

  const drawStar = useCallback((
    ctx: CanvasRenderingContext2D,
    record: MemoryRecord,
    screenX: number,
    screenY: number,
    time: number,
    isHovered: boolean
  ) => {
    const { scale } = transformRef.current
    const size = record.size * scale
    const glowRadius = 30 * scale
    const pulse = Math.sin(time / 500 + record.timestamp * 0.001) * 0.15 + 0.85
    const brightness = record.brightness * pulse

    const glow = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, Math.max(glowRadius, size * 2))
    const rgb = hexToRgb(record.color)
    glow.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${brightness * 0.6})`)
    glow.addColorStop(0.4, `rgba(${rgb.r},${rgb.g},${rgb.b},${brightness * 0.2})`)
    glow.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`)
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(screenX, screenY, Math.max(glowRadius, size * 2), 0, Math.PI * 2)
    ctx.fill()

    const coreGrad = ctx.createRadialGradient(screenX - size * 0.2, screenY - size * 0.2, 0, screenX, screenY, size)
    coreGrad.addColorStop(0, `rgba(255,255,255,${brightness})`)
    coreGrad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},${brightness})`)
    coreGrad.addColorStop(1, `rgba(${Math.floor(rgb.r * 0.7)},${Math.floor(rgb.g * 0.7)},${Math.floor(rgb.b * 0.7)},${brightness})`)
    ctx.fillStyle = coreGrad
    ctx.beginPath()
    ctx.arc(screenX, screenY, size * (isHovered ? 1.15 : 1), 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = `rgba(255,255,255,${brightness * 0.9})`
    ctx.beginPath()
    ctx.arc(screenX - size * 0.25, screenY - size * 0.25, size * 0.25, 0, Math.PI * 2)
    ctx.fill()
  }, [])

  const drawOrbit = useCallback((
    ctx: CanvasRenderingContext2D,
    orbit: OrbitInfo,
    time: number,
    isHovered: boolean
  ) => {
    const { scale } = transformRef.current
    const alpha = isHovered ? 0.8 : 0.4
    const lineWidth = (isHovered ? 3 : 2) * scale

    const p0 = worldToScreen(orbit.fromPos.x, orbit.fromPos.y)
    const p1 = worldToScreen(orbit.toPos.x, orbit.toPos.y)

    const midColor = lerpColor(orbit.from.color, orbit.to.color, 0.5)
    const rgb = hexToRgb(midColor)

    const steps = 30
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    for (let i = 0; i < steps; i++) {
      const t1 = i / steps
      const t2 = (i + 1) / steps
      const segAlpha = alpha * (0.6 + 0.4 * Math.sin(t1 * Math.PI))
      ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${segAlpha})`
      const sp1 = getBezierPoint(p0, p1, t1)
      const sp2 = getBezierPoint(p0, p1, t2)
      ctx.beginPath()
      ctx.moveTo(sp1.x, sp1.y)
      ctx.lineTo(sp2.x, sp2.y)
      ctx.stroke()
    }

    const particleCount = Math.ceil(50 / 5)
    const period = 2000
    for (let i = 0; i < particleCount; i++) {
      const baseT = (i / particleCount)
      const t = ((time / period + baseT) % 1)
      const pt = getBezierPoint(p0, p1, t)
      const particleAlpha = 0.6 * (0.5 + 0.5 * Math.sin(t * Math.PI))
      const pr = 2.5 * scale

      const pGlow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pr * 3)
      pGlow.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${particleAlpha})`)
      pGlow.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`)
      ctx.fillStyle = pGlow
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, pr * 3, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = `rgba(255,255,255,${particleAlpha})`
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, pr, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [worldToScreen])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr

    ctx.clearRect(0, 0, w, h)

    const bgGrad = ctx.createLinearGradient(0, 0, w, h)
    bgGrad.addColorStop(0, '#0B0E14')
    bgGrad.addColorStop(1, '#1B2430')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, w, h)

    const time = performance.now() - startTimeRef.current
    drawBackgroundStars(ctx, w, h, time)

    computeStarPositions()

    const dayGroups = getSameDayGroups(records)
    const orbits: OrbitInfo[] = []
    dayGroups.forEach(group => {
      for (let i = 0; i < group.length - 1; i++) {
        const from = group[i]
        const to = group[i + 1]
        const fromPos = starPositions.current.get(from.id)
        const toPos = starPositions.current.get(to.id)
        if (fromPos && toPos) {
          orbits.push({ from, to, fromPos, toPos })
        }
      }
    })

    orbits.forEach(orbit => {
      const isHovered = hoveredOrbitRef.current === orbit
      drawOrbit(ctx, orbit, time, isHovered)
    })

    const { scale, offsetX, offsetY } = transformRef.current
    const margin = 100
    const tl = screenToWorld(-margin, -margin)
    const br = screenToWorld(w + margin, h + margin)

    records.forEach(record => {
      const pos = starPositions.current.get(record.id)
      if (!pos) return

      const screenPos = worldToScreen(pos.x, pos.y)
      const wx = pos.x + offsetX
      const wy = pos.y + offsetY
      const displayX = wx * scale + w / 2
      const displayY = wy * scale + h / 2
      const starSize = record.size * scale

      if (
        displayX + starSize * 3 < 0 ||
        displayX - starSize * 3 > w ||
        displayY + starSize * 3 < 0 ||
        displayY - starSize * 3 > h
      ) {
        if (tl.x > pos.x || br.x < pos.x || tl.y > pos.y || br.y < pos.y) return
      }

      const isHovered = hoveredStarRef.current === record.id
      drawStar(ctx, record, screenPos.x, screenPos.y, time, isHovered)
    })
  }, [records, computeStarPositions, drawBackgroundStars, drawOrbit, drawStar, screenToWorld, worldToScreen])

  useEffect(() => {
    let lastTime = 0
    const loop = (time: number) => {
      if (time - lastTime >= 16) {
        render()
        lastTime = time
      }
      animationRef.current = requestAnimationFrame(loop)
    }
    animationRef.current = requestAnimationFrame(loop)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [render])

  useEffect(() => {
    resizeCanvas()
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    transformRef.current.offsetX = 0
    transformRef.current.offsetY = 0
    transformRef.current.scale = 1

    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [resizeCanvas])

  const getCanvasPos = (e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const hitTestStar = (sx: number, sy: number): MemoryRecord | null => {
    const { scale } = transformRef.current
    for (let i = records.length - 1; i >= 0; i--) {
      const record = records[i]
      const pos = starPositions.current.get(record.id)
      if (!pos) continue
      const screenPos = worldToScreen(pos.x, pos.y)
      const hitRadius = (record.size * scale) * 1.2
      const dx = sx - screenPos.x
      const dy = sy - screenPos.y
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return record
      }
    }
    return null
  }

  const hitTestOrbit = (sx: number, sy: number): OrbitInfo | null => {
    const { scale } = transformRef.current
    const worldPos = screenToWorld(sx, sy)
    const dayGroups = getSameDayGroups(records)

    for (const group of dayGroups) {
      for (let i = 0; i < group.length - 1; i++) {
        const from = group[i]
        const to = group[i + 1]
        const fromPos = starPositions.current.get(from.id)
        const toPos = starPositions.current.get(to.id)
        if (!fromPos || !toPos) continue

        const steps = 20
        for (let s = 0; s < steps; s++) {
          const t1 = s / steps
          const t2 = (s + 1) / steps
          const p1 = getBezierPoint(fromPos, toPos, t1)
          const p2 = getBezierPoint(fromPos, toPos, t2)
          const dist = pointToSegmentDistance(worldPos, p1, p2)
          if (dist * scale < 8) {
            return { from, to, fromPos, toPos }
          }
        }
      }
    }
    return null
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    dragMovedRef.current = false
    const pos = getCanvasPos(e)
    lastPosRef.current = pos
    mouseDownPosRef.current = pos
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e)

    if (isDraggingRef.current) {
      const dx = pos.x - lastPosRef.current.x
      const dy = pos.y - lastPosRef.current.y
      const totalDx = pos.x - mouseDownPosRef.current.x
      const totalDy = pos.y - mouseDownPosRef.current.y

      if (Math.abs(totalDx) > 3 || Math.abs(totalDy) > 3) {
        dragMovedRef.current = true
      }

      if (dragMovedRef.current) {
        transformRef.current.offsetX += dx / transformRef.current.scale
        transformRef.current.offsetY += dy / transformRef.current.scale
      }
      lastPosRef.current = pos
      return
    }

    const star = hitTestStar(pos.x, pos.y)
    const orbit = star ? null : hitTestOrbit(pos.x, pos.y)

    const canvas = canvasRef.current
    if (canvas) {
      if (star || orbit) {
        canvas.style.cursor = 'pointer'
      } else if (isDraggingRef.current) {
        canvas.style.cursor = 'grabbing'
      } else {
        canvas.style.cursor = 'grab'
      }
    }

    hoveredStarRef.current = star ? star.id : null
    hoveredOrbitRef.current = orbit

    if (orbit) {
      const fromText = orbit.from.text.length > 10 ? orbit.from.text.slice(0, 10) + '...' : orbit.from.text
      const toText = orbit.to.text.length > 10 ? orbit.to.text.slice(0, 10) + '...' : orbit.to.text
      tooltipRef.current = {
        visible: true,
        x: e.clientX,
        y: e.clientY,
        text: `${fromText} → ${toText}`
      }
    } else {
      tooltipRef.current.visible = false
    }
    forceRender(n => n + 1)
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDraggingRef.current && !dragMovedRef.current) {
      const pos = getCanvasPos(e)
      const star = hitTestStar(pos.x, pos.y)
      if (star) {
        playChime()
        const screenPos = worldToScreen(
          starPositions.current.get(star.id)!.x,
          starPositions.current.get(star.id)!.y
        )
        onStarClick(star, screenPos.x, screenPos.y)
      }
    }
    isDraggingRef.current = false
  }

  const handleMouseLeave = () => {
    isDraggingRef.current = false
    hoveredStarRef.current = null
    hoveredOrbitRef.current = null
    tooltipRef.current.visible = false
    const canvas = canvasRef.current
    if (canvas) canvas.style.cursor = 'grab'
    forceRender(n => n + 1)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const pos = getCanvasPos(e)
    const delta = -e.deltaY * 0.001
    const oldScale = transformRef.current.scale
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, oldScale + delta * oldScale))

    const worldBefore = screenToWorld(pos.x, pos.y)
    transformRef.current.scale = newScale
    const worldAfter = screenToWorld(pos.x, pos.y)

    transformRef.current.offsetX += worldAfter.x - worldBefore.x
    transformRef.current.offsetY += worldAfter.y - worldBefore.y
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        paddingLeft: typeof window !== 'undefined' && window.innerWidth >= 800 ? PANEL_WIDTH : 0,
        paddingTop: typeof window !== 'undefined' && window.innerWidth < 800 ? 60 : 0,
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', cursor: 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />
      {tooltipRef.current.visible && (
        <div
          style={{
            position: 'fixed',
            left: tooltipRef.current.x + 12,
            top: tooltipRef.current.y + 12,
            padding: '6px 12px',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            borderRadius: 6,
            fontSize: 12,
            color: '#fff',
            pointerEvents: 'none',
            zIndex: 200,
            whiteSpace: 'nowrap',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          {tooltipRef.current.text}
        </div>
      )}
    </div>
  )
})

StarMap.displayName = 'StarMap'

export default StarMap
