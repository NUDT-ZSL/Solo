import React from 'react'
import type { Shape, LineShape } from '../types'
import { getShapeBoundingBox } from '../utils/helpers'

interface SelectionHandlesProps {
  shape: Shape
  onResizeMouseDown: (e: React.MouseEvent<SVGElement>, handle: string) => void
  onRotateMouseDown: (e: React.MouseEvent<SVGElement>) => void
}

export const SelectionHandles: React.FC<SelectionHandlesProps> = ({
  shape,
  onResizeMouseDown,
  onRotateMouseDown
}) => {
  const bbox = getShapeBoundingBox(shape)
  const { centerX, centerY } = bbox
  const transform = `rotate(${shape.rotation} ${centerX} ${centerY})`

  return (
    <g transform={transform}>
      <rect
        x={bbox.minX - 5}
        y={bbox.minY - 5}
        width={bbox.maxX - bbox.minX + 10}
        height={bbox.maxY - bbox.minY + 10}
        fill="none"
        stroke="#6cb6ff"
        strokeWidth="1.5"
        strokeDasharray="6 3"
        pointerEvents="none"
      />

      {shape.type !== 'line' ? (
        <>
          <rect
            className="resize-handle"
            x={bbox.minX - 8}
            y={bbox.minY - 8}
            width="12"
            height="12"
            onMouseDown={(e: React.MouseEvent<SVGElement>) => onResizeMouseDown(e, 'tl')}
            style={{ cursor: 'nw-resize' }}
          />
          <rect
            className="resize-handle"
            x={bbox.maxX - 4}
            y={bbox.minY - 8}
            width="12"
            height="12"
            onMouseDown={(e: React.MouseEvent<SVGElement>) => onResizeMouseDown(e, 'tr')}
            style={{ cursor: 'ne-resize' }}
          />
          <rect
            className="resize-handle"
            x={bbox.minX - 8}
            y={bbox.maxY - 4}
            width="12"
            height="12"
            onMouseDown={(e: React.MouseEvent<SVGElement>) => onResizeMouseDown(e, 'bl')}
            style={{ cursor: 'sw-resize' }}
          />
          <rect
            className="resize-handle"
            x={bbox.maxX - 4}
            y={bbox.maxY - 4}
            width="12"
            height="12"
            onMouseDown={(e: React.MouseEvent<SVGElement>) => onResizeMouseDown(e, 'br')}
            style={{ cursor: 'se-resize' }}
          />
        </>
      ) : (
        <>
          <circle
            className="resize-handle-line"
            cx={shape.x}
            cy={shape.y}
            r="6"
            onMouseDown={(e: React.MouseEvent<SVGElement>) => onResizeMouseDown(e, 'l')}
            style={{ cursor: 'move' }}
          />
          <circle
            className="resize-handle-line"
            cx={(shape as LineShape).x2}
            cy={(shape as LineShape).y2}
            r="6"
            onMouseDown={(e: React.MouseEvent<SVGElement>) => onResizeMouseDown(e, 'r')}
            style={{ cursor: 'move' }}
          />
        </>
      )}

      <g onMouseDown={onRotateMouseDown} style={{ cursor: 'grab' }}>
        <line
          x1={(bbox.minX + bbox.maxX) / 2}
          y1={bbox.minY - 5}
          x2={(bbox.minX + bbox.maxX) / 2}
          y2={bbox.minY - 25}
          stroke="#6cb6ff"
          strokeWidth="1"
          pointerEvents="none"
        />
        <circle
          className="rotate-handle"
          cx={(bbox.minX + bbox.maxX) / 2}
          cy={bbox.minY - 30}
          r="8"
        />
      </g>
    </g>
  )
}
