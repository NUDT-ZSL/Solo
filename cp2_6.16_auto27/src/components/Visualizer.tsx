import React, { useRef, useEffect, useCallback } from 'react'
import './Visualizer.css'

interface VisualizerProps {
  frequencyDataRef: React.MutableRefObject<Uint8Array>
  frequencyVersionRef: React.MutableRefObject<number>
}

const BAR_COUNT = 128

const Visualizer: React.FC<VisualizerProps> = ({ frequencyDataRef, frequencyVersionRef }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const historyCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastVersionRef = useRef<number>(0)
  const paletteRef = useRef<{ r: number; g: number; b: number }[]>([])

  const buildPalette = useCallback(() => {
    const palette: { r: number; g: number; b: number }[] = []
    for (let i = 0; i < BAR_COUNT; i++) {
      const ratio = i / BAR_COUNT
      let r: number, g: number, b: number
      if (ratio < 0.25) {
        const t = ratio / 0.25
        r = 255
        g = Math.floor(23 + t * 150)
        b = Math.floor(68 - t * 68)
      } else if (ratio < 0.5) {
        const t = (ratio - 0.25) / 0.25
        r = Math.floor(255 - t * 100)
        g = Math.floor(173 + t * 82)
        b = 0
      } else if (ratio < 0.75) {
        const t = (ratio - 0.5) / 0.25
        r = Math.floor(155 - t * 110)
        g = 255
        b = Math.floor(t * 150)
      } else {
        const t = (ratio - 0.75) / 0.25
        r = Math.floor(45 + t * 111)
        g = Math.floor(255 - t * 216)
        b = Math.floor(100 + t * 76)
      }
      palette.push({ r, g, b })
    }
    paletteRef.current = palette
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const historyCanvas = historyCanvasRef.current
    if (!canvas || !historyCanvas) {
      animationFrameRef.current = requestAnimationFrame(draw)
      return
    }

    const ctx = canvas.getContext('2d', { alpha: false })
    const historyCtx = historyCanvas.getContext('2d', { alpha: false })
    if (!ctx || !historyCtx) {
      animationFrameRef.current = requestAnimationFrame(draw)
      return
    }

    const width = canvas.width
    const height = canvas.height
    const dpr = window.devicePixelRatio || 1
    const barWidth = Math.max(2 * dpr, Math.min(6 * dpr, width / BAR_COUNT))
    const shiftPixels = Math.max(1, Math.round(1 * dpr))

    const frequencyData = frequencyDataRef.current
    const hasNewData = frequencyVersionRef.current !== lastVersionRef.current
    lastVersionRef.current = frequencyVersionRef.current

    if (hasNewData && frequencyData && frequencyData.length >= BAR_COUNT && height > shiftPixels && width > 0) {
      try {
        const srcY = 0
        const srcH = height - shiftPixels
        const imageData = historyCtx.getImageData(0, srcY, width, srcH)
        historyCtx.putImageData(imageData, 0, shiftPixels)
        historyCtx.clearRect(0, 0, width, shiftPixels)
      } catch {
        historyCtx.fillStyle = '#050505'
        historyCtx.fillRect(0, 0, width, shiftPixels)
      }

      const palette = paletteRef.current

      for (let i = 0; i < BAR_COUNT; i++) {
        const value = frequencyData[i]
        if (value <= 10) continue

        const barHeight = Math.max(shiftPixels, (value / 255) * 60 * dpr)
        const color = palette[i]
        const alpha = Math.min(1, value / 200)
        const x = i * barWidth

        historyCtx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`
        historyCtx.fillRect(x, 0, barWidth - 0.5 * dpr, barHeight)
      }
    }

    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#050505'
    ctx.fillRect(0, 0, width, height)

    ctx.globalAlpha = 0.96
    ctx.drawImage(historyCanvas, 0, 0)
    ctx.globalAlpha = 1

    animationFrameRef.current = requestAnimationFrame(draw)
  }, [frequencyDataRef, frequencyVersionRef])

  useEffect(() => {
    buildPalette()

    const canvas = canvasRef.current
    if (!canvas) return

    const historyCanvas = document.createElement('canvas')
    historyCanvasRef.current = historyCanvas

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return

      const dpr = window.devicePixelRatio || 1
      const cssWidth = container.clientWidth
      const cssHeight = 300

      const newWidth = cssWidth * dpr
      const newHeight = cssHeight * dpr

      const oldWidth = historyCanvas.width
      const oldHeight = historyCanvas.height
      let previousSnapshot: ImageData | null = null

      if (oldWidth > 0 && oldHeight > 0) {
        try {
          const hctx = historyCanvas.getContext('2d', { alpha: false })
          if (hctx) {
            previousSnapshot = hctx.getImageData(0, 0, oldWidth, oldHeight)
          }
        } catch {
          previousSnapshot = null
        }
      }

      canvas.width = newWidth
      canvas.height = newHeight
      canvas.style.width = cssWidth + 'px'
      canvas.style.height = cssHeight + 'px'

      historyCanvas.width = newWidth
      historyCanvas.height = newHeight

      const ctx = canvas.getContext('2d', { alpha: false })
      if (ctx) {
        ctx.fillStyle = '#050505'
        ctx.fillRect(0, 0, newWidth, newHeight)
      }

      const hctx = historyCanvas.getContext('2d', { alpha: false })
      if (hctx) {
        hctx.fillStyle = '#050505'
        hctx.fillRect(0, 0, newWidth, newHeight)

        if (previousSnapshot && newWidth >= oldWidth && newHeight >= oldHeight) {
          try {
            const tempCanvas = document.createElement('canvas')
            tempCanvas.width = oldWidth
            tempCanvas.height = oldHeight
            const tctx = tempCanvas.getContext('2d', { alpha: false })
            if (tctx) {
              tctx.putImageData(previousSnapshot, 0, 0)
              hctx.drawImage(tempCanvas, 0, newHeight - oldHeight, oldWidth, oldHeight)
            }
          } catch {
          }
        }
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [buildPalette])

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(draw)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
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
