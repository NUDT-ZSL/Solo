import { useRef, useState, useEffect, useCallback } from 'react'
import { useEditorStore } from '../store/editorStore'
import {
  Shape,
  Point,
  HandlePosition,
  handlePositions,
  findShapeAtPoint,
  findHandleAtPoint,
  getHandlePoint,
  normalizeRect,
} from '../utils/geometry'

type DragMode =
  | 'none'
  | 'drawing'
  | 'moving'
  | 'resizing'
  | 'rotating'

interface DragState {
  mode: DragMode
  startPoint: Point
  currentPoint: Point
  shapeId: string | null
  handle: HandlePosition | null
  originalShape: Shape | null
  ghostShape: Shape | null
}

const GRID_SIZE = 20

function renderShape(shape: Shape, isGhost = false, isNew = false) {
  const cx = shape.x + shape.width / 2
  const cy = shape.y + shape.height / 2
  const transform = `translate(${cx} ${cy}) rotate(${shape.rotation}) translate(${-cx} ${-cy})`
  const className = `${isGhost ? 'ghost-shape' : ''} ${isNew ? 'shape-enter' : ''}`

  if (shape.type === 'rect') {
    return (
      <rect
        key={shape.id}
        data-id={shape.id}
        x={shape.x}
        y={shape.y}
        width={shape.width}
        height={shape.height}
        fill={shape.fill}
        transform={transform}
        className={className}
      />
    )
  }

  if (shape.type === 'circle') {
    const rx = shape.width / 2
    const ry = shape.height / 2
    return (
      <ellipse
        key={shape.id}
        data-id={shape.id}
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={shape.fill}
        transform={transform}
        className={className}
      />
    )
  }

  if (shape.type === 'triangle') {
    const p1 = `${cx},${shape.y}`
    const p2 = `${shape.x},${shape.y + shape.height}`
    const p3 = `${shape.x + shape.width},${shape.y + shape.height}`
    return (
      <polygon
        key={shape.id}
        data-id={shape.id}
        points={`${p1} ${p2} ${p3}`}
        fill={shape.fill}
        transform={transform}
        className={className}
      />
    )
  }

  return null
}

function renderSelectionHandles(shape: Shape) {
  return handlePositions.map((handle) => {
    const point = getHandlePoint(shape, handle)
    return (
      <rect
        key={handle}
        data-handle={handle}
        x={point.x - 4}
        y={point.y - 4}
        width={8}
        height={8}
        className="control-handle"
      />
    )
  })
}

function renderSelectionOutline(shape: Shape) {
  const cx = shape.x + shape.width / 2
  const cy = shape.y + shape.height / 2
  const transform = `translate(${cx} ${cy}) rotate(${shape.rotation}) translate(${-cx} ${-cy})`
  return (
    <rect
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      fill="none"
      stroke="#2196f3"
      strokeWidth={1}
      strokeDasharray="4,3"
      transform={transform}
      style={{ pointerEvents: 'none' }}
    />
  )
}

function resizeShape(
  shape: Shape,
  handle: HandlePosition,
  startPoint: Point,
  currentPoint: Point
): Partial<Shape> {
  const angle = (shape.rotation * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  const dx = currentPoint.x - startPoint.x
  const dy = currentPoint.y - startPoint.y

  const localDx = dx * cos + dy * sin
  const localDy = -dx * sin + dy * cos

  let newX = shape.x
  let newY = shape.y
  let newWidth = shape.width
  let newHeight = shape.height

  const cx = shape.x + shape.width / 2
  const cy = shape.y + shape.height / 2

  switch (handle) {
    case 'top-left':
      newX = shape.x + localDx
      newY = shape.y + localDy
      newWidth = shape.width - localDx
      newHeight = shape.height - localDy
      break
    case 'top-center':
      newY = shape.y + localDy
      newHeight = shape.height - localDy
      break
    case 'top-right':
      newY = shape.y + localDy
      newWidth = shape.width + localDx
      newHeight = shape.height - localDy
      break
    case 'middle-left':
      newX = shape.x + localDx
      newWidth = shape.width - localDx
      break
    case 'middle-right':
      newWidth = shape.width + localDx
      break
    case 'bottom-left':
      newX = shape.x + localDx
      newWidth = shape.width - localDx
      newHeight = shape.height + localDy
      break
    case 'bottom-center':
      newHeight = shape.height + localDy
      break
    case 'bottom-right':
      newWidth = shape.width + localDx
      newHeight = shape.height + localDy
      break
  }

  if (newWidth < 5) {
    newWidth = 5
    if (handle.includes('left')) {
      newX = cx - newWidth / 2
    }
  }
  if (newHeight < 5) {
    newHeight = 5
    if (handle.includes('top')) {
      newY = cy - newHeight / 2
    }
  }

  return {
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight,
  }
}

export default function Canvas() {
  const svgRef = useRef<SVGSVGElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    shapes,
    selectedId,
    currentTool,
    selectShape,
    addShape,
    updateShapeWithoutHistory,
    commitHistory,
    recentNewId,
    clearRecentNewId,
    setTool,
  } = useEditorStore()

  const [drag, setDrag] = useState<DragState>({
    mode: 'none',
    startPoint: { x: 0, y: 0 },
    currentPoint: { x: 0, y: 0 },
    shapeId: null,
    handle: null,
    originalShape: null,
    ghostShape: null,
  })

  const [newShapeIds, setNewShapeIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (recentNewId) {
      setNewShapeIds((prev) => new Set(prev).add(recentNewId))
      const id = recentNewId
      const timer = setTimeout(() => {
        setNewShapeIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 200)
      clearRecentNewId()
      return () => clearTimeout(timer)
    }
  }, [recentNewId, clearRecentNewId])

  const getMousePoint = useCallback((e: React.MouseEvent | MouseEvent): Point => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current
    const svg = svgRef.current
    if (!canvas || !svg) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = svg.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    ctx.clearRect(0, 0, rect.width, rect.height)
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 0.5

    for (let x = 0; x <= rect.width; x += GRID_SIZE) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, rect.height)
      ctx.stroke()
    }
    for (let y = 0; y <= rect.height; y += GRID_SIZE) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(rect.width, y)
      ctx.stroke()
    }
  }, [])

  useEffect(() => {
    drawGrid()
    const handleResize = () => drawGrid()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [drawGrid])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      const point = getMousePoint(e)

      if (currentTool !== 'select') {
        setDrag({
          mode: 'drawing',
          startPoint: point,
          currentPoint: point,
          shapeId: null,
          handle: null,
          originalShape: null,
          ghostShape: null,
        })
        return
      }

      const selectedShape = shapes.find((s) => s.id === selectedId)
      if (selectedShape) {
        const handle = findHandleAtPoint(point, selectedShape)
        if (handle) {
          setDrag({
            mode: 'resizing',
            startPoint: point,
            currentPoint: point,
            shapeId: selectedShape.id,
            handle,
            originalShape: { ...selectedShape },
            ghostShape: null,
          })
          return
        }
      }

      const hitShape = findShapeAtPoint(point, shapes)
      if (hitShape) {
        if (hitShape.id !== selectedId) {
          selectShape(hitShape.id)
        }
        setDrag({
          mode: 'moving',
          startPoint: point,
          currentPoint: point,
          shapeId: hitShape.id,
          handle: null,
          originalShape: { ...hitShape },
          ghostShape: null,
        })
      } else {
        selectShape(null)
      }
    },
    [currentTool, shapes, selectedId, selectShape, getMousePoint]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const point = getMousePoint(e)

      if (drag.mode === 'drawing') {
        setDrag((prev) => ({ ...prev, currentPoint: point }))
      } else if (drag.mode === 'moving' && drag.shapeId && drag.originalShape) {
        const dx = point.x - drag.startPoint.x
        const dy = point.y - drag.startPoint.y
        updateShapeWithoutHistory(drag.shapeId, {
          x: drag.originalShape.x + dx,
          y: drag.originalShape.y + dy,
        })
      } else if (
        drag.mode === 'resizing' &&
        drag.shapeId &&
        drag.originalShape &&
        drag.handle
      ) {
        const updates = resizeShape(
          drag.originalShape,
          drag.handle,
          drag.startPoint,
          point
        )
        updateShapeWithoutHistory(drag.shapeId, updates)
      }
    },
    [drag, updateShapeWithoutHistory, getMousePoint]
  )

  const handleMouseUp = useCallback(() => {
    if (drag.mode === 'drawing') {
      const rect = normalizeRect(
        drag.startPoint.x,
        drag.startPoint.y,
        drag.currentPoint.x,
        drag.currentPoint.y
      )
      if (rect.width > 5 && rect.height > 5) {
        addShape({
          type: currentTool as 'rect' | 'circle' | 'triangle',
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          rotation: 0,
          fill: '',
        })
      }
      setTool('select')
    } else if (
      (drag.mode === 'moving' || drag.mode === 'resizing') &&
      drag.shapeId
    ) {
      commitHistory()
    }

    setDrag({
      mode: 'none',
      startPoint: { x: 0, y: 0 },
      currentPoint: { x: 0, y: 0 },
      shapeId: null,
      handle: null,
      originalShape: null,
      ghostShape: null,
    })
  }, [drag, currentTool, addShape, setTool, commitHistory])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!selectedId) return
      const shape = shapes.find((s) => s.id === selectedId)
      if (!shape) return
      const point = getMousePoint(e)
      let hitShape = findShapeAtPoint(point, shapes)
      if (!hitShape || hitShape.id !== selectedId) return

      e.preventDefault()
      const delta = e.deltaY > 0 ? 15 : -15
      const newRotation = (shape.rotation + delta) % 360
      updateShapeWithoutHistory(selectedId, { rotation: newRotation })

      const timer = setTimeout(() => {
        commitHistory()
      }, 0)
      return () => clearTimeout(timer)
    },
    [selectedId, shapes, getMousePoint, updateShapeWithoutHistory, commitHistory]
  )

  const selectedShape = shapes.find((s) => s.id === selectedId) || null

  let ghostShape: Shape | null = null
  if (drag.mode === 'drawing') {
    const rect = normalizeRect(
      drag.startPoint.x,
      drag.startPoint.y,
      drag.currentPoint.x,
      drag.currentPoint.y
    )
    if (rect.width > 1 && rect.height > 1) {
      ghostShape = {
        id: 'ghost',
        type: currentTool as 'rect' | 'circle' | 'triangle',
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        rotation: 0,
        fill:
          currentTool === 'rect'
            ? '#42a5f5'
            : currentTool === 'circle'
            ? '#66bb6a'
            : '#ffa726',
      }
    }
  }

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      />
      <svg
        ref={svgRef}
        className="canvas-svg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {shapes.map((shape) =>
          renderShape(shape, false, newShapeIds.has(shape.id))
        )}
        {ghostShape && renderShape(ghostShape, true, false)}
        {selectedShape && renderSelectionOutline(selectedShape)}
        {selectedShape && renderSelectionHandles(selectedShape)}
      </svg>
    </div>
  )
}
