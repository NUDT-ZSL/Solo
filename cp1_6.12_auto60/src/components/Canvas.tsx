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
  onDimensionsChange?: (width: number, height: number) => void
  isEyedropperActive: boolean
}

interface PulseState {
  startTime: number
}

const PULSE_DURATION = 200

const rgbToHsl = (r: number, g: number, b: number): HSLColor => {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
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
  return { h, s: s * 100, l: l * 100 }
}

const Canvas: React.FC<CanvasProps> = ({
  blobs,
  selectedPalette,
  currentColor,
  brushSize,
  triggeredBlobIndices,
  onBlobAdd,
  onCanvasColorPick,
  onDimensionsChange,
  isEyedropperActive
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const animBlobsRef = useRef<Map<string, { diffusionStart: number }>>(new Map())
  const pulseStatesRef = useRef<Map<number, PulseState>>(new Map())
  const lastPointerPressureRef = useRef(0.5)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [dpr, setDpr] = useState(() => (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1))

  useEffect(() => {
    const onDprChange = () => setDpr(window.devicePixelRatio || 1)
    const mq = window.matchMedia(`(resolution: ${dpr}dppx)`)
    mq.addEventListener ? mq.addEventListener('change', onDprChange) : mq.addListener(onDprChange)
    return () => { mq.removeEventListener ? mq.removeEventListener('change', onDprChange) : mq.removeListener(onDprChange) }
  }, [dpr])

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return
      const container = containerRef.current
      const padding = 48
      const availW = container.clientWidth - padding * 2
      const availH = container.clientHeight - padding * 2
      let w: number, h: number
      if (availW / availH > CANVAS_ASPECT_RATIO) {
        h = Math.max(300, availH)
        w = h * CANVAS_ASPECT_RATIO
      } else {
        w = Math.max(400, availW)
        h = w / CANVAS_ASPECT_RATIO
      }
      setDimensions({ width: Math.round(w), height: Math.round(h) })
    }
    updateDimensions()
    const ro = new ResizeObserver(updateDimensions)
    if (containerRef.current) ro.observe(containerRef.current)
    window.addEventListener('resize', updateDimensions)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateDimensions)
    }
  }, [])

  useEffect(() => {
    if (onDimensionsChange) {
      onDimensionsChange(dimensions.width, dimensions.height)
    }
  }, [dimensions, onDimensionsChange])

  const hslToString = useCallback((c: HSLColor, alpha = 1) =>
    `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha})`, [])

  const generatePolygonPoints = useCallback((cx: number, cy: number, size: number, count: number): number[] => {
    const points: number[] = []
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
      const r = size * (0.65 + Math.random() * 0.6)
      points.push(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
    }
    return points
  }, [])

  const calcPulseScale = useCallback((pulseStart: number, now: number): number => {
    const t = Math.min(1, (now - pulseStart) / PULSE_DURATION)
    const easeInOut = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    if (t < 0.5) {
      return 1 + easeInOut * 0.1
    } else {
      return 1.1 - (easeInOut - 0.5) * 2 * 0.1
    }
  }, [])

  const drawShape = useCallback((
    ctx: CanvasRenderingContext2D,
    blob: InkBlob,
    diffusion: number,
    pulseScale: number
  ) => {
    ctx.save()
    ctx.translate(blob.x, blob.y)
    ctx.rotate(blob.rotation)
    const baseScale = 1 + (diffusion - 1) * 0.3
    ctx.scale(baseScale * pulseScale, baseScale * pulseScale)
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
        const cx = blob.x, cy = blob.y
        ctx.moveTo(cx + (pts[0] - cx) * scaleFactor, cy + (pts[1] - cy) * scaleFactor)
        for (let i = 2; i < pts.length; i += 2) {
          ctx.lineTo(cx + (pts[i] - cx) * scaleFactor, cy + (pts[i + 1] - cy) * scaleFactor)
        }
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
    }

    if (pulseScale > 1.001) {
      ctx.save()
      const glowSize = blob.size * 1.35 * pulseScale
      const glowIntensity = (pulseScale - 1) * 10
      const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, glowSize)
      gradient.addColorStop(0, hslToString(blob.color, 0.6 * glowIntensity))
      gradient.addColorStop(0.5, hslToString(blob.color, 0.3 * glowIntensity))
      gradient.addColorStop(1, hslToString(blob.color, 0))
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(blob.x, blob.y, glowSize, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    ctx.restore()
  }, [hslToString])

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
  }, [selectedPalette, hslToString])

  const prevTriggeredRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    const now = performance.now()
    triggeredBlobIndices.forEach(idx => {
      const wasTriggered = prevTriggeredRef.current.has(idx)
      if (!wasTriggered || !pulseStatesRef.current.has(idx)) {
        pulseStatesRef.current.set(idx, { startTime: now })
      }
    })
    pulseStatesRef.current.forEach((state, idx) => {
      if (!triggeredBlobIndices.has(idx)) {
        pulseStatesRef.current.delete(idx)
      }
    })
    prevTriggeredRef.current = new Set(triggeredBlobIndices)
  }, [triggeredBlobIndices])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

    const logicalW = dimensions.width
    const logicalH = dimensions.height
    const physicalW = Math.round(logicalW * dpr)
    const physicalH = Math.round(logicalH * dpr)

    if (canvas.width !== physicalW || canvas.height !== physicalH) {
      canvas.width = physicalW
      canvas.height = physicalH
    }
    wrapper.style.width = `${logicalW}px`
    wrapper.style.height = `${logicalH}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    blobs.forEach(b => {
      if (!animBlobsRef.current.has(b.id)) {
        animBlobsRef.current.set(b.id, { diffusionStart: performance.now() })
      }
    })

    const render = (now: number) => {
      ctx.clearRect(0, 0, logicalW, logicalH)
      drawBackground(ctx, logicalW, logicalH, now)

      pulseStatesRef.current.forEach((state, idx) => {
        if (now - state.startTime > PULSE_DURATION) {
          pulseStatesRef.current.delete(idx)
        }
      })

      for (let i = 0; i < blobs.length; i++) {
        const blob = blobs[i]
        const animState = animBlobsRef.current.get(blob.id)
        const elapsed = animState ? now - animState.diffusionStart : 400
        const diffusion = Math.min(1, elapsed / 400)
        const easedDiff = 1 - Math.pow(1 - diffusion, 3)

        let pulseScale = 1
        const pulseState = pulseStatesRef.current.get(i)
        if (pulseState) {
          pulseScale = calcPulseScale(pulseState.startTime, now)
        }

        drawShape(ctx, blob, easedDiff, pulseScale)
      }

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [blobs, dimensions, dpr, selectedPalette, drawBackground, drawShape, calcPulseScale])

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left) * (canvas.width / rect.width) / dpr
    const y = (clientY - rect.top) * (canvas.height / rect.height) / dpr
    return { x, y }
  }, [dpr])

  const handleEyedropper = useCallback((clientX: number, clientY: number) => {
    if (!isEyedropperActive || !onCanvasColorPick) return false
    const canvas = canvasRef.current
    if (!canvas) return false
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return false

    const rect = canvas.getBoundingClientRect()
    const px = Math.round((clientX - rect.left) * (canvas.width / rect.width))
    const py = Math.round((clientY - rect.top) * (canvas.height / rect.height))
    try {
      const pixel = ctx.getImageData(
        Math.max(0, Math.min(canvas.width - 1, px)),
        Math.max(0, Math.min(canvas.height - 1, py)),
        1, 1
      ).data
      const hsl = rgbToHsl(pixel[0], pixel[1], pixel[2])
      onCanvasColorPick(hsl)
      return true
    } catch (e) {
      console.warn('取色失败', e)
      return false
    }
  }, [isEyedropperActive, onCanvasColorPick])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    lastPointerPressureRef.current = e.pressure > 0 ? e.pressure : 0.5
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (handleEyedropper(e.clientX, e.clientY)) {
      return
    }

    if (blobs.length >= MAX_BLOBS) return

    const { x, y } = getCanvasCoords(e.clientX, e.clientY)
    const pressure = e.pressure > 0 ? e.pressure : lastPointerPressureRef.current
    const pressureFactor = 0.6 + pressure * 0.9
    const size = brushSize * pressureFactor * (0.88 + Math.random() * 0.24)

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
  }, [blobs.length, brushSize, currentColor, selectedPalette, generatePolygonPoints, getCanvasCoords, handleEyedropper, onBlobAdd])

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
        ref={wrapperRef}
        style={{
          ...styles.canvasWrapper,
          ...paletteStyle
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            ...styles.canvas,
            width: '100%',
            height: '100%',
            cursor: isEyedropperActive ? 'crosshair' : 'pointer',
            touchAction: 'none'
          }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
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
    gap: 2,
    pointerEvents: 'none'
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
