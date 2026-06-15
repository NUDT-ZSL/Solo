import { useRef, useCallback } from 'react'
import type { Shape, RotateState } from '../types'
import { getShapeBoundingBox } from '../utils/helpers'

interface UseShapeRotateOptions {
  graphics: Shape[]
  selectedId: string | null
  onGraphicsChange: (graphics: Shape[]) => void
  getSvgPoint: (clientX: number, clientY: number) => { x: number; y: number }
}

interface UseShapeRotateResult {
  rotateState: React.MutableRefObject<RotateState>
  startRotate: (e: React.MouseEvent<SVGElement>) => void
  updateRotate: (e: React.MouseEvent<SVGElement>) => void
  isRotating: () => boolean
}

export function useShapeRotate({
  graphics,
  selectedId,
  onGraphicsChange,
  getSvgPoint
}: UseShapeRotateOptions): UseShapeRotateResult {
  const rotateState = useRef<RotateState>({
    isRotating: false,
    startAngle: 0,
    centerX: 0,
    centerY: 0
  })

  const startRotate = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      e.stopPropagation()
      const selectedShape = graphics.find((s) => s.id === selectedId)
      if (!selectedShape) return

      const { centerX, centerY } = getShapeBoundingBox(selectedShape)
      const point = getSvgPoint(e.clientX, e.clientY)
      const startAngle = Math.atan2(point.y - centerY, point.x - centerX)

      rotateState.current = {
        isRotating: true,
        startAngle,
        centerX,
        centerY
      }
    },
    [graphics, selectedId, getSvgPoint]
  )

  const updateRotate = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      if (!rotateState.current.isRotating || !selectedId) return
      const point = getSvgPoint(e.clientX, e.clientY)
      const angle = Math.atan2(
        point.y - rotateState.current.centerY,
        point.x - rotateState.current.centerX
      )
      const degrees = (angle * 180) / Math.PI + 90
      const finalAngle = e.shiftKey ? Math.round(degrees / 15) * 15 : degrees

      onGraphicsChange(
        graphics.map((shape) => {
          if (shape.id !== selectedId) return shape
          return { ...shape, rotation: ((finalAngle % 360) + 360) % 360 }
        })
      )
    },
    [graphics, selectedId, onGraphicsChange, getSvgPoint]
  )

  const isRotating = useCallback(() => rotateState.current.isRotating, [])

  return {
    rotateState,
    startRotate,
    updateRotate,
    isRotating
  }
}
