import { useRef, useCallback } from 'react'
import type { Shape, LineShape, DragState } from '../types'

interface UseShapeDragOptions {
  graphics: Shape[]
  selectedId: string | null
  onGraphicsChange: (graphics: Shape[]) => void
  getSvgPoint: (clientX: number, clientY: number) => { x: number; y: number }
}

interface UseShapeDragResult {
  dragState: React.MutableRefObject<DragState>
  startDrag: (e: React.MouseEvent<SVGGElement>, shape: Shape) => void
  updateDrag: (e: React.MouseEvent<SVGSVGElement>) => void
  isDragging: () => boolean
}

export function useShapeDrag({
  graphics,
  selectedId,
  onGraphicsChange,
  getSvgPoint
}: UseShapeDragOptions): UseShapeDragResult {
  const dragState = useRef<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    shapeStartX: 0,
    shapeStartY: 0
  })

  const startDrag = useCallback(
    (e: React.MouseEvent<SVGGElement>, shape: Shape) => {
      const point = getSvgPoint(e.clientX, e.clientY)
      dragState.current = {
        isDragging: true,
        startX: point.x,
        startY: point.y,
        shapeStartX: shape.x,
        shapeStartY: shape.y,
        shapeStartX2: shape.type === 'line' ? (shape as LineShape).x2 : undefined,
        shapeStartY2: shape.type === 'line' ? (shape as LineShape).y2 : undefined
      }
    },
    [getSvgPoint]
  )

  const updateDrag = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!dragState.current.isDragging || !selectedId) return
      const point = getSvgPoint(e.clientX, e.clientY)
      const dx = point.x - dragState.current.startX
      const dy = point.y - dragState.current.startY

      onGraphicsChange(
        graphics.map((shape) => {
          if (shape.id !== selectedId) return shape
          if (shape.type === 'line') {
            return {
              ...shape,
              x: dragState.current.shapeStartX + dx,
              y: dragState.current.shapeStartY + dy,
              x2: (dragState.current.shapeStartX2 || 0) + dx,
              y2: (dragState.current.shapeStartY2 || 0) + dy
            } as LineShape
          }
          return {
            ...shape,
            x: dragState.current.shapeStartX + dx,
            y: dragState.current.shapeStartY + dy
          }
        })
      )
    },
    [graphics, selectedId, onGraphicsChange, getSvgPoint]
  )

  const isDragging = useCallback(() => dragState.current.isDragging, [])

  return {
    dragState,
    startDrag,
    updateDrag,
    isDragging
  }
}
