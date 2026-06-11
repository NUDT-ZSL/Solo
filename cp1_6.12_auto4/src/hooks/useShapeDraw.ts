import { useState, useCallback } from 'react'
import type { Shape, ShapeType, RectShape, CircleShape, LineShape } from '../types'
import { generateId } from '../utils/helpers'

interface UseShapeDrawOptions {
  currentTool: ShapeType
  onGraphicsChange: (graphics: Shape[]) => void
  onSelectionChange: (id: string | null) => void
  onCommitChange: () => void
  graphics: Shape[]
}

interface UseShapeDrawResult {
  isDrawing: boolean
  setIsDrawing: (v: boolean) => void
  drawStart: { x: number; y: number } | null
  setDrawStart: (v: { x: number; y: number } | null) => void
  tempShape: Shape | null
  setTempShape: (v: Shape | null) => void
  startDrawing: (point: { x: number; y: number }) => void
  updateDrawing: (point: { x: number; y: number }) => void
  endDrawing: () => void
}

const DEFAULT_COLORS: Record<ShapeType, { fill: string; stroke: string }> = {
  rect: { fill: '#4a90d9', stroke: '#ffffff' },
  circle: { fill: '#e74c3c', stroke: '#ffffff' },
  line: { fill: 'none', stroke: '#2ecc71' },
  select: { fill: '#ffffff', stroke: '#ffffff' }
}

export function useShapeDraw({
  currentTool,
  onGraphicsChange,
  onSelectionChange,
  onCommitChange,
  graphics
}: UseShapeDrawOptions): UseShapeDrawResult {
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [tempShape, setTempShape] = useState<Shape | null>(null)

  const startDrawing = useCallback(
    (point: { x: number; y: number }) => {
      setIsDrawing(true)
      setDrawStart(point)

      const colors = DEFAULT_COLORS[currentTool]

      if (currentTool === 'rect') {
        setTempShape({
          id: generateId(),
          type: 'rect',
          x: point.x,
          y: point.y,
          width: 1,
          height: 1,
          rx: 0,
          rotation: 0,
          fill: colors.fill,
          stroke: colors.stroke,
          strokeWidth: 2
        } as RectShape)
      } else if (currentTool === 'circle') {
        setTempShape({
          id: generateId(),
          type: 'circle',
          x: point.x,
          y: point.y,
          radius: 1,
          rotation: 0,
          fill: colors.fill,
          stroke: colors.stroke,
          strokeWidth: 2
        } as CircleShape)
      } else if (currentTool === 'line') {
        setTempShape({
          id: generateId(),
          type: 'line',
          x: point.x,
          y: point.y,
          x2: point.x,
          y2: point.y,
          rotation: 0,
          fill: 'none',
          stroke: colors.stroke,
          strokeWidth: 2
        } as LineShape)
      }
    },
    [currentTool]
  )

  const updateDrawing = useCallback(
    (point: { x: number; y: number }) => {
      if (!isDrawing || !drawStart || !tempShape) return
      const dx = point.x - drawStart.x
      const dy = point.y - drawStart.y

      if (tempShape.type === 'rect') {
        const absDx = Math.abs(dx) || 1
        const absDy = Math.abs(dy) || 1
        setTempShape({
          ...tempShape,
          x: drawStart.x + dx / 2,
          y: drawStart.y + dy / 2,
          width: absDx,
          height: absDy
        } as RectShape)
      } else if (tempShape.type === 'circle') {
        const radius = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
        setTempShape({
          ...tempShape,
          x: drawStart.x,
          y: drawStart.y,
          radius
        } as CircleShape)
      } else if (tempShape.type === 'line') {
        setTempShape({
          ...tempShape,
          x: drawStart.x,
          y: drawStart.y,
          x2: point.x,
          y2: point.y
        } as LineShape)
      }
    },
    [isDrawing, drawStart, tempShape]
  )

  const endDrawing = useCallback(() => {
    if (isDrawing && tempShape) {
      let finalShape = { ...tempShape }

      if (tempShape.type === 'rect') {
        const rect = tempShape as RectShape
        if (rect.width < 5 && rect.height < 5) {
          finalShape = {
            ...rect,
            width: 120,
            height: 80,
            x: tempShape.x,
            y: tempShape.y
          }
        }
      } else if (tempShape.type === 'circle') {
        const circ = tempShape as CircleShape
        if (circ.radius < 5) {
          finalShape = { ...circ, radius: 50 }
        }
      } else if (tempShape.type === 'line') {
        const line = tempShape as LineShape
        const dist = Math.sqrt((line.x2 - line.x) ** 2 + (line.y2 - line.y) ** 2)
        if (dist < 5) {
          finalShape = {
            ...line,
            x2: line.x + 100,
            y2: line.y
          }
        }
      }

      onGraphicsChange([...graphics, finalShape as Shape])
      onSelectionChange(finalShape.id)
      onCommitChange()
    }

    setIsDrawing(false)
    setDrawStart(null)
    setTempShape(null)
  }, [isDrawing, tempShape, graphics, onGraphicsChange, onSelectionChange, onCommitChange])

  return {
    isDrawing,
    setIsDrawing,
    drawStart,
    setDrawStart,
    tempShape,
    setTempShape,
    startDrawing,
    updateDrawing,
    endDrawing
  }
}
