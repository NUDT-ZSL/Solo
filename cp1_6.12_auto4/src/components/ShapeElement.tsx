import React from 'react'
import type { Shape, RectShape, CircleShape, LineShape } from '../types'
import { getShapeBoundingBox } from '../utils/helpers'

interface ShapeElementProps {
  shape: Shape
  currentTool: 'select' | 'rect' | 'circle' | 'line'
  isTemp?: boolean
  onShapeMouseDown?: (e: React.MouseEvent<SVGGElement>, shape: Shape) => void
  children?: React.ReactNode
}

export const ShapeElement: React.FC<ShapeElementProps> = ({
  shape,
  currentTool,
  isTemp = false,
  onShapeMouseDown,
  children
}) => {
  const bbox = getShapeBoundingBox(shape)

  const transform = `rotate(${shape.rotation} ${bbox.centerX} ${bbox.centerY})`

  const commonProps = {
    fill: shape.fill,
    stroke: shape.stroke,
    strokeWidth: shape.strokeWidth,
    transform,
    className: isTemp ? 'temp-shape' : '',
    style: { cursor: currentTool === 'select' ? 'move' : 'crosshair' } as React.CSSProperties
  }

  let shapeElement: React.ReactElement | null = null

  if (shape.type === 'rect') {
    const s = shape as RectShape
    shapeElement = (
      <rect
        x={s.x - s.width / 2}
        y={s.y - s.height / 2}
        width={s.width}
        height={s.height}
        rx={s.rx}
        ry={s.rx}
        {...commonProps}
      />
    )
  } else if (shape.type === 'circle') {
    const s = shape as CircleShape
    shapeElement = (
      <circle
        cx={s.x}
        cy={s.y}
        r={s.radius}
        {...commonProps}
      />
    )
  } else if (shape.type === 'line') {
    const s = shape as LineShape
    shapeElement = (
      <line
        x1={s.x}
        y1={s.y}
        x2={s.x2}
        y2={s.y2}
        strokeLinecap="round"
        {...commonProps}
        fill="none"
      />
    )
  }

  if (isTemp) {
    return shapeElement
  }

  return (
    <g
      key={shape.id}
      onMouseDown={(e: React.MouseEvent<SVGGElement>) => {
        if (onShapeMouseDown) {
          onShapeMouseDown(e, shape)
        }
      }}
    >
      {shapeElement}
      {children}
    </g>
  )
}
