import React, { useRef, useEffect, useCallback, useState } from 'react'
import { CANVAS_ASPECT_RATIO, MAX_BLOBS, MOOD_PALETTES } from '../constants'
import type { InkBlob, HSLColor, MoodPalette } from '../types'

interface CanvasProps {
  blobs: InkBlob[]
  selectedPalette: MoodPalette | null
  currentColor: HSLColor | null
  brushSize: number
  triggeredBlobIndices: Set<number>
  onBlobAdd: (blob: InkBlob) => void
  onCanvasColorPick?: (color: HSLColor) => void
  isEyedropperActive: boolean
}

const Canvas: React.FC<CanvasProps> = ({
  blobs,
  selectedPalette,
  currentColor,
  brushSize,
  triggeredBlobIndices,
  onBlobAdd,
  onCanvasColorPick,
  isEyedropperActive
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const animBlobsRef = useRef<Map<string, { diffusionStart: number }>>(new Map())
  const triggeredRef = useRef<Set<number>>(new Set())
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return
      const container = containerRef.current
      const padding = 48
      const availW = container.clientWidth - padding * 2
      const availH = container.clientHeight - padding * 2
      let w: number, h: number
      if (availW / availH > CANVAS_ASPECT_RATIO) {
        h = availH
        w = h * CANVAS_ASPECT_RATIO
      } else {
        w = availW
        h = w / CANVAS_ASPECT_RATIO
      }
      setDimensions({ width: Math.round(w), height: Math.round(h) })
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const hslToString = (c: HSLColor, alpha = 1) =>
    `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha})`

  const generatePolygonPoints = (cx: number, cy: number, size: number, count: number): number[] => {
    const points: number[] = []
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3
      const r = size * (0.7 + Math.random() * 0.5)
      points.push(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
    }
    return points
  }

  const drawShape = useCallback((
    ctx: CanvasRenderingContext2D,
    blob: InkBlob,
    diffusion: number,
    pulseScale: number
  ) => {
    ctx.save()
    ctx.translate(blob.x, blob.y)
    ctx.rotate(blob.rotation)
    const scale = (1 + (diffusion - 1) * 0.3) * pulseScale
    ctx.scale(scale, scale)
    ctx.translate(-blob.x, -blob.y)

    const baseAlpha = 0.85

    for (let layer = 3; layer >= 0; layer--) {
      const layerSize = blob.size * (1 + layer * 0.15)
      const layerAlpha = baseAlpha * (1 - layer * 0.22) * Math.min(1, diffusion * 1.5)
      const blurRadius = (2 + layer * 3) * diffusion

      ctx.save()
      ctx.globalAlpha = layerAlpha
      ctx.filter = `blur(${blurRadius}px)`
      ctx.fillStyle = hslToString(blob.color)

      if (blob.shape === 'circle') {
        ctx.beginPath()
        ctx.arc(blob.x, blob.y, layerSize, 0, Math.PI * 2)
        ctx.fill()
      } else if (blob.shape === 'ellipse') {
        ctx.beginPath()
        ctx.ellipse(blob.x, blob.y, layerSize * 1.2, layerSize * 0.7, 0, 0, Math.PI * 2)
        ctx.fill()
      } else if (blob.shape === 'polygon' && blob.points) {
        const pts = blob.points
        ctx.beginPath()
        const scaleFactor = 1 + layer * 0.12
        ctx.moveTo(
          blob.x + (pts[0] - blob.x) * scaleFactor,
          blob.y + (pts[1] - blob.y) * scaleFactor
        )
        for (let i = 2; i < pts.length; i += 2) {
          ctx.lineTo(
            blob.x + (pts[i] - blob.x) * scaleFactor,
            blob.y + (pts[i + 1] - blob.y) * scaleFactor
          )
        }
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
    }
    ctx.restore()
  }, [])

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    if (selectedPalette) {
      const colors = selectedPalette.colors
      const grad = ctx.createLinearGradient(0, 0, w, h)
      colors.forEach((c, i) => {
        grad.addColorStop(i / (colors.length - 1), hslToString(c, 0.9))
      })
      ctx.fillStyle = grad
    } else {
      ctx.fillStyle = '#0f172a'
    }
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.globalAlpha = 0.06
    const dotSpacing = 28
    for (let x = dotSpacing / 2; x < w; x += dotSpacing) {
      for (let y = dotSpacing / 2; y < h; y += dotSpacing) {
        const drift = Math.sin(t * 0.001 + x * 0.01 + y * 0.01) * 2
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(x + drift, y, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  }, [selectedPalette])

  useEffect(() => {
    triggeredRef.current = new Set(triggeredBlobIndices)
  }, [triggeredBlobIndices])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    blobs.forEach(b => {
      if (!animBlobsRef.current.has(b.id)) {
        animBlobsRef.current.set(b.id, { diffusionStart: performance.now() })
      }
    })

    const render = (now: number) => {
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      drawBackground(ctx, w, h, now)

      blobs.forEach((blob, idx) => {
        const animState = animBlobsRef.current.get(blob.id)
        const elapsed = animState ? now - animState.diffusionStart : 400
        const diffusion = Math.min(1, elapsed / 400)
        const easedDiff = 1 - Math.pow(1 - diffusion, 3)

        let pulseScale = 1
        if (triggeredRef.current.has(idx)) {
          const pulseT = (now % 200) / 200
          pulseScale = 1 + 0.1 * Math.sin(pulseT * Math.PI)
        }

        drawShape(ctx, blob, easedDiff, pulseScale)
      })

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [blobs, dimensions, selectedPalette, drawBackground, drawShape])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    if (isEyedropperActive && onCanvasColorPick) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const pixel = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data
        const r = pixel[0] / 255, g = pixel[1] / 255, b = pixel[2] / 255
        const max = Math.max(r, g, b), min = Math.min(r, g, b)
        let h = 0, s = 0
        const l = (max + min) / 2
        if (max !== min) {
          const d = max - min
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break
            case g: h = (b - r) / d + 2; break
            case b: h = (r - g) / d + 4; break
          }
          h *= 60
        }
        onCanvasColorPick({ h, s: s * 100, l: l * 100 })
        return
      }
    }

    if (blobs.length >= MAX_BLOBS) return

    let color: HSLColor
    if (currentColor) {
      color = currentColor
    } else if (selectedPalette && selectedPalette.colors.length > 0) {
      color = selectedPalette.colors[Math.floor(Math.random() * selectedPalette.colors.length)]
    } else {
      const allColors = MOOD_PALETTES.flatMap(p => p.colors)
      color = allColors[Math.floor(Math.random() * allColors.length)]
    }

    const shapes: Array<'circle' | 'ellipse' | 'polygon'> = ['circle', 'ellipse', 'polygon']
    const shape = shapes[Math.floor(Math.random() * shapes.length)]
    const size = brushSize * (0.85 + Math.random() * 0.3)
    const points = shape === 'polygon'
      ? generatePolygonPoints(x, y, size, 5 + Math.floor(Math.random() * 4))
      : undefined

    const blob: InkBlob = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      x,
      y,
      size,
      color,
      shape,
      rotation: Math.random() * Math.PI * 2,
      points,
      createdAt: Date.now(),
      diffusionProgress: 0,
      pulsePhase: 0
    }
    onBlobAdd(blob)
  }

  const paletteStyle: React.CSSProperties = selectedPalette
    ? {
        transition: 'all 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        boxShadow: `
          0 0 0 1px rgba(255,255,255,0.08),
          0 30px 80px -20px rgba(0,0,0,0.6),
          inset 0 1px 0 rgba(255,255,255,0.08)
        `
      }
    : {
        transition: 'all 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        boxShadow: `
          0 0 0 1px rgba(255,255,255,0.06),
          0 30px 80px -20px rgba(0,0,0,0.5)
        `
      }

  return (
    <div ref={containerRef} style={styles.container}>
      <div
        style={{
          ...styles.canvasWrapper,
          width: dimensions.width,
          height: dimensions.height,
          ...paletteStyle
        }}
      >
        <canvas
          ref={canvasRef}
          width={dimensions.width * 2}
          height={dimensions.height * 2}
          style={{
            ...styles.canvas,
            cursor: isEyedropperActive ? 'crosshair' : 'pointer'
          }}
          onClick={handleCanvasClick}
        />
        <div style={styles.blobCounter}>
          <span style={styles.blobCountNumber}>{blobs.length}</span>
          <span style={styles.blobCountSep}>/</span>
          <span style={styles.blobCountMax}>{MAX_BLOBS}</span>
          <span style={styles.blobCountLabel}> 墨团</span>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden'
  },
  canvasWrapper: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    flexShrink: 0
  },
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block'
  },
  blobCounter: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    padding: '8px 14px',
    borderRadius: 999,
    background: 'rgba(15, 23, 42, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.08)',
    fontSize: 12,
    fontWeight: 500,
    color: 'rgba(228, 228, 240, 0.8)',
    display: 'flex',
    alignItems: 'baseline',
    gap: 2
  },
  blobCountNumber: {
    fontSize: 14,
    fontWeight: 700,
    color: '#93C5FD'
  },
  blobCountSep: {
    color: 'rgba(228, 228, 240, 0.3)'
  },
  blobCountMax: {
    color: 'rgba(228, 228, 240, 0.5)'
  },
  blobCountLabel: {
    marginLeft: 4
  }
}

export default Canvas
