import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { Stroke, CharacterStrokes } from '../utils/strokeData'

type SpeedLevel = 'slow' | 'medium' | 'fast'

const SPEED_MAP: Record<SpeedLevel, number> = {
  slow: 800,
  medium: 500,
  fast: 300
}

interface StrokeCanvasProps {
  charactersData: CharacterStrokes[]
  inputValue: string
}

interface FlatStroke extends Stroke {
  globalIndex: number
  totalGlobal: number
  charIndex: number
  charTotal: number
}

const StrokeCanvas: React.FC<StrokeCanvasProps> = ({ charactersData, inputValue }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speed, setSpeed] = useState<SpeedLevel>('medium')
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState(-1)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [hoveredStroke, setHoveredStroke] = useState<number | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 640, height: 480 })

  const flatStrokes = useMemo<FlatStroke[]>(() => {
    const result: FlatStroke[] = []
    let globalIdx = 0
    const total = charactersData.reduce((sum, c) => sum + c.strokes.length, 0)
    charactersData.forEach((charData, charIdx) => {
      charData.strokes.forEach((stroke, strokeIdx) => {
        result.push({
          ...stroke,
          globalIndex: globalIdx,
          totalGlobal: total,
          charIndex: charIdx,
          charTotal: charactersData.length
        })
        globalIdx++
      })
    })
    return result
  }, [charactersData])

  const totalStrokes = flatStrokes.length

  const characterLayouts = useMemo(() => {
    const count = charactersData.length
    if (count === 0) return []
    const padding = 40
    const canvasW = canvasSize.width
    const canvasH = canvasSize.height
    const charAreaWidth = (canvasW - padding * 2) / Math.max(count, 1)
    const charHeight = canvasH - padding * 2
    const scaleBase = Math.min(charAreaWidth, charHeight) / 400
    return charactersData.map((_, i) => {
      const centerX = padding + charAreaWidth * i + charAreaWidth / 2
      const centerY = padding + charHeight / 2
      return { centerX, centerY, scale: scaleBase }
    })
  }, [charactersData, canvasSize])

  const getStrokePosition = useCallback((stroke: FlatStroke) => {
    const layout = characterLayouts[stroke.charIndex]
    if (!layout) return null
    const { centerX, centerY, scale } = layout
    const originalCenterX = 640 / 2
    const originalCenterY = 480 / 2
    const map = (x: number, y: number) => ({
      x: centerX + (x - originalCenterX) * scale,
      y: centerY + (y - originalCenterY) * scale
    })
    const start = map(stroke.startX, stroke.startY)
    const end = map(stroke.endX, stroke.endY)
    const ctrl1 = stroke.controlX !== undefined && stroke.controlY !== undefined
      ? map(stroke.controlX, stroke.controlY)
      : null
    const ctrl2 = stroke.secondControlX !== undefined && stroke.secondControlY !== undefined
      ? map(stroke.secondControlX, stroke.secondControlY)
      : null
    return { start, end, ctrl1, ctrl2 }
  }, [characterLayouts])

  const getPointOnPath = useCallback((
    t: number,
    start: { x: number; y: number },
    end: { x: number; y: number },
    ctrl1: { x: number; y: number } | null,
    ctrl2: { x: number; y: number } | null,
    pathType: string
  ) => {
    if (pathType === 'line' || (!ctrl1 && !ctrl2)) {
      return {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t
      }
    }
    if (pathType === 'quad' && ctrl1 && !ctrl2) {
      const mt = 1 - t
      return {
        x: mt * mt * start.x + 2 * mt * t * ctrl1.x + t * t * end.x,
        y: mt * mt * start.y + 2 * mt * t * ctrl1.y + t * t * end.y
      }
    }
    if (pathType === 'cubic' && ctrl1 && ctrl2) {
      const mt = 1 - t
      return {
        x: mt * mt * mt * start.x + 3 * mt * mt * t * ctrl1.x + 3 * mt * t * t * ctrl2.x + t * t * t * end.x,
        y: mt * mt * mt * start.y + 3 * mt * mt * t * ctrl1.y + 3 * mt * t * t * ctrl2.y + t * t * t * end.y
      }
    }
    if (ctrl1) {
      const mt = 1 - t
      return {
        x: mt * mt * start.x + 2 * mt * t * ctrl1.x + t * t * end.x,
        y: mt * mt * start.y + 2 * mt * t * ctrl1.y + t * t * end.y
      }
    }
    return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t }
  }, [])

  const drawPath = useCallback((
    ctx: CanvasRenderingContext2D,
    start: { x: number; y: number },
    end: { x: number; y: number },
    ctrl1: { x: number; y: number } | null,
    ctrl2: { x: number; y: number } | null,
    pathType: string,
    progress: number = 1
  ) => {
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    if (progress < 1) {
      const steps = Math.max(2, Math.ceil(progress * 30))
      for (let i = 1; i <= steps; i++) {
        const t = (i / steps) * progress
        const pt = getPointOnPath(t, start, end, ctrl1, ctrl2, pathType)
        ctx.lineTo(pt.x, pt.y)
      }
    } else {
      if (pathType === 'line' || (!ctrl1 && !ctrl2)) {
        ctx.lineTo(end.x, end.y)
      } else if (pathType === 'quad' && ctrl1 && !ctrl2) {
        ctx.quadraticCurveTo(ctrl1.x, ctrl1.y, end.x, end.y)
      } else if (pathType === 'cubic' && ctrl1 && ctrl2) {
        ctx.bezierCurveTo(ctrl1.x, ctrl1.y, ctrl2.x, ctrl2.y, end.x, end.y)
      } else if (ctrl1) {
        ctx.quadraticCurveTo(ctrl1.x, ctrl1.y, end.x, end.y)
      } else {
        ctx.lineTo(end.x, end.y)
      }
    }
    ctx.stroke()
  }, [getPointOnPath])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    flatStrokes.forEach((stroke, idx) => {
      const pos = getStrokePosition(stroke)
      if (!pos) return
      const { start, end, ctrl1, ctrl2 } = pos

      if (idx < currentStrokeIndex) {
        ctx.strokeStyle = '#9e9e9e'
        drawPath(ctx, start, end, ctrl1, ctrl2, stroke.pathType, 1)
      } else if (idx === currentStrokeIndex && animationProgress > 0) {
        ctx.strokeStyle = '#212121'
        drawPath(ctx, start, end, ctrl1, ctrl2, stroke.pathType, animationProgress)
      }

      if (idx <= currentStrokeIndex || (idx === currentStrokeIndex && animationProgress >= 0)) {
        const showNumber = idx <= currentStrokeIndex
        const currentDrawing = idx === currentStrokeIndex && animationProgress < 1
        if (showNumber || currentDrawing) {
          ctx.save()
          const isHovered = hoveredStroke === idx
          const scale = isHovered ? 1.2 : 1
          ctx.translate(start.x, start.y)
          ctx.scale(scale, scale)
          ctx.beginPath()
          ctx.arc(0, 0, isHovered ? 12 : 10, 0, Math.PI * 2)
          ctx.fillStyle = isHovered ? '#1976d2' : '#1565c0'
          ctx.fill()
          ctx.fillStyle = '#ffffff'
          ctx.font = `bold ${isHovered ? 12 : 11}px -apple-system, BlinkMacSystemFont, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(stroke.order), 0, 1)
          ctx.restore()
        }
      }
    })
  }, [flatStrokes, currentStrokeIndex, animationProgress, hoveredStroke, canvasSize, getStrokePosition, drawPath])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const updateSize = () => {
      const rect = container.getBoundingClientRect()
      const w = Math.floor(rect.width)
      const h = Math.floor(rect.height)
      const dpr = window.devicePixelRatio || 1
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      setCanvasSize({ width: w, height: h })
    }
    updateSize()
    const ro = new ResizeObserver(updateSize)
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  const startAnimation = useCallback(() => {
    if (flatStrokes.length === 0) return
    if (!isPlaying || isPaused) return
    const duration = SPEED_MAP[speed]
    let startTime: number | null = null
    const startIdx = currentStrokeIndex < 0 ? 0 : currentStrokeIndex
    const startProgress = currentStrokeIndex < 0 ? 0 : animationProgress

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp
      const elapsed = timestamp - startTime
      const totalProgress = startProgress + (elapsed / duration)
      if (totalProgress >= 1) {
        setCurrentStrokeIndex(startIdx)
        setAnimationProgress(1)
        const nextIdx = startIdx + 1
        if (nextIdx < flatStrokes.length) {
          setTimeout(() => {
            setCurrentStrokeIndex(nextIdx)
            setAnimationProgress(0)
          }, 100)
        } else {
          setIsPlaying(false)
          return
        }
      } else {
        setCurrentStrokeIndex(startIdx)
        setAnimationProgress(Math.min(totalProgress, 1))
      }
      animationRef.current = requestAnimationFrame(animate)
    }
    animationRef.current = requestAnimationFrame(animate)
  }, [isPlaying, isPaused, speed, flatStrokes.length, currentStrokeIndex, animationProgress])

  useEffect(() => {
    if (isPlaying && !isPaused) {
      startAnimation()
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [isPlaying, isPaused, startAnimation])

  useEffect(() => {
    setCurrentStrokeIndex(-1)
    setAnimationProgress(0)
    setIsPlaying(false)
    setIsPaused(false)
    setHoveredStroke(null)
  }, [inputValue])

  const handlePlay = () => {
    if (flatStrokes.length === 0) return
    if (isPaused) {
      setIsPaused(false)
    } else {
      setCurrentStrokeIndex(-1)
      setAnimationProgress(0)
      setIsPlaying(true)
    }
  }

  const handlePause = () => {
    setIsPaused(true)
  }

  const handleReset = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    setCurrentStrokeIndex(-1)
    setAnimationProgress(0)
    setIsPlaying(false)
    setIsPaused(false)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPaused) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    let found: number | null = null
    for (let i = flatStrokes.length - 1; i >= 0; i--) {
      const stroke = flatStrokes[i]
      const pos = getStrokePosition(stroke)
      if (!pos) continue
      const dist = Math.sqrt(
        Math.pow(x - pos.start.x, 2) + Math.pow(y - pos.start.y, 2)
      )
      if (dist < 18) {
        found = i
        break
      }
    }
    setHoveredStroke(found)
  }

  const handleMouseLeave = () => {
    setHoveredStroke(null)
  }

  const completedStrokes = Math.max(0, currentStrokeIndex + (animationProgress >= 1 ? 1 : 0))

  const thumbnailSize = 80
  const thumbnailPadding = 8
  const thumbCharArea = (thumbnailSize - thumbnailPadding * 2) / Math.max(charactersData.length, 1)

  const drawThumbnail = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, thumbnailSize, thumbnailSize)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    charactersData.forEach((charData, charIdx) => {
      const thumbCenterX = thumbnailPadding + thumbCharArea * charIdx + thumbCharArea / 2
      const thumbCenterY = thumbnailSize / 2
      const scale = Math.min(thumbCharArea, thumbnailSize - thumbnailPadding * 2) / 400

      const map = (x: number, y: number) => ({
        x: thumbCenterX + (x - 320) * scale,
        y: thumbCenterY + (y - 240) * scale
      })

      charData.strokes.forEach((stroke, strokeIdx) => {
        const globalIdx = charactersData.slice(0, charIdx).reduce((s, c) => s + c.strokes.length, 0) + strokeIdx
        const isCompleted = globalIdx < completedStrokes
        ctx.strokeStyle = isCompleted ? '#666666' : '#d4d4d4'
        ctx.beginPath()
        const s = map(stroke.startX, stroke.startY)
        ctx.moveTo(s.x, s.y)
        if (stroke.pathType === 'line' || (!stroke.controlX && !stroke.secondControlX)) {
          const e = map(stroke.endX, stroke.endY)
          ctx.lineTo(e.x, e.y)
        } else if (stroke.pathType === 'quad' && stroke.controlX && stroke.controlY) {
          const c1 = map(stroke.controlX, stroke.controlY)
          const e = map(stroke.endX, stroke.endY)
          ctx.quadraticCurveTo(c1.x, c1.y, e.x, e.y)
        } else if (stroke.pathType === 'cubic' && stroke.controlX && stroke.controlY && stroke.secondControlX && stroke.secondControlY) {
          const c1 = map(stroke.controlX, stroke.controlY)
          const c2 = map(stroke.secondControlX, stroke.secondControlY)
          const e = map(stroke.endX, stroke.endY)
          ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, e.x, e.y)
        } else {
          const e = map(stroke.endX, stroke.endY)
          ctx.lineTo(e.x, e.y)
        }
        ctx.stroke()
      })
    })
  }

  const hoveredStrokeInfo = hoveredStroke !== null ? flatStrokes[hoveredStroke] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 720 }}>
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 640,
          aspectRatio: '640 / 480',
          background: '#ffffff',
          boxShadow: 'inset 0 0 0 8px #e0d8c8',
          borderRadius: 4
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ display: 'block', cursor: isPaused ? 'pointer' : 'default' }}
        />

        <div style={{
          position: 'absolute',
          left: 16,
          bottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 5
        }}>
          <canvas
            width={thumbnailSize}
            height={thumbnailSize}
            ref={(el) => {
              if (el) {
                const ctx = el.getContext('2d')
                if (ctx) drawThumbnail(ctx)
              }
            }}
            style={{
              borderRadius: 6,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          />
          <div style={{
            fontSize: 14,
            color: '#424242',
            fontWeight: 500,
            lineHeight: 1.4
          }}>
            <div>第 {Math.min(completedStrokes + (currentStrokeIndex >= 0 && animationProgress < 1 ? 1 : 0), totalStrokes)} / {totalStrokes} 笔</div>
            <div style={{ fontSize: 12, color: '#8d6e63', marginTop: 2 }}>
              {totalStrokes > 0 ? `${Math.round((completedStrokes / totalStrokes) * 100)}% 完成` : '等待播放'}
            </div>
          </div>
        </div>

        {hoveredStrokeInfo && isPaused && (
          <div
            style={{
              position: 'absolute',
              pointerEvents: 'none',
              zIndex: 10,
              background: 'rgba(21, 101, 192, 0.95)',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transform: 'scale(1.05)',
              transition: 'transform 0.2s ease',
              left: 16,
              top: 16
            }}
          >
            第 {hoveredStrokeInfo.order} 笔 · {hoveredStrokeInfo.direction}
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '12px 16px',
        background: '#ffffff',
        borderRadius: 8,
        border: '1px solid #e0d8c8',
        width: '100%',
        maxWidth: 640
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#6d4c41', fontWeight: 500 }}>速度</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['slow', 'medium', 'fast'] as SpeedLevel[]).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  borderRadius: 6,
                  border: speed === s ? '1px solid #8d6e63' : '1px solid #d4c5a9',
                  background: speed === s ? '#8d6e63' : '#ffffff',
                  color: speed === s ? '#ffffff' : '#6d4c41',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.15s ease'
                }}
              >
                {s === 'slow' ? '慢' : s === 'medium' ? '中' : '快'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ width: 1, height: 24, background: '#e0d8c8' }} />

        <div style={{ display: 'flex', gap: 8 }}>
          {!isPlaying || isPaused ? (
            <button
              onClick={handlePlay}
              disabled={flatStrokes.length === 0}
              style={{
                padding: '8px 20px',
                fontSize: 14,
                borderRadius: 6,
                border: 'none',
                background: flatStrokes.length === 0 ? '#c7b8a3' : '#8d6e63',
                color: '#ffffff',
                cursor: flatStrokes.length === 0 ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (flatStrokes.length > 0) e.currentTarget.style.background = '#6d4c41'
              }}
              onMouseLeave={(e) => {
                if (flatStrokes.length > 0) e.currentTarget.style.background = '#8d6e63'
              }}
            >
              {isPaused ? '▶ 继续' : currentStrokeIndex >= 0 ? '▶ 重新播放' : '▶ 播放'}
            </button>
          ) : (
            <button
              onClick={handlePause}
              style={{
                padding: '8px 20px',
                fontSize: 14,
                borderRadius: 6,
                border: 'none',
                background: '#8d6e63',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#6d4c41'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#8d6e63'}
            >
              ⏸ 暂停
            </button>
          )}
          <button
            onClick={handleReset}
            disabled={currentStrokeIndex < 0 && !isPlaying}
            style={{
              padding: '8px 20px',
              fontSize: 14,
              borderRadius: 6,
              border: '1px solid #d4c5a9',
              background: '#ffffff',
              color: '#6d4c41',
              cursor: currentStrokeIndex < 0 && !isPlaying ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              transition: 'all 0.15s ease',
              opacity: currentStrokeIndex < 0 && !isPlaying ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!(currentStrokeIndex < 0 && !isPlaying)) {
                e.currentTarget.style.background = '#faf3e0'
                e.currentTarget.style.borderColor = '#8d6e63'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.borderColor = '#d4c5a9'
            }}
          >
            ↺ 重置
          </button>
        </div>
      </div>
    </div>
  )
}

export default StrokeCanvas
