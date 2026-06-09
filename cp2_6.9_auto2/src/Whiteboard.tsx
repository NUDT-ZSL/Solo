import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import rough from 'roughjs/bundled/rough.esm.js'
import type { Point, Stroke, StickyNote, Tool, Viewport, User } from './types'

export interface WhiteboardHandle {
  exportPNG: () => void
  undo: () => void
  redo: () => void
}

interface WhiteboardProps {
  tool: Tool
  userId: string
  userColor: string
  strokes: Stroke[]
  stickyNotes: StickyNote[]
  onStrokeAdd: (stroke: Stroke) => void
  onStickyAdd: (note: StickyNote) => void
  onStickyUpdate: (note: StickyNote) => void
  onStrokeUndo: (strokeId: string) => void
  onStrokeRedo: (stroke: Stroke) => void
  users: User[]
}

const STICKY_COLORS = ['#FFE566', '#98D8C8', '#F7B2AD', '#B5EAD7', '#C7CEEA']

const Whiteboard = forwardRef<WhiteboardHandle, WhiteboardProps>(function Whiteboard(
  { tool, userId, userColor, strokes, stickyNotes, onStrokeAdd, onStickyAdd, onStickyUpdate, users },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stickyLayerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 })
  const viewportRef = useRef(viewport)
  viewportRef.current = viewport

  const [isDrawing, setIsDrawing] = useState(false)
  const currentStrokeRef = useRef<Stroke | null>(null)
  const lastPointRef = useRef<Point | null>(null)

  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef<Point | null>(null)
  const viewportStartRef = useRef<Viewport | null>(null)

  const [isAnimating, setIsAnimating] = useState(false)
  const animFrameRef = useRef<number | null>(null)

  const [maxZIndex, setMaxZIndex] = useState(10)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)

  const canvasSizeRef = useRef({ width: 0, height: 0 })

  const getCanvasPoint = useCallback((clientX: number, clientY: number): Point => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const vp = viewportRef.current
    return {
      x: (clientX - rect.left - vp.x) / vp.scale,
      y: (clientY - rect.top - vp.y) / vp.scale
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
    canvasSizeRef.current = { width: rect.width, height: rect.height }

    const ctx = canvas.getContext('2d')
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    redraw()
  }, [])

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, vp: Viewport, w: number, h: number) => {
    const gridSize = 40 * vp.scale
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1

    const offsetX = ((vp.x % gridSize) + gridSize) % gridSize
    const offsetY = ((vp.y % gridSize) + gridSize) % gridSize

    ctx.beginPath()
    for (let x = offsetX; x < w; x += gridSize) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
    }
    for (let y = offsetY; y < h; y += gridSize) {
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()
  }, [])

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke, vp: Viewport) => {
    if (stroke.points.length < 2) return

    ctx.save()
    ctx.translate(vp.x, vp.y)
    ctx.scale(vp.scale, vp.scale)

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = stroke.width * 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
      }
      ctx.stroke()
    } else {
      const rc = rough.canvas(canvasRef.current!)
      rc.line(
        stroke.points[0].x,
        stroke.points[0].y,
        stroke.points[stroke.points.length - 1].x,
        stroke.points[stroke.points.length - 1].y,
        {
          stroke: stroke.color,
          strokeWidth: stroke.width,
          roughness: stroke.roughness ?? 1.2,
          bowing: 0.5
        }
      )

      ctx.strokeStyle = stroke.color + '40'
      ctx.lineWidth = stroke.width + 4
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalCompositeOperation = 'lighter'
      ctx.shadowBlur = 12
      ctx.shadowColor = stroke.color
      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
      }
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    ctx.restore()
  }, [])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const vp = viewportRef.current
    const { width, height } = canvasSizeRef.current

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#fafbfc'
    ctx.fillRect(0, 0, width, height)

    drawGrid(ctx, vp, width, height)

    ctx.save()
    strokes.forEach((stroke) => {
      drawStroke(ctx, stroke, vp)
    })
    ctx.restore()

    if (currentStrokeRef.current) {
      drawStroke(ctx, currentStrokeRef.current, vp)
    }
  }, [strokes, drawGrid, drawStroke])

  useEffect(() => {
    redraw()
  }, [redraw])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  const animateViewport = useCallback((targetVp: Viewport) => {
    if (isAnimating) return
    setIsAnimating(true)

    const startVp = { ...viewportRef.current }
    const startTime = performance.now()
    const duration = 200

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

    const tick = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = easeOutCubic(t)

      const newVp: Viewport = {
        x: startVp.x + (targetVp.x - startVp.x) * eased,
        y: startVp.y + (targetVp.y - startVp.y) * eased,
        scale: startVp.scale + (targetVp.scale - startVp.scale) * eased
      }

      setViewport(newVp)
      viewportRef.current = newVp
      redraw()

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(tick)
      } else {
        setIsAnimating(false)
      }
    }

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = requestAnimationFrame(tick)
  }, [isAnimating, redraw])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-sticky]')) return
    if (target.closest('[data-toolbar]')) return

    const point = getCanvasPoint(e.clientX, e.clientY)

    if (tool === 'pan' || e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true)
      panStartRef.current = { x: e.clientX, y: e.clientY }
      viewportStartRef.current = { ...viewportRef.current }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      return
    }

    if (tool === 'sticky') return

    if (tool === 'pen' || tool === 'eraser') {
      setIsDrawing(true)
      currentStrokeRef.current = {
        id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        points: [point],
        color: tool === 'eraser' ? '#000000' : userColor,
        width: tool === 'pen' ? 3 : 8,
        userId,
        tool,
        roughness: 1.2
      }
      lastPointRef.current = point
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning && panStartRef.current && viewportStartRef.current) {
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y
      const newVp = {
        x: viewportStartRef.current.x + dx,
        y: viewportStartRef.current.y + dy,
        scale: viewportStartRef.current.scale
      }
      setViewport(newVp)
      viewportRef.current = newVp
      redraw()
      return
    }

    if (!isDrawing || !currentStrokeRef.current) return

    const point = getCanvasPoint(e.clientX, e.clientY)
    const last = lastPointRef.current
    if (last) {
      const dist = Math.hypot(point.x - last.x, point.y - last.y)
      if (dist < 1.5) return
    }

    currentStrokeRef.current.points.push(point)
    lastPointRef.current = point
    redraw()
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      setIsPanning(false)
      panStartRef.current = null
      viewportStartRef.current = null
      return
    }

    if (isDrawing && currentStrokeRef.current && currentStrokeRef.current.points.length > 1) {
      onStrokeAdd({ ...currentStrokeRef.current })
    }

    setIsDrawing(false)
    currentStrokeRef.current = null
    lastPointRef.current = null
  }

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool !== 'sticky') return
    const target = e.target as HTMLElement
    if (target.closest('[data-sticky]')) return

    const point = getCanvasPoint(e.clientX, e.clientY)
    const note: StickyNote = {
      id: 'sticky_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      x: point.x - 80,
      y: point.y - 50,
      width: 180,
      height: 140,
      text: '',
      color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
      userId,
      zIndex: maxZIndex + 1
    }
    setMaxZIndex(maxZIndex + 1)
    onStickyAdd(note)
    setTimeout(() => setEditingNoteId(note.id), 50)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (isAnimating) return

    const rect = canvasRef.current!.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const vp = viewportRef.current
    const worldX = (mouseX - vp.x) / vp.scale
    const worldY = (mouseY - vp.y) / vp.scale

    const delta = -e.deltaY * 0.0015
    const newScale = Math.min(Math.max(vp.scale * (1 + delta), 0.1), 5)

    const newVp = {
      x: mouseX - worldX * newScale,
      y: mouseY - worldY * newScale,
      scale: newScale
    }

    animateViewport(newVp)
  }

  const handleStickyPointerDown = (e: React.PointerEvent, note: StickyNote) => {
    e.stopPropagation()
    if (editingNoteId === note.id) return

    const target = e.target as HTMLElement
    if (target.tagName === 'TEXTAREA') return

    const startX = e.clientX
    const startY = e.clientY
    const startNoteX = note.x
    const startNoteY = note.y
    const vp = viewportRef.current

    const newZ = maxZIndex + 1
    setMaxZIndex(newZ)
    const updated = { ...note, zIndex: newZ }
    onStickyUpdate(updated)

    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / vp.scale
      const dy = (ev.clientY - startY) / vp.scale
      onStickyUpdate({
        ...updated,
        x: startNoteX + dx,
        y: startNoteY + dy
      })
    }

    const up = () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
    }

    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
  }

  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const vp = viewportRef.current

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    strokes.forEach((s) => {
      s.points.forEach((p) => {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      })
    })
    stickyNotes.forEach((n) => {
      minX = Math.min(minX, n.x)
      minY = Math.min(minY, n.y)
      maxX = Math.max(maxX, n.x + n.width)
      maxY = Math.max(maxY, n.y + n.height)
    })

    if (minX === Infinity) {
      minX = -200; minY = -200; maxX = 600; maxY = 400
    }

    const padding = 60
    const worldW = maxX - minX + padding * 2
    const worldH = maxY - minY + padding * 2
    const scale = 2
    const outW = Math.floor(worldW * scale)
    const outH = Math.floor(worldH * scale)

    const offscreen = document.createElement('canvas')
    offscreen.width = outW
    offscreen.height = outH
    const octx = offscreen.getContext('2d')!
    octx.fillStyle = '#fafbfc'
    octx.fillRect(0, 0, outW, outH)
    octx.scale(scale, scale)
    octx.translate(-minX + padding, -minY + padding)

    const gridSize = 40
    octx.strokeStyle = '#e5e7eb'
    octx.lineWidth = 1
    const startGX = Math.floor((minX - padding) / gridSize) * gridSize
    const startGY = Math.floor((minY - padding) / gridSize) * gridSize
    for (let x = startGX; x < maxX + padding; x += gridSize) {
      octx.beginPath()
      octx.moveTo(x, minY - padding)
      octx.lineTo(x, maxY + padding)
      octx.stroke()
    }
    for (let y = startGY; y < maxY + padding; y += gridSize) {
      octx.beginPath()
      octx.moveTo(minX - padding, y)
      octx.lineTo(maxX + padding, y)
      octx.stroke()
    }

    const exportVp = { x: -minX + padding, y: -minY + padding, scale: 1 }

    const tempCanvas = canvas
    canvas.width = outW
    canvas.height = outH
    const tctx = canvas.getContext('2d')!
    tctx.scale(scale, scale)

    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return
      if (stroke.tool === 'eraser') return

      const rc = rough.canvas(canvas)
      rc.line(
        stroke.points[0].x - minX + padding,
        stroke.points[0].y - minY + padding,
        stroke.points[stroke.points.length - 1].x - minX + padding,
        stroke.points[stroke.points.length - 1].y - minY + padding,
        {
          stroke: stroke.color,
          strokeWidth: stroke.width,
          roughness: stroke.roughness ?? 1.2,
          bowing: 0.5
        }
      )
    })

    stickyNotes.forEach((note) => {
      const nx = note.x - minX + padding
      const ny = note.y - minY + padding

      octx.fillStyle = note.color
      octx.beginPath()
      octx.roundRect(nx, ny, note.width, note.height, 10)
      octx.fill()
      octx.strokeStyle = 'rgba(0,0,0,0.08)'
      octx.lineWidth = 1
      octx.stroke()

      if (note.text) {
        octx.fillStyle = '#1f2937'
        octx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        wrapText(octx, note.text, nx + 14, ny + 24, note.width - 28, 20)
      }
    })

    tctx.drawImage(offscreen, 0, 0)
    resizeCanvas()

    const link = document.createElement('a')
    link.download = 'whiteboard-' + Date.now() + '.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [strokes, stickyNotes, resizeCanvas])

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = text.split('\n')
    let yy = y
    words.forEach((word) => {
      if (ctx.measureText(word).width <= maxWidth) {
        ctx.fillText(word, x, yy)
        yy += lineHeight
      } else {
        let line = ''
        for (let i = 0; i < word.length; i++) {
          const test = line + word[i]
          if (ctx.measureText(test).width > maxWidth && line) {
            ctx.fillText(line, x, yy)
            yy += lineHeight
            line = word[i]
          } else {
            line = test
          }
        }
        if (line) {
          ctx.fillText(line, x, yy)
          yy += lineHeight
        }
      }
    })
  }

  useImperativeHandle(ref, () => ({
    exportPNG,
    undo: () => {},
    redo: () => {}
  }), [exportPNG])

  const cursorStyle = (() => {
    if (isPanning) return 'grabbing'
    switch (tool) {
      case 'pen': return 'crosshair'
      case 'eraser': return 'cell'
      case 'sticky': return 'copy'
      case 'pan': return 'grab'
      default: return 'default'
    }
  })()

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        cursor: cursorStyle,
        touchAction: 'none'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      <div
        ref={stickyLayerRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          transformOrigin: '0 0',
          willChange: 'transform'
        }}
      >
        {stickyNotes.sort((a, b) => a.zIndex - b.zIndex).map((note) => (
          <div
            key={note.id}
            data-sticky
            style={{
              position: 'absolute',
              left: note.x,
              top: note.y,
              width: note.width,
              height: note.height,
              background: note.color,
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
              padding: '14px 14px 16px',
              boxSizing: 'border-box',
              pointerEvents: 'auto',
              cursor: editingNoteId === note.id ? 'text' : 'grab',
              userSelect: 'none',
              transition: 'box-shadow 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid rgba(0,0,0,0.05)'
            }}
            onPointerDown={(e) => handleStickyPointerDown(e, note)}
            onDoubleClick={(e) => {
              e.stopPropagation()
              setEditingNoteId(note.id)
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)'
            }}
          >
            <div
              style={{
                width: 28,
                height: 5,
                background: 'rgba(0,0,0,0.1)',
                borderRadius: 3,
                alignSelf: 'center',
                marginBottom: 8,
                flexShrink: 0
              }}
            />
            {editingNoteId === note.id ? (
              <textarea
                autoFocus
                value={note.text}
                onChange={(e) => onStickyUpdate({ ...note, text: e.target.value })}
                onBlur={() => setEditingNoteId(null)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontSize: 14,
                  color: '#1f2937',
                  lineHeight: 1.5,
                  padding: 0,
                  width: '100%',
                  cursor: 'text'
                }}
                placeholder="输入内容..."
              />
            ) : (
              <div
                style={{
                  flex: 1,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontSize: 14,
                  color: note.text ? '#1f2937' : '#9ca3af',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflow: 'hidden'
                }}
              >
                {note.text || '双击编辑...'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
})

export default Whiteboard
