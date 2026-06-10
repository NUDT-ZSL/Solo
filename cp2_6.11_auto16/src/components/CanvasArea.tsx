import { useRef, useState, useEffect, useCallback } from 'react'
import { getEmotionKeyword, adjustColorSaturation, type ColorBlock } from '../utils/emotionAnalyzer'

interface MoodRecord {
  id: string
  date: string
  text: string
  emotionResult: {
    emotions: Record<string, number>
    dominantEmotion: string
    dominantColor: string
    colorBlocks: ColorBlock[]
    palette: string[]
  }
  drawings: DrawingLine[]
}

interface DrawingLine {
  id: string
  points: { x: number; y: number }[]
  color: string
  targetColor: string
  width: number
  transitioning: boolean
  transitionStart: number
}

interface CanvasAreaProps {
  record: MoodRecord | null
  isViewingShared: boolean
  onSaveDrawings: (drawings: DrawingLine[]) => void
}

interface BubbleInfo {
  visible: boolean
  x: number
  y: number
  text: string
  color: string
}

export default function CanvasArea({ record, isViewingShared, onSaveDrawings }: CanvasAreaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentLine, setCurrentLine] = useState<{ x: number; y: number }[]>([])
  const [drawings, setDrawings] = useState<DrawingLine[]>([])
  const [bubble, setBubble] = useState<BubbleInfo>({ visible: false, x: 0, y: 0, text: '', color: '' })
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })

  const CANVAS_WIDTH = 800
  const CANVAS_HEIGHT = 600
  const TRANSITION_DURATION = 500

  useEffect(() => {
    if (record) {
      const savedDrawings = (record.drawings || []).map((d) => ({
        ...d,
        targetColor: d.color,
        transitioning: false,
        transitionStart: 0,
      }))
      setDrawings(savedDrawings)
    } else {
      setDrawings([])
    }
  }, [record?.id])

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const container = containerRef.current
        const maxWidth = container.clientWidth - 40
        const maxHeight = container.clientHeight - 40
        const ratio = CANVAS_WIDTH / CANVAS_HEIGHT

        let width = maxWidth
        let height = width / ratio

        if (height > maxHeight) {
          height = maxHeight
          width = height * ratio
        }

        setCanvasSize({ width: Math.max(200, Math.floor(width)), height: Math.max(150, Math.floor(height)) })
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const scale = canvasSize.width / CANVAS_WIDTH

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left) / scale
    const y = (clientY - rect.top) / scale

    return { x, y }
  }, [scale])

  const findBlockAtPosition = useCallback((x: number, y: number): ColorBlock | null => {
    if (!record) return null

    const blocks = [...record.emotionResult.colorBlocks].reverse()
    for (const block of blocks) {
      if (isPointInBlock(x, y, block)) {
        return block
      }
    }
    return null
  }, [record])

  const isPointInBlock = (px: number, py: number, block: ColorBlock): boolean => {
    const centerX = block.x + block.width / 2
    const centerY = block.y + block.height / 2

    const angle = (-block.rotation * Math.PI) / 180
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    const dx = px - centerX
    const dy = py - centerY
    const localX = dx * cos - dy * sin
    const localY = dx * sin + dy * cos

    const halfW = block.width / 2
    const halfH = block.height / 2
    const r = Math.min(block.borderRadius, halfW, halfH)

    if (Math.abs(localX) <= halfW - r && Math.abs(localY) <= halfH) return true
    if (Math.abs(localX) <= halfW && Math.abs(localY) <= halfH - r) return true

    const cornerX = halfW - r
    const cornerY = halfH - r
    const distX = Math.abs(localX) - cornerX
    const distY = Math.abs(localY) - cornerY

    if (distX > 0 && distY > 0) {
      return distX * distX + distY * distY <= r * r
    }

    return false
  }

  const getColorAtPosition = useCallback((x: number, y: number): string => {
    const block = findBlockAtPosition(x, y)
    if (block) {
      return block.color
    }
    return '#B0C4DE'
  }, [findBlockAtPosition])

  const lerpColor = (color1: string, color2: string, t: number): string => {
    const r1 = parseInt(color1.slice(1, 3), 16)
    const g1 = parseInt(color1.slice(3, 5), 16)
    const b1 = parseInt(color1.slice(5, 7), 16)

    const r2 = parseInt(color2.slice(1, 3), 16)
    const g2 = parseInt(color2.slice(3, 5), 16)
    const b2 = parseInt(color2.slice(5, 7), 16)

    const r = Math.round(r1 + (r2 - r1) * t)
    const g = Math.round(g1 + (g2 - g1) * t)
    const b = Math.round(b1 + (b2 - b1) * t)

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isViewingShared) return

    const { x, y } = getCanvasCoords(e.clientX, e.clientY)
    const block = findBlockAtPosition(x, y)

    if (block) {
      setActiveBlockId(block.id)
      const bubbleColor = adjustColorSaturation(block.color, 0.7)
      setBubble({
        visible: true,
        x: e.clientX,
        y: e.clientY - 40,
        text: getEmotionKeyword(block.emotion),
        color: bubbleColor,
      })

      setTimeout(() => {
        setBubble((prev) => ({ ...prev, visible: false }))
        setActiveBlockId(null)
      }, 2000)
    } else {
      setIsDrawing(true)
      setCurrentLine([{ x, y }])
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isViewingShared) return

    const { x, y } = getCanvasCoords(e.clientX, e.clientY)
    setCurrentLine((prev) => [...prev, { x, y }])
  }

  const handleCanvasMouseUp = useCallback(() => {
    if (!isDrawing || currentLine.length < 2) {
      setIsDrawing(false)
      setCurrentLine([])
      return
    }

    const lastPoint = currentLine[currentLine.length - 1]
    const targetColor = getColorAtPosition(lastPoint.x, lastPoint.y)

    const newLine: DrawingLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      points: currentLine,
      color: '#FFFFFF',
      targetColor,
      width: 3,
      transitioning: true,
      transitionStart: Date.now(),
    }

    setDrawings((prev) => {
      const updated = [...prev, newLine]
      const savedForApi = updated.map(({ id, points, color: c, targetColor: tc, width: w }) => ({
        id,
        points,
        color: tc,
        width: w,
      }))
      onSaveDrawings(savedForApi as unknown as DrawingLine[])
      return updated
    })

    setIsDrawing(false)
    setCurrentLine([])
  }, [isDrawing, currentLine, getColorAtPosition, onSaveDrawings])

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDrawing) {
        handleCanvasMouseUp()
      }
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [isDrawing, handleCanvasMouseUp])

  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current
      if (!canvas) {
        animationRef.current = requestAnimationFrame(render)
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const now = Date.now()

      setDrawings((prevDrawings) => {
        let hasChanges = false
        const updatedDrawings = prevDrawings.map((line) => {
          if (line.transitioning) {
            const elapsed = now - line.transitionStart
            const t = Math.min(1, elapsed / TRANSITION_DURATION)
            if (t >= 1) {
              hasChanges = true
              return { ...line, color: line.targetColor, transitioning: false }
            }
          }
          return line
        })
        return hasChanges ? updatedDrawings : prevDrawings
      })

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      gradient.addColorStop(0, '#B0C4DE')
      gradient.addColorStop(1, '#F5F5DC')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      if (!record) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
        ctx.font = '24px -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('输入心情，生成你的情绪调色盘', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
        animationRef.current = requestAnimationFrame(render)
        return
      }

      const blocks = record.emotionResult.colorBlocks

      for (const block of blocks) {
        ctx.save()

        const centerX = block.x + block.width / 2
        const centerY = block.y + block.height / 2
        const isActive = block.id === activeBlockId
        const blockScale = isActive ? 1.3 : 1

        ctx.translate(centerX, centerY)
        ctx.rotate((block.rotation * Math.PI) / 180)
        ctx.scale(blockScale, blockScale)
        ctx.translate(-centerX, -centerY)

        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
        drawRoundedRect(ctx, block.x + 3, block.y + 3, block.width, block.height, block.borderRadius)
        ctx.fill()

        const blockGradient = ctx.createLinearGradient(
          block.x,
          block.y,
          block.x + block.width,
          block.y + block.height
        )
        blockGradient.addColorStop(0, lightenColor(block.color, 20))
        blockGradient.addColorStop(1, darkenColor(block.color, 10))
        ctx.fillStyle = blockGradient

        drawRoundedRect(ctx, block.x, block.y, block.width, block.height, block.borderRadius)
        ctx.fill()

        if (isActive) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
          ctx.lineWidth = 3
          drawRoundedRect(ctx, block.x - 2, block.y - 2, block.width + 4, block.height + 4, block.borderRadius + 2)
          ctx.stroke()
        }

        ctx.restore()
      }

      for (const line of drawings) {
        if (line.points.length < 2) continue

        let displayColor = line.color
        if (line.transitioning) {
          const elapsed = now - line.transitionStart
          const t = Math.min(1, elapsed / TRANSITION_DURATION)
          displayColor = lerpColor(line.color, line.targetColor, t)
        }

        ctx.strokeStyle = hexToRgba(displayColor, 0.7)
        ctx.lineWidth = line.width
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        ctx.beginPath()
        ctx.moveTo(line.points[0].x, line.points[0].y)
        for (let i = 1; i < line.points.length; i++) {
          ctx.lineTo(line.points[i].x, line.points[i].y)
        }
        ctx.stroke()
      }

      if (isDrawing && currentLine.length > 1) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        ctx.beginPath()
        ctx.moveTo(currentLine[0].x, currentLine[0].y)
        for (let i = 1; i < currentLine.length; i++) {
          ctx.lineTo(currentLine[i].x, currentLine[i].y)
        }
        ctx.stroke()

        const lastPoint = currentLine[currentLine.length - 1]
        const glowGradient = ctx.createRadialGradient(
          lastPoint.x,
          lastPoint.y,
          0,
          lastPoint.x,
          lastPoint.y,
          20
        )
        glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)')
        glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.fillStyle = glowGradient
        ctx.beginPath()
        ctx.arc(lastPoint.x, lastPoint.y, 20, 0, Math.PI * 2)
        ctx.fill()
      }

      animationRef.current = requestAnimationFrame(render)
    }

    animationRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animationRef.current)
  }, [record, drawings, currentLine, isDrawing, activeBlockId])

  function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    const r = Math.min(radius, width / 2, height / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + width - r, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + r)
    ctx.lineTo(x + width, y + height - r)
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
    ctx.lineTo(x + r, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  function lightenColor(hex: string, percent: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)

    const newR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)))
    const newG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)))
    const newB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)))

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
  }

  function darkenColor(hex: string, percent: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)

    const newR = Math.floor(r * (1 - percent / 100))
    const newG = Math.floor(g * (1 - percent / 100))
    const newB = Math.floor(b * (1 - percent / 100))

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
  }

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            ...styles.canvas,
            width: canvasSize.width,
            height: canvasSize.height,
            cursor: isViewingShared ? 'default' : isDrawing ? 'crosshair' : 'pointer',
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
        />
      </div>

      {bubble.visible && (
        <div
          style={{
            ...styles.bubble,
            left: bubble.x,
            top: bubble.y,
            backgroundColor: bubble.color,
          }}
        >
          {bubble.text}
        </div>
      )}

      {record && (
        <div style={styles.infoBar}>
          <span style={styles.dateText}>{formatDate(record.date)}</span>
          <div style={styles.palette}>
            {record.emotionResult.palette.slice(0, 5).map((color, i) => (
              <div
                key={i}
                style={{
                  ...styles.paletteDot,
                  backgroundColor: color,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${month}月${day}日 ${days[d.getDay()]}`
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  canvasWrapper: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    transition: 'transform 0.6s ease-in-out, opacity 0.6s ease-in-out',
  },
  canvas: {
    display: 'block',
    transition: 'transform 0.2s ease',
  },
  bubble: {
    position: 'fixed',
    transform: 'translateX(-50%)',
    padding: '8px 16px',
    borderRadius: 20,
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    pointerEvents: 'none',
    zIndex: 100,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    animation: 'bounce 0.3s ease-out',
  },
  infoBar: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '10px 20px',
    background: 'rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(10px)',
    borderRadius: 20,
  },
  dateText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 500,
  },
  palette: {
    display: 'flex',
    gap: 6,
  },
  paletteDot: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
}
