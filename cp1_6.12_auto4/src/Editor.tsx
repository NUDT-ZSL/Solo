import React, { useRef, useState, useCallback, useEffect } from 'react'
import type { Shape, ShapeType, RectShape, CircleShape, LineShape, DragState, ResizeState, RotateState, PanState } from './types'
import { generateId, getShapeBoundingBox, clamp } from './utils/helpers'

interface EditorProps {
  graphics: Shape[]
  selectedId: string | null
  currentTool: ShapeType
  zoom: number
  panX: number
  panY: number
  onGraphicsChange: (graphics: Shape[]) => void
  onSelectionChange: (id: string | null) => void
  onCanvasStateChange: (zoom: number, panX: number, panY: number) => void
  onCommitChange: () => void
}

const DEFAULT_COLORS = {
  rect: { fill: '#4a90d9', stroke: '#ffffff' },
  circle: { fill: '#e74c3c', stroke: '#ffffff' },
  line: { fill: 'none', stroke: '#2ecc71' }
}

export const Editor: React.FC<EditorProps> = ({
  graphics,
  selectedId,
  currentTool,
  zoom,
  panX,
  panY,
  onGraphicsChange,
  onSelectionChange,
  onCanvasStateChange,
  onCommitChange
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [spacePressed, setSpacePressed] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [tempShape, setTempShape] = useState<Shape | null>(null)
  const [cursor, setCursor] = useState('default')
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const dragState = useRef<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    shapeStartX: 0,
    shapeStartY: 0
  })

  const resizeState = useRef<ResizeState>({
    isResizing: false,
    handle: '',
    startX: 0,
    startY: 0,
    originalShape: null
  })

  const rotateState = useRef<RotateState>({
    isRotating: false,
    startAngle: 0,
    centerX: 0,
    centerY: 0
  })

  const panState = useRef<PanState>({
    isPanning: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0
  })

  const getSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const x = (clientX - rect.left - panX) / zoom
    const y = (clientY - rect.top - panY) / zoom
    return { x, y }
  }, [zoom, panX, panY])

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return

    const point = getSvgPoint(e.clientX, e.clientY)

    if (spacePressed || (e.target as Element).classList.contains('svg-canvas-bg')) {
      if (spacePressed) {
        panState.current = {
          isPanning: true,
          startX: e.clientX,
          startY: e.clientY,
          startPanX: panX,
          startPanY: panY
        }
        setCursor('grabbing')
        return
      }
    }

    if (currentTool !== 'select') {
      setIsDrawing(true)
      setDrawStart(point)

      const colors = DEFAULT_COLORS[currentTool as keyof typeof DEFAULT_COLORS]

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
    }
  }, [currentTool, spacePressed, panX, panY, getSvgPoint])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    const point = getSvgPoint(e.clientX, e.clientY)
    setMousePos(point)

    if (panState.current.isPanning) {
      const newPanX = panState.current.startPanX + (e.clientX - panState.current.startX)
      const newPanY = panState.current.startPanY + (e.clientY - panState.current.startY)
      onCanvasStateChange(zoom, newPanX, newPanY)
      return
    }

    if (isDrawing && drawStart && tempShape) {
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
      return
    }

    if (dragState.current.isDragging && selectedId) {
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
      return
    }

    if (resizeState.current.isResizing && resizeState.current.originalShape && selectedId) {
      const original = resizeState.current.originalShape
      const handle = resizeState.current.handle
      const { centerX, centerY } = getShapeBoundingBox(original)

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
      return
    }

    if (rotateState.current.isRotating && selectedId) {
      const angle = Math.atan2(point.y - rotateState.current.centerY, point.x - rotateState.current.centerX)
      const degrees = (angle * 180) / Math.PI + 90
      const finalAngle = e.shiftKey ? Math.round(degrees / 15) * 15 : degrees

      onGraphicsChange(
        graphics.map((shape) => {
          if (shape.id !== selectedId) return shape
          return { ...shape, rotation: ((finalAngle % 360) + 360) % 360 }
        })
      )
    }
  }, [isDrawing, drawStart, tempShape, selectedId, graphics, zoom, onGraphicsChange, onCanvasStateChange, getSvgPoint])

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    if (panState.current.isPanning) {
      panState.current.isPanning = false
      setCursor(spacePressed ? 'grab' : 'default')
      return
    }

    if (isDrawing && tempShape) {
      const colors = DEFAULT_COLORS[tempShape.type as keyof typeof DEFAULT_COLORS]
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

    if (dragState.current.isDragging || resizeState.current.isResizing || rotateState.current.isRotating) {
      onCommitChange()
    }

    setIsDrawing(false)
    setDrawStart(null)
    setTempShape(null)
    dragState.current.isDragging = false
    resizeState.current.isResizing = false
    rotateState.current.isRotating = false
  }, [isDrawing, tempShape, graphics, onGraphicsChange, onSelectionChange, onCommitChange])

  const handleShapeMouseDown = useCallback((e: React.MouseEvent, shape: Shape) => {
    e.stopPropagation()
    if (currentTool !== 'select') return

    onSelectionChange(shape.id)
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
    setCursor('move')
  }, [currentTool, onSelectionChange, getSvgPoint])

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, handle: string) => {
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
  }, [graphics, selectedId, getSvgPoint])

  const handleRotateMouseDown = useCallback((e: React.MouseEvent) => {
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
  }, [graphics, selectedId, getSvgPoint])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = clamp(zoom * delta, 0.5, 3)

    const svg = svgRef.current
    if (!svg) return

    const rect = svg.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const scaleRatio = newZoom / zoom
    const newPanX = mouseX - (mouseX - panX) * scaleRatio
    const newPanY = mouseY - (mouseY - panY) * scaleRatio

    onCanvasStateChange(newZoom, newPanX, newPanY)
  }, [zoom, panX, panY, onCanvasStateChange])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        setSpacePressed(true)
        if (!dragState.current.isDragging && !resizeState.current.isResizing && !rotateState.current.isRotating) {
          setCursor('grab')
        }
      }
      if (e.code === 'Escape') {
        onSelectionChange(null)
      }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedId && document.activeElement?.tagName !== 'INPUT') {
          onGraphicsChange(graphics.filter((s) => s.id !== selectedId))
          onSelectionChange(null)
          onCommitChange()
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false)
        if (!panState.current.isPanning) {
          setCursor('default')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [selectedId, graphics, onGraphicsChange, onSelectionChange, onCommitChange])

  const renderShape = (shape: Shape, isSelected: boolean, isTemp: boolean = false) => {
    const bbox = getShapeBoundingBox(shape)

    const getTransform = () => {
      return `rotate(${shape.rotation} ${bbox.centerX} ${bbox.centerY})`
    }

    const commonProps = {
      fill: shape.fill,
      stroke: shape.stroke,
      strokeWidth: shape.strokeWidth,
      transform: getTransform(),
      className: isTemp ? 'temp-shape' : '',
      style: { cursor: currentTool === 'select' ? 'move' : 'crosshair' }
    }

    let shapeElement: JSX.Element | null = null

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
        onMouseDown={(e) => handleShapeMouseDown(e, shape)}
      >
        {shapeElement}
        {isSelected && (
          <g transform={getTransform()}>
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
                  onMouseDown={(e) => handleResizeMouseDown(e, 'tl')}
                  style={{ cursor: 'nw-resize' }}
                />
                <rect
                  className="resize-handle"
                  x={bbox.maxX - 4}
                  y={bbox.minY - 8}
                  width="12"
                  height="12"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'tr')}
                  style={{ cursor: 'ne-resize' }}
                />
                <rect
                  className="resize-handle"
                  x={bbox.minX - 8}
                  y={bbox.maxY - 4}
                  width="12"
                  height="12"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'bl')}
                  style={{ cursor: 'sw-resize' }}
                />
                <rect
                  className="resize-handle"
                  x={bbox.maxX - 4}
                  y={bbox.maxY - 4}
                  width="12"
                  height="12"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'br')}
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
                  onMouseDown={(e) => handleResizeMouseDown(e, 'l')}
                  style={{ cursor: 'move' }}
                />
                <circle
                  className="resize-handle-line"
                  cx={(shape as LineShape).x2}
                  cy={(shape as LineShape).y2}
                  r="6"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'r')}
                  style={{ cursor: 'move' }}
                />
              </>
            )}

            <g onMouseDown={handleRotateMouseDown} style={{ cursor: 'grab' }}>
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
        )}
      </g>
    )
  }

  return (
    <div className="editor-container">
      <svg
        ref={svgRef}
        className="svg-canvas"
        style={{ cursor }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onWheel={handleWheel}
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#3a3a4e" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect
          className="svg-canvas-bg"
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#grid)"
          style={{ cursor: spacePressed ? 'grab' : currentTool === 'select' ? 'default' : 'crosshair' }}
        />
        <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
          {graphics.map((shape) =>
            renderShape(shape, shape.id === selectedId)
          )}
          {tempShape && renderShape(tempShape, false, true)}
        </g>
      </svg>
      <div className="canvas-status-bar">
        <span>缩放: {(zoom * 100).toFixed(0)}%</span>
        <span>坐标: ({Math.round(mousePos.x)}, {Math.round(mousePos.y)})</span>
        <span>图形数: {graphics.length}</span>
      </div>
    </div>
  )
}
