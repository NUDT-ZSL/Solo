import React, { useRef, useEffect, useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Component, Wire } from './types'

interface CanvasProps {
  components: Component[]
  wires: Wire[]
  selectedComponentId: string | null
  onSelectComponent: (id: string | null) => void
  onComponentsUpdate: (components: Component[]) => void
  onWiresUpdate: (wires: Wire[]) => void
  onDropComponent: (type: Component['type'], x: number, y: number) => void
  restoreAnimating: boolean
  readOnly: boolean
}

type DragMode =
  | { type: 'none' }
  | { type: 'pan'; startX: number; startY: number; offsetX: number; offsetY: number }
  | { type: 'component'; componentId: string; startX: number; startY: number; origX: number; origY: number }
  | { type: 'wireCreate'; fromComponentId: string; fromPinId: string; startX: number; startY: number; mouseX: number; mouseY: number }
  | { type: 'wireControl'; wireId: string; controlIndex: number; startX: number; startY: number }

export default function Canvas({
  components, wires, selectedComponentId,
  onSelectComponent, onComponentsUpdate, onWiresUpdate,
  onDropComponent, restoreAnimating, readOnly
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ offsetX: 0, offsetY: 0, scale: 1 })
  const [dragMode, setDragMode] = useState<DragMode>({ type: 'none' })
  const [hoveredPin, setHoveredPin] = useState<{ componentId: string; pinId: string } | null>(null)
  const [animProgress, setAnimProgress] = useState(1)
  const animRef = useRef<number>(0)

  const screenToWorld = useCallback((sx: number, sy: number) => {
    return {
      x: (sx - view.offsetX) / view.scale,
      y: (sy - view.offsetY) / view.scale
    }
  }, [view])

  const getPinPosition = useCallback((comp: Component, pinId: string) => {
    const pin = comp.pins.find(p => p.id === pinId)
    if (!pin) return { x: comp.x, y: comp.y }
    const rad = (comp.rotation * Math.PI) / 180
    const cos = Math.cos(rad), sin = Math.sin(rad)
    return {
      x: comp.x + pin.offsetX * cos - pin.offsetY * sin,
      y: comp.y + pin.offsetX * sin + pin.offsetY * cos
    }
  }, [])

  useEffect(() => {
    if (restoreAnimating) {
      setAnimProgress(0)
      const startTime = performance.now()
      const duration = 500
      const animate = (t: number) => {
        const p = Math.min(1, (t - startTime) / duration)
        setAnimProgress(p)
        if (p < 1) animRef.current = requestAnimationFrame(animate)
      }
      animRef.current = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(animRef.current)
    } else {
      setAnimProgress(1)
    }
  }, [restoreAnimating, components])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = container.clientWidth * dpr
      canvas.height = container.clientHeight * dpr
      canvas.style.width = container.clientWidth + 'px'
      canvas.style.height = container.clientHeight + 'px'
      draw()
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const ctx = canvas.getContext('2d')!
      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const W = container.clientWidth, H = container.clientHeight

      const bgGrad = ctx.createLinearGradient(0, 0, W, H)
      bgGrad.addColorStop(0, '#1a1a2e')
      bgGrad.addColorStop(1, '#16213e')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, W, H)

      ctx.save()
      ctx.translate(view.offsetX, view.offsetY)
      ctx.scale(view.scale, view.scale)

      drawGrid(ctx, W / view.scale, H / view.scale, view.offsetX / view.scale, view.offsetY / view.scale)

      const time = performance.now() / 1000

      wires.forEach(wire => {
        drawWire(ctx, wire, components, time, getPinPosition)
      })

      if (dragMode.type === 'wireCreate') {
        drawWirePreview(ctx, dragMode, components, time, getPinPosition)
      }

      components.forEach(comp => {
        drawComponent(ctx, comp, selectedComponentId === comp.id, animProgress)
      })

      if (hoveredPin) {
        const comp = components.find(c => c.id === hoveredPin.componentId)
        if (comp) {
          const pos = getPinPosition(comp, hoveredPin.pinId)
          ctx.beginPath()
          ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(0,212,255,0.3)'
          ctx.fill()
          ctx.strokeStyle = '#00d4ff'
          ctx.lineWidth = 2
          ctx.stroke()
        }
      }

      ctx.restore()

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [components, wires, view, selectedComponentId, dragMode, hoveredPin, animProgress, getPinPosition])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    const newScale = Math.max(0.3, Math.min(3, view.scale * (1 + delta * 3)))
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = screenToWorld(sx, sy)
    setView({
      scale: newScale,
      offsetX: sx - world.x * newScale,
      offsetY: sy - world.y * newScale
    })
  }, [view, screenToWorld])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (readOnly) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = screenToWorld(sx, sy)

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setDragMode({ type: 'pan', startX: sx, startY: sy, offsetX: view.offsetX, offsetY: view.offsetY })
      return
    }

    for (const comp of components) {
      for (const pin of comp.pins) {
        const pos = getPinPosition(comp, pin.id)
        const dist = Math.hypot(world.x - pos.x, world.y - pos.y)
        if (dist < 12) {
          setDragMode({
            type: 'wireCreate',
            fromComponentId: comp.id,
            fromPinId: pin.id,
            startX: pos.x, startY: pos.y,
            mouseX: world.x, mouseY: world.y
          })
          return
        }
      }
    }

    for (const wire of wires) {
      const from = components.find(c => c.id === wire.fromComponentId)
      const to = components.find(c => c.id === wire.toComponentId)
      if (!from || !to) continue
      const fromPos = getPinPosition(from, wire.fromPinId)
      const toPos = getPinPosition(to, wire.toPinId)
      for (let i = 0; i < wire.controlPoints.length; i++) {
        const cp = wire.controlPoints[i]
        const cpX = cp.x !== undefined ? cp.x : (fromPos.x + toPos.x) / 2
        const cpY = cp.y !== undefined ? cp.y : (fromPos.y + toPos.y) / 2
        const dist = Math.hypot(world.x - cpX, world.y - cpY)
        if (dist < 10) {
          setDragMode({ type: 'wireControl', wireId: wire.id, controlIndex: i, startX: sx, startY: sy })
          return
        }
      }
    }

    for (let i = components.length - 1; i >= 0; i--) {
      const comp = components[i]
      const halfW = comp.type === 'resistor' || comp.type === 'battery' ? 30 : 25
      const halfH = 20
      const rad = (-comp.rotation * Math.PI) / 180
      const cos = Math.cos(rad), sin = Math.sin(rad)
      const dx = world.x - comp.x, dy = world.y - comp.y
      const lx = dx * cos - dy * sin
      const ly = dx * sin + dy * cos
      if (lx >= -halfW - 8 && lx <= halfW + 8 && ly >= -halfH - 8 && ly <= halfH + 8) {
        onSelectComponent(comp.id)
        setDragMode({ type: 'component', componentId: comp.id, startX: sx, startY: sy, origX: comp.x, origY: comp.y })
        return
      }
    }

    onSelectComponent(null)
    setDragMode({ type: 'pan', startX: sx, startY: sy, offsetX: view.offsetX, offsetY: view.offsetY })
  }, [components, wires, view, screenToWorld, getPinPosition, onSelectComponent, readOnly])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = screenToWorld(sx, sy)

    if (dragMode.type === 'none' && !readOnly) {
      let found: { componentId: string; pinId: string } | null = null
      for (const comp of components) {
        for (const pin of comp.pins) {
          const pos = getPinPosition(comp, pin.id)
          if (Math.hypot(world.x - pos.x, world.y - pos.y) < 12) {
            found = { componentId: comp.id, pinId: pin.id }
            break
          }
        }
        if (found) break
      }
      setHoveredPin(found)
    }

    switch (dragMode.type) {
      case 'pan':
        setView(v => ({ ...v, offsetX: dragMode.offsetX + (sx - dragMode.startX), offsetY: dragMode.offsetY + (sy - dragMode.startY) }))
        break
      case 'component': {
        const dx = (sx - dragMode.startX) / view.scale
        const dy = (sy - dragMode.startY) / view.scale
        onComponentsUpdate(components.map(c =>
          c.id === dragMode.componentId
            ? { ...c, x: dragMode.origX + dx, y: dragMode.origY + dy }
            : c
        ))
        break
      }
      case 'wireCreate':
        setDragMode({ ...dragMode, mouseX: world.x, mouseY: world.y })
        break
      case 'wireControl': {
        const dx = (sx - dragMode.startX) / view.scale
        const dy = (sy - dragMode.startY) / view.scale
        onWiresUpdate(wires.map(w => {
          if (w.id !== dragMode.wireId) return w
          const newCPs = [...w.controlPoints]
          if (newCPs[dragMode.controlIndex]) {
            newCPs[dragMode.controlIndex] = {
              x: newCPs[dragMode.controlIndex].x + dx,
              y: newCPs[dragMode.controlIndex].y + dy
            }
          }
          return { ...w, controlPoints: newCPs }
        }))
        setDragMode({ ...dragMode, startX: sx, startY: sy })
        break
      }
    }
  }, [dragMode, components, wires, view, screenToWorld, getPinPosition, onComponentsUpdate, onWiresUpdate, readOnly])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = screenToWorld(sx, sy)

    if (dragMode.type === 'wireCreate') {
      for (const comp of components) {
        if (comp.id === dragMode.fromComponentId) continue
        for (const pin of comp.pins) {
          const pos = getPinPosition(comp, pin.id)
          if (Math.hypot(world.x - pos.x, world.y - pos.y) < 15) {
            const from = components.find(c => c.id === dragMode.fromComponentId)
            const to = comp
            if (!from || !to) break
            const fromPos = getPinPosition(from, dragMode.fromPinId)
            const toPos = pos
            const newWire: Wire = {
              id: uuidv4(),
              fromComponentId: dragMode.fromComponentId,
              fromPinId: dragMode.fromPinId,
              toComponentId: comp.id,
              toPinId: pin.id,
              controlPoints: [{ x: (fromPos.x + toPos.x) / 2, y: (fromPos.y + toPos.y) / 2 }]
            }
            onWiresUpdate([...wires, newWire])
            break
          }
        }
      }
    }

    setDragMode({ type: 'none' })
  }, [dragMode, components, wires, screenToWorld, getPinPosition, onWiresUpdate])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (readOnly) return
    const type = e.dataTransfer.getData('componentType') as Component['type']
    if (!type) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top)
    onDropComponent(type, world.x, world.y)
  }, [screenToWorld, onDropComponent, readOnly])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', cursor: getCursor(dragMode, hoveredPin) }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { setDragMode({ type: 'none' }); setHoveredPin(null) }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      <div style={{
        position: 'absolute', bottom: 16, left: 16,
        background: 'rgba(16,16,32,0.8)', backdropFilter: 'blur(4px)',
        border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8,
        padding: '8px 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)',
        display: 'flex', gap: 16, alignItems: 'center'
      }}>
        <span>缩放: {(view.scale * 100).toFixed(0)}%</span>
        <span style={{ color: 'rgba(0,212,255,0.5)' }}>|</span>
        <span>Alt+拖拽 平移</span>
        <span style={{ color: 'rgba(0,212,255,0.5)' }}>|</span>
        <span>滚轮 缩放</span>
        <span style={{ color: 'rgba(0,212,255,0.5)' }}>|</span>
        <span>拖拽引脚 连线</span>
      </div>

      <div style={{
        position: 'absolute', top: 16, right: 16,
        display: 'flex', flexDirection: 'column', gap: 6
      }}>
        <ZoomBtn onClick={() => setView(v => ({ ...v, scale: Math.min(3, v.scale * 1.2) }))} icon="➕" />
        <ZoomBtn onClick={() => setView(v => ({ ...v, scale: Math.max(0.3, v.scale / 1.2) }))} icon="➖" />
        <ZoomBtn onClick={() => setView({ scale: 1, offsetX: 0, offsetY: 0 })} icon="⟳" />
      </div>

      {restoreAnimating && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(circle, transparent 0%, rgba(0,212,255,${0.1 * (1 - animProgress)}) 100%)`,
          transition: 'opacity 300ms'
        }} />
      )}
    </div>
  )
}

function ZoomBtn({ onClick, icon }: { onClick: () => void; icon: string }) {
  return (
    <button onClick={onClick} style={{
      width: 36, height: 36, background: 'rgba(16,16,32,0.8)',
      border: '1px solid rgba(0,212,255,0.25)',
      color: '#00d4ff', borderRadius: 8, cursor: 'pointer',
      fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 200ms'
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = 'rgba(0,212,255,0.15)'
      e.currentTarget.style.boxShadow = '0 0 10px rgba(0,212,255,0.3)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = 'rgba(16,16,32,0.8)'
      e.currentTarget.style.boxShadow = 'none'
    }}>{icon}</button>
  )
}

function getCursor(dragMode: DragMode, hoveredPin: { componentId: string; pinId: string } | null) {
  switch (dragMode.type) {
    case 'pan': return 'grabbing'
    case 'component': return 'move'
    case 'wireCreate': return 'crosshair'
    case 'wireControl': return 'move'
    default: return hoveredPin ? 'crosshair' : 'default'
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, ox: number, oy: number) {
  const step = 50
  ctx.strokeStyle = 'rgba(42,42,78,0.4)'
  ctx.lineWidth = 1
  ctx.beginPath()
  const startX = Math.floor(-ox / step) * step
  const startY = Math.floor(-oy / step) * step
  for (let x = startX; x < startX + w + step * 2; x += step) {
    ctx.moveTo(x, -oy)
    ctx.lineTo(x, -oy + h + step)
  }
  for (let y = startY; y < startY + h + step * 2; y += step) {
    ctx.moveTo(-ox, y)
    ctx.lineTo(-ox + w + step, y)
  }
  ctx.stroke()
  ctx.strokeStyle = 'rgba(0,212,255,0.08)'
  ctx.lineWidth = 1
  const bigStep = step * 4
  const bStartX = Math.floor(-ox / bigStep) * bigStep
  const bStartY = Math.floor(-oy / bigStep) * bigStep
  ctx.beginPath()
  for (let x = bStartX; x < bStartX + w + bigStep * 2; x += bigStep) {
    ctx.moveTo(x, -oy)
    ctx.lineTo(x, -oy + h + bigStep)
  }
  for (let y = bStartY; y < bStartY + h + bigStep * 2; y += bigStep) {
    ctx.moveTo(-ox, y)
    ctx.lineTo(-ox + w + bigStep, y)
  }
  ctx.stroke()
}

function drawComponent(ctx: CanvasRenderingContext2D, comp: Component, selected: boolean, animProgress: number) {
  const alpha = animProgress
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(comp.x, comp.y)
  ctx.rotate((comp.rotation * Math.PI) / 180)

  if (selected) {
    const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, 50)
    glow.addColorStop(0, 'rgba(0,212,255,0.2)')
    glow.addColorStop(1, 'rgba(0,212,255,0)')
    ctx.fillStyle = glow
    ctx.fillRect(-60, -60, 120, 120)

    ctx.strokeStyle = 'rgba(0,212,255,0.6)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    const pad = 10
    const halfW = comp.type === 'resistor' || comp.type === 'battery' ? 30 : 25
    ctx.strokeRect(-halfW - pad, -20 - pad, (halfW + pad) * 2, 40 + pad * 2)
    ctx.setLineDash([])
  }

  ctx.shadowBlur = 8
  ctx.shadowColor = '#00d4ff'
  ctx.strokeStyle = '#00d4ff'
  ctx.lineWidth = 2.5
  ctx.fillStyle = 'transparent'

  const label = Object.values(comp.properties)[0] || ''

  if (comp.type === 'resistor') {
    ctx.beginPath()
    ctx.moveTo(-30, 0)
    ctx.lineTo(-18, -8)
    ctx.lineTo(-6, 8)
    ctx.lineTo(6, -8)
    ctx.lineTo(18, 8)
    ctx.lineTo(30, 0)
    ctx.stroke()
  } else if (comp.type === 'capacitor') {
    ctx.beginPath()
    ctx.moveTo(-25, 0)
    ctx.lineTo(-5, 0)
    ctx.moveTo(5, 0)
    ctx.lineTo(25, 0)
    ctx.stroke()
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(-5, -14)
    ctx.lineTo(-5, 14)
    ctx.moveTo(5, -14)
    ctx.lineTo(5, 14)
    ctx.stroke()
  } else if (comp.type === 'battery') {
    ctx.beginPath()
    ctx.moveTo(-30, 0)
    ctx.lineTo(-10, 0)
    ctx.moveTo(10, 0)
    ctx.lineTo(30, 0)
    ctx.stroke()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#00d4ff'
    ctx.beginPath()
    ctx.moveTo(-10, -8)
    ctx.lineTo(-10, 8)
    ctx.stroke()
    ctx.shadowColor = '#ff8a4c'
    ctx.strokeStyle = '#ff8a4c'
    ctx.beginPath()
    ctx.moveTo(10, -16)
    ctx.lineTo(10, 16)
    ctx.stroke()
    ctx.shadowColor = '#ff8a4c'
    ctx.fillStyle = '#ff8a4c'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.shadowBlur = 0
    ctx.fillText(label, 0, -24)
    ctx.restore()
    return
  } else if (comp.type === 'switch') {
    ctx.beginPath()
    ctx.moveTo(-25, 0)
    ctx.lineTo(-8, 0)
    ctx.moveTo(8, 0)
    ctx.lineTo(25, 0)
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#00d4ff'
    ctx.beginPath()
    ctx.arc(-8, 0, 3, 0, Math.PI * 2)
    ctx.arc(8, 0, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 8
    ctx.shadowColor = '#00d4ff'
    ctx.beginPath()
    ctx.moveTo(-5, -2)
    ctx.lineTo(15, -12)
    ctx.stroke()
  }

  ctx.shadowBlur = 0
  ctx.fillStyle = '#00d4ff'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(label, 0, -18)

  comp.pins.forEach(pin => {
    ctx.beginPath()
    ctx.arc(pin.offsetX, pin.offsetY, 4, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,212,255,0.2)'
    ctx.fill()
    ctx.strokeStyle = '#00d4ff'
    ctx.lineWidth = 1.5
    ctx.stroke()
  })

  ctx.restore()
}

function drawWire(ctx: CanvasRenderingContext2D, wire: Wire, components: Component[], time: number,
  getPinPos: (c: Component, pid: string) => { x: number; y: number }) {
  const from = components.find(c => c.id === wire.fromComponentId)
  const to = components.find(c => c.id === wire.toComponentId)
  if (!from || !to) return
  const start = getPinPos(from, wire.fromPinId)
  const end = getPinPos(to, wire.toPinId)

  ctx.save()
  ctx.shadowBlur = 6
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'

  const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y)
  const offset = (time % 2) / 2
  const stops = [
    [0, '#ff8a4c'],
    [0.3 + offset * 0.4, '#ff5722'],
    [0.5 + offset * 0.4, '#00d4ff'],
    [1, '#0066ff']
  ] as [number, string][]
  stops.forEach(([p, c]) => grad.addColorStop(p, c))
  ctx.strokeStyle = grad

  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  if (wire.controlPoints.length > 0) {
    const cp = wire.controlPoints[0]
    if (wire.controlPoints.length === 1) {
      ctx.quadraticCurveTo(cp.x, cp.y, end.x, end.y)
    } else {
      ctx.bezierCurveTo(cp.x, cp.y, wire.controlPoints[1].x, wire.controlPoints[1].y, end.x, end.y)
    }
  } else {
    const mx = (start.x + end.x) / 2
    ctx.bezierCurveTo(mx, start.y, mx, end.y, end.x, end.y)
  }
  ctx.stroke()

  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(255,138,76,0.5)'
  wire.controlPoints.forEach(cp => {
    ctx.beginPath()
    ctx.arc(cp.x, cp.y, 4, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.restore()
}

function drawWirePreview(ctx: CanvasRenderingContext2D, drag: Extract<DragMode, { type: 'wireCreate' }>,
  components: Component[], time: number, getPinPos: (c: Component, pid: string) => { x: number; y: number }) {
  const from = components.find(c => c.id === drag.fromComponentId)
  if (!from) return
  const start = getPinPos(from, drag.fromPinId)
  ctx.save()
  ctx.setLineDash([6, 6])
  ctx.lineDashOffset = -time * 30
  ctx.shadowBlur = 8
  ctx.shadowColor = '#00d4ff'
  ctx.strokeStyle = 'rgba(0,212,255,0.8)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  const mx = (start.x + drag.mouseX) / 2
  ctx.bezierCurveTo(mx, start.y, mx, drag.mouseY, drag.mouseX, drag.mouseY)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.arc(drag.mouseX, drag.mouseY, 6, 0, Math.PI * 2)
  ctx.strokeStyle = '#00d4ff'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()
}
