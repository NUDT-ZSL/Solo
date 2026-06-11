import { useRef, useCallback } from 'react'
import type { Shape, RectShape, CircleShape, LineShape, ResizeState } from '../types'
import { getShapeBoundingBox } from '../utils/helpers'

interface UseShapeResizeOptions {
  graphics: Shape[]
  selectedId: string | null
  onGraphicsChange: (graphics: Shape[]) => void
  getSvgPoint: (clientX: number, clientY: number) => { x: number; y: number }
}

interface UseShapeResizeResult {
  resizeState: React.MutableRefObject<ResizeState>
  startResize: (e: React.MouseEvent<SVGRectElement | SVGCircleElement>, handle: string) => void
  updateResize: (e: React.MouseEvent<SVGSVGElement>) => void
  isResizing: () => boolean
}

export function useShapeResize({
  graphics,
  selectedId,
  onGraphicsChange,
  getSvgPoint
}: UseShapeResizeOptions): UseShapeResizeResult {
  const resizeState = useRef<ResizeState>({
    isResizing: false,
    handle: '',
    startX: 0,
    startY: 0,
    originalShape: null
  })

  const startResize = useCallback(
    (e: React.MouseEvent<SVGRectElement | SVGCircleElement>, handle: string) => {
      e.stopPropagation()
      const selectedShape = graphics.find((s) => s.id === selectedId)
      if (!selectedShape) return

      const point = getSvgPoint(e.clientX, e.clientY)
      resizeState.current = {
        isResizing: true,
        handle,
        startX: point.x,
        startY: point.y,
        originalShape: JSON.parse(JSON.stringify(selectedShape))
      }
    },
    [graphics, selectedId, getSvgPoint]
  )

  const updateResize = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!resizeState.current.isResizing || !resizeState.current.originalShape || !selectedId) return

      const original = resizeState.current.originalShape
      const handle = resizeState.current.handle
      const { centerX, centerY } = getShapeBoundingBox(original)
      const point = getSvgPoint(e.clientX, e.clientY)

      const cos = Math.cos((-original.rotation * Math.PI) / 180)
      const sin = Math.sin((-original.rotation * Math.PI) / 180)
      const relX = (point.x - centerX) * cos - (point.y - centerY) * sin
      const relY = (point.x - centerX) * sin + (point.y - centerY) * cos

      let newShape = { ...original }

      if (original.type === 'rect') {
        const orig = original as RectShape
        const halfW = orig.width / 2
        const halfH = orig.height / 2

        let newLeft = -halfW
        let newRight = halfW
        let newTop = -halfH
        let newBottom = halfH

        if (handle.includes('l')) newLeft = Math.min(relX, newRight - 1)
        if (handle.includes('r')) newRight = Math.max(relX, newLeft + 1)
        if (handle.includes('t')) newTop = Math.min(relY, newBottom - 1)
        if (handle.includes('b')) newBottom = Math.max(relY, newTop + 1)

        const newWidth = newRight - newLeft
        const newHeight = newBottom - newTop
        const localCx = (newLeft + newRight) / 2
        const localCy = (newTop + newBottom) / 2

        const cosR = Math.cos((original.rotation * Math.PI) / 180)
        const sinR = Math.sin((original.rotation * Math.PI) / 180)

        newShape = {
          ...orig,
          width: newWidth,
          height: newHeight,
          x: centerX + localCx * cosR - localCy * sinR,
          y: centerY + localCx * sinR + localCy * cosR
        } as RectShape
      } else if (original.type === 'circle') {
        const orig = original as CircleShape
        const dist = Math.sqrt(relX * relX + relY * relY)
        newShape = {
          ...orig,
          radius: Math.max(dist, 1)
        } as CircleShape
      } else if (original.type === 'line') {
        const orig = original as LineShape
        const cosR = Math.cos((original.rotation * Math.PI) / 180)
        const sinR = Math.sin((original.rotation * Math.PI) / 180)

        if (handle === 'l') {
          newShape = {
            ...orig,
            x: centerX + relX * cosR - relY * sinR,
            y: centerY + relX * sinR + relY * cosR
          } as LineShape
        } else if (handle === 'r') {
          newShape = {
            ...orig,
            x2: centerX + relX * cosR - relY * sinR,
            y2: centerY + relX * sinR + relY * cosR
          } as LineShape
        }
      }

      onGraphicsChange(graphics.map((s) => (s.id === selectedId ? (newShape as Shape) : s)))
    },
    [graphics, selectedId, onGraphicsChange, getSvgPoint]
  )

  const isResizing = useCallback(() => resizeState.current.isResizing, [])

  return {
    resizeState,
    startResize,
    updateResize,
    isResizing
  }
}
