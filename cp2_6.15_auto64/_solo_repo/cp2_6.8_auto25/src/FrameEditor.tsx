import { useRef, useEffect, useCallback } from 'react'
import { FrameData, FRAME_SIZE, renderFrameToCanvas } from './utils'
import { TRANSPARENT } from './palette'

interface FrameEditorProps {
  frame: FrameData
  selectedColor: string
  onPixelChange: (x: number, y: number, color: string) => void
}

const PIXEL_SCALE = 32

export default function FrameEditor({ frame, selectedColor, onPixelChange }: FrameEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPixelRef = useRef<{ x: number; y: number } | null>(null)

  const drawCheckerboard = useCallback((ctx: CanvasRenderingContext2D) => {
    const size = 16
    for (let y = 0; y < FRAME_SIZE; y++) {
      for (let x = 0; x < FRAME_SIZE; x++) {
        const isLight = (x + y) % 2 === 0
        ctx.fillStyle = isLight ? '#313244' : '#2a2a3e'
        ctx.fillRect(x * PIXEL_SCALE, y * PIXEL_SCALE, PIXEL_SCALE, PIXEL_SCALE)
      }
    }
  }, [])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    drawCheckerboard(ctx)
    renderFrameToCanvas(ctx, frame, PIXEL_SCALE, 0, 0)

    ctx.strokeStyle = '#45475a'
    ctx.lineWidth = 1
    for (let i = 0; i <= FRAME_SIZE; i++) {
      ctx.beginPath()
      ctx.moveTo(i * PIXEL_SCALE + 0.5, 0)
      ctx.lineTo(i * PIXEL_SCALE + 0.5, FRAME_SIZE * PIXEL_SCALE)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * PIXEL_SCALE + 0.5)
      ctx.lineTo(FRAME_SIZE * PIXEL_SCALE, i * PIXEL_SCALE + 0.5)
      ctx.stroke()
    }
  }, [frame, drawCheckerboard])

  useEffect(() => {
    redraw()
  }, [redraw])

  const getPixelPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / PIXEL_SCALE)
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / PIXEL_SCALE)
    if (x < 0 || x >= FRAME_SIZE || y < 0 || y >= FRAME_SIZE) return null
    return { x, y }
  }

  const handlePixelAction = (x: number, y: number, button: number) => {
    if (lastPixelRef.current && lastPixelRef.current.x === x && lastPixelRef.current.y === y) {
      return
    }
    lastPixelRef.current = { x, y }
    const color = button === 2 ? TRANSPARENT : selectedColor
    onPixelChange(x, y, color)
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    isDrawingRef.current = true
    lastPixelRef.current = null
    const pos = getPixelPos(e)
    if (pos) handlePixelAction(pos.x, pos.y, e.button)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const pos = getPixelPos(e)
    if (pos) handlePixelAction(pos.x, pos.y, e.button)
  }

  const handleMouseUp = () => {
    isDrawingRef.current = false
    lastPixelRef.current = null
  }

  const handleMouseLeave = () => {
    isDrawingRef.current = false
    lastPixelRef.current = null
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  const canvasSize = FRAME_SIZE * PIXEL_SCALE

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{
        padding: 12,
        background: '#2a2a3e',
        borderRadius: 8,
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)'
      }}>
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleContextMenu}
          style={{
            display: 'block',
            cursor: 'crosshair',
            imageRendering: 'pixelated',
            maxWidth: '100%',
            height: 'auto',
            borderRadius: 4
          }}
        />
      </div>
      <div style={{ fontSize: 12, color: '#a6adc8' }}>
        左键绘制 · 右键擦除 · 可拖动连续绘制
      </div>
    </div>
  )
}
