import React, { useRef, useEffect, useCallback } from 'react'
import './Visualizer.css'

interface VisualizerProps {
  frequencyDataRef: React.MutableRefObject<Uint8Array>
}

const Visualizer: React.FC<VisualizerProps> = ({ frequencyDataRef }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const getGradientColor = useCallback(
    (ctx: CanvasRenderingContext2D, index: number, total: number, height: number): CanvasGradient => {
      const ratio = index / total
      const gradient = ctx.createLinearGradient(0, 0, 0, height)

      if (ratio < 0.25) {
        gradient.addColorStop(0, '#ff1744')
        gradient.addColorStop(1, '#ff6e40')
      } else if (ratio < 0.5) {
        gradient.addColorStop(0, '#ffab00')
        gradient.addColorStop(1, '#ffea00')
      } else if (ratio < 0.75) {
        gradient.addColorStop(0, '#76ff03')
        gradient.addColorStop(1, '#00e676')
      } else {
        gradient.addColorStop(0, '#2979ff')
        gradient.addColorStop(1, '#9c27b0')
      }

      return gradient
    },
    []
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const offscreen = offscreenCanvasRef.current
    if (!canvas || !offscreen) return

    const ctx = canvas.getContext('2d')
    const offCtx = offscreen.getContext('2d')
    if (!ctx || !offCtx) return

    const width = canvas.width
    const height = canvas.height

    offCtx.clearRect(0, 0, width, height)
    offCtx.drawImage(canvas, 0, 1)

    ctx.fillStyle = 'rgba(5, 5, 5, 0.02)'
    ctx.fillRect(0, 0, width, height)

    ctx.globalCompositeOperation = 'source-over'

    const frequencyData = frequencyDataRef.current
    const barCount = 128
    const dpr = window.devicePixelRatio || 1
    const barWidth = Math.max(2 * dpr, Math.min(6 * dpr, width / barCount))

    for (let i = 0; i < barCount; i++) {
      const value = frequencyData[i] || 0
      const barHeight = Math.max(1, (value / 255) * 80 * dpr)
      const x = i * barWidth

      const gradient = getGradientColor(ctx, i, barCount, barHeight)
      ctx.fillStyle = gradient
      ctx.globalAlpha = value / 255
      ctx.fillRect(x, 0, barWidth - 0.5 * dpr, barHeight)
    }

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'destination-over'
    ctx.drawImage(offscreen, 0, 0)
    ctx.globalCompositeOperation = 'source-over'

    animationFrameRef.current = requestAnimationFrame(draw)
  }, [frequencyDataRef, getGradientColor])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const offscreen = document.createElement('canvas')
    offscreenCanvasRef.current = offscreen

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (container) {
        const dpr = window.devicePixelRatio || 1
        const cssWidth = container.clientWidth
        const cssHeight = 300

        canvas.width = cssWidth * dpr
        canvas.height = cssHeight * dpr
        canvas.style.width = cssWidth + 'px'
        canvas.style.height = cssHeight + 'px'

        offscreen.width = cssWidth * dpr
        offscreen.height = cssHeight * dpr

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#050505'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(draw)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [draw])

  return (
    <div className="visualizer-container">
      <canvas ref={canvasRef} className="visualizer-canvas" />
    </div>
  )
}

export default Visualizer
