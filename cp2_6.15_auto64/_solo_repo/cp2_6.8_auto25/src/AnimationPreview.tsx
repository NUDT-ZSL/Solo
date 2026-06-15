import { useRef, useEffect, useCallback } from 'react'
import { FrameData, FRAME_SIZE, renderFrameToCanvas } from './utils'

interface AnimationPreviewProps {
  frames: FrameData[]
  currentFrame: number
  isPlaying: boolean
  speed: number
  frameDuration: number
  onFrameChange: (index: number) => void
  onTogglePlay: () => void
}

export default function AnimationPreview({
  frames,
  currentFrame,
  isPlaying,
  speed,
  frameDuration,
  onFrameChange,
  onTogglePlay
}: AnimationPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const elapsedRef = useRef<number>(0)

  const PREVIEW_SCALE = 6
  const previewSize = FRAME_SIZE * PREVIEW_SCALE

  const drawCheckerboard = useCallback((ctx: CanvasRenderingContext2D) => {
    const cell = PREVIEW_SCALE
    for (let y = 0; y < FRAME_SIZE; y++) {
      for (let x = 0; x < FRAME_SIZE; x++) {
        const isLight = (x + y) % 2 === 0
        ctx.fillStyle = isLight ? '#313244' : '#2a2a3e'
        ctx.fillRect(x * cell, y * cell, cell, cell)
      }
    }
  }, [])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (frames.length === 0) return

    ctx.imageSmoothingEnabled = false
    drawCheckerboard(ctx)

    const frame = frames[currentFrame]
    if (frame) {
      renderFrameToCanvas(ctx, frame, PREVIEW_SCALE, 0, 0)
    }
  }, [frames, currentFrame, drawCheckerboard])

  useEffect(() => {
    redraw()
  }, [redraw])

  useEffect(() => {
    if (!isPlaying || frames.length <= 1) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    const effectiveDuration = frameDuration / speed

    const animate = (time: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time
      }
      const delta = time - lastTimeRef.current
      lastTimeRef.current = time
      elapsedRef.current += delta

      if (elapsedRef.current >= effectiveDuration) {
        elapsedRef.current = 0
        onFrameChange((currentFrame + 1) % frames.length)
      }
      rafRef.current = requestAnimationFrame(animate)
    }

    lastTimeRef.current = 0
    elapsedRef.current = 0
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isPlaying, speed, frameDuration, frames.length, currentFrame, onFrameChange])

  const handlePrev = () => {
    const next = currentFrame <= 0 ? frames.length - 1 : currentFrame - 1
    onFrameChange(next)
  }

  const handleNext = () => {
    const next = (currentFrame + 1) % frames.length
    onFrameChange(next)
  }

  const buttonStyle: React.CSSProperties = {
    background: '#45475a',
    color: '#cdd6f4',
    border: 'none',
    borderRadius: 6,
    padding: '8px 14px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    transition: 'background 0.15s'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{
        padding: 12,
        background: '#1a1a26',
        borderRadius: 8,
        border: '2px solid #45475a'
      }}>
        <canvas
          ref={canvasRef}
          width={previewSize}
          height={previewSize}
          style={{
            display: 'block',
            imageRendering: 'pixelated',
            borderRadius: 4
          }}
        />
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, color: '#cdd6f4' }}>
        帧 {currentFrame + 1} / {frames.length}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={buttonStyle} onClick={handlePrev} title="上一帧">
          ◀
        </button>
        <button
          style={{
            ...buttonStyle,
            background: isPlaying ? '#f38ba8' : '#a6e3a1',
            color: isPlaying ? '#1e1e2e' : '#1e1e2e',
            minWidth: 80
          }}
          onClick={onTogglePlay}
        >
          {isPlaying ? '⏸ 暂停' : '▶ 播放'}
        </button>
        <button style={buttonStyle} onClick={handleNext} title="下一帧">
          ▶
        </button>
      </div>
    </div>
  )
}
