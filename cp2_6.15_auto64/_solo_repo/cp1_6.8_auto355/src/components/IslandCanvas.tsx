import { useRef, useEffect, useCallback } from 'react'
import { useCanvasStore } from '@/hooks/useCanvasStore'
import { generateIslandBackground, drawStroke } from '@/utils/canvasUtils'

export default function IslandCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const glowPhaseRef = useRef<number>(0)

  const regionSeed = useCanvasStore((s) => s.regionSeed)
  const brightness = useCanvasStore((s) => s.brightness)
  const strokes = useCanvasStore((s) => s.strokes)
  const isDrawing = useCanvasStore((s) => s.isDrawing)
  const currentStrokePoints = useCanvasStore((s) => s.currentStrokePoints)
  const brushColor = useCanvasStore((s) => s.brushColor)
  const brushSize = useCanvasStore((s) => s.brushSize)
  const glowMode = useCanvasStore((s) => s.glowMode)

  const startDrawing = useCanvasStore((s) => s.startDrawing)
  const continueDrawing = useCanvasStore((s) => s.continueDrawing)
  const finishDrawing = useCanvasStore((s) => s.finishDrawing)

  const redrawBackground = useCallback(() => {
    const bgCanvas = bgCanvasRef.current
    if (!bgCanvas) return
    const bgCtx = bgCanvas.getContext('2d')
    if (!bgCtx) return

    const w = bgCanvas.width
    const h = bgCanvas.height
    generateIslandBackground(bgCtx, w, h, regionSeed, brightness)
  }, [regionSeed, brightness])

  useEffect(() => {
    const canvas = canvasRef.current
    const bgCanvas = bgCanvasRef.current
    if (!canvas || !bgCanvas) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const w = window.innerWidth
      const h = window.innerHeight

      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`

      bgCanvas.width = w * dpr
      bgCanvas.height = h * dpr
      bgCanvas.style.width = `${w}px`
      bgCanvas.style.height = `${h}px`

      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
      const bgCtx = bgCanvas.getContext('2d')
      if (bgCtx) bgCtx.scale(dpr, dpr)

      redrawBackground()
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [redrawBackground])

  useEffect(() => {
    redrawBackground()
  }, [redrawBackground])

  useEffect(() => {
    const canvas = canvasRef.current
    const bgCanvas = bgCanvasRef.current
    if (!canvas || !bgCanvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      const w = canvas.width / (window.devicePixelRatio || 1)
      const h = canvas.height / (window.devicePixelRatio || 1)

      ctx.clearRect(0, 0, w, h)

      glowPhaseRef.current += 0.04
      const glowPhase = glowPhaseRef.current

      for (const stroke of strokes) {
        drawStroke(ctx, stroke, glowPhase)
      }

      if (isDrawing && currentStrokePoints.length >= 2) {
        const liveStroke = {
          id: 'live',
          regionId: '',
          points: currentStrokePoints,
          color: brushColor,
          size: brushSize,
          glow: glowMode,
          userId: '',
          timestamp: Date.now(),
        }
        drawStroke(ctx, liveStroke, glowPhase)
      }

      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [strokes, isDrawing, currentStrokePoints, brushColor, brushSize, glowMode])

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }

    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0]
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const pos = getPos(e)
    startDrawing(pos.x, pos.y)
  }, [startDrawing, getPos])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return
    const pos = getPos(e)
    continueDrawing(pos.x, pos.y)
  }, [isDrawing, continueDrawing, getPos])

  const handleMouseUp = useCallback(() => {
    finishDrawing()
  }, [finishDrawing])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const pos = getPos(e)
    startDrawing(pos.x, pos.y)
  }, [startDrawing, getPos])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing) return
    const pos = getPos(e)
    continueDrawing(pos.x, pos.y)
  }, [isDrawing, continueDrawing, getPos])

  const handleTouchEnd = useCallback(() => {
    finishDrawing()
  }, [finishDrawing])

  return (
    <div className="absolute inset-0 overflow-hidden">
      <canvas
        ref={bgCanvasRef}
        className="absolute inset-0"
        style={{ cursor: 'crosshair' }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ cursor: 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  )
}
