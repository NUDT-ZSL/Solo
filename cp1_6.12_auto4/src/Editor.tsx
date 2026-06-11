import React, { useRef, useState, useCallback } from 'react'
import type { Shape, ShapeType } from './types'
import { useCanvasPanZoom } from './hooks/useCanvasPanZoom'
import { useShapeDrag } from './hooks/useShapeDrag'
import { useShapeResize } from './hooks/useShapeResize'
import { useShapeRotate } from './hooks/useShapeRotate'
import { useShapeDraw } from './hooks/useShapeDraw'
import { useEditorKeyboard } from './hooks/useEditorKeyboard'
import { ShapeElement } from './components/ShapeElement'
import { SelectionHandles } from './components/SelectionHandles'
import { CanvasStatusBar } from './components/CanvasStatusBar'

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
  onUndo: () => void
  onRedo: () => void
  onToolChange: (tool: ShapeType) => void
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
  onCommitChange,
  onUndo,
  onRedo,
  onToolChange
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const getSvgPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }
      const rect = svg.getBoundingClientRect()
      const x = (clientX - rect.left - panX) / zoom
      const y = (clientY - rect.top - panY) / zoom
      return { x, y }
    },
    [zoom, panX, panY]
  )

  const panZoom = useCanvasPanZoom({ zoom, panX, panY, onCanvasStateChange, svgRef })
  const drag = useShapeDrag({ graphics, selectedId, onGraphicsChange, getSvgPoint })
  const resize = useShapeResize({ graphics, selectedId, onGraphicsChange, getSvgPoint })
  const rotate = useShapeRotate({ graphics, selectedId, onGraphicsChange, getSvgPoint })
  const draw = useShapeDraw({ currentTool, onGraphicsChange, onSelectionChange, onCommitChange, graphics })

  const isInteracting =
    drag.isDragging() || resize.isResizing() || rotate.isRotating() || draw.isDrawing || panZoom.panState.current.isPanning

  useEditorKeyboard({
    selectedId,
    graphics,
    onGraphicsChange,
    onSelectionChange,
    onCommitChange,
    onUndo,
    onRedo,
    onToolChange,
    onSpaceChange: panZoom.setSpacePressed,
    isSpacePressed: panZoom.spacePressed,
    isInteracting,
    onCursorChange: panZoom.setCursor
  })

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.button !== 0) return
      const point = getSvgPoint(e.clientX, e.clientY)
      const isBg = (e.target as Element).classList.contains('svg-canvas-bg')

      if (panZoom.spacePressed) {
        panZoom.startPanning(e.clientX, e.clientY)
        return
      }

      if (currentTool !== 'select') {
        draw.startDrawing(point)
        return
      }

      if (isBg) {
        onSelectionChange(null)
      }
    },
    [currentTool, panZoom, getSvgPoint, draw, onSelectionChange]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const point = getSvgPoint(e.clientX, e.clientY)
      setMousePos(point)

      if (panZoom.panState.current.isPanning) {
        panZoom.updatePanning(e.clientX, e.clientY)
        return
      }
      if (draw.isDrawing) {
        draw.updateDrawing(point)
        return
      }
      if (drag.dragState.current.isDragging) {
        drag.updateDrag(e as React.MouseEvent<SVGElement>)
        return
      }
      if (resize.resizeState.current.isResizing) {
        resize.updateResize(e as React.MouseEvent<SVGElement>)
        return
      }
      if (rotate.rotateState.current.isRotating) {
        rotate.updateRotate(e as React.MouseEvent<SVGElement>)
        return
      }
    },
    [getSvgPoint, panZoom, draw, drag, resize, rotate]
  )

  const handleMouseUp = useCallback(
    (_e: React.MouseEvent<SVGSVGElement>) => {
      if (panZoom.panState.current.isPanning) {
        panZoom.endPanning()
        panZoom.setCursor(panZoom.spacePressed ? 'grab' : 'default')
        return
      }
      if (draw.isDrawing) {
        draw.endDrawing()
        return
      }
      const wasInteracting = drag.isDragging() || resize.isResizing() || rotate.isRotating()
      if (wasInteracting) {
        drag.dragState.current.isDragging = false
        resize.resizeState.current.isResizing = false
        rotate.rotateState.current.isRotating = false
        panZoom.setCursor('default')
        onCommitChange()
      }
    },
    [panZoom, draw, drag, resize, rotate, onCommitChange]
  )

  const handleShapeMouseDown = useCallback(
    (e: React.MouseEvent<SVGElement>, shape: Shape) => {
      e.stopPropagation()
      if (currentTool !== 'select') return
      onSelectionChange(shape.id)
      drag.startDrag(e, shape)
      panZoom.setCursor('move')
    },
    [currentTool, onSelectionChange, drag, panZoom]
  )

  const finalCursor =
    drag.isDragging() || resize.isResizing() || rotate.isRotating() ? 'move' : panZoom.cursor

  return (
    <div className="editor-container">
      <svg
        ref={svgRef}
        className="svg-canvas"
        style={{ cursor: finalCursor }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={panZoom.handleWheel}
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
          style={{
            cursor: panZoom.spacePressed ? 'grab' : currentTool === 'select' ? 'default' : 'crosshair'
          }}
        />
        <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
          {graphics.map((shape) => {
            const isSelected = shape.id === selectedId
            return (
              <ShapeElement key={shape.id} shape={shape} currentTool={currentTool} onShapeMouseDown={handleShapeMouseDown}>
                {isSelected && (
                  <SelectionHandles shape={shape} onResizeMouseDown={resize.startResize} onRotateMouseDown={rotate.startRotate} />
                )}
              </ShapeElement>
            )
          })}
          {draw.tempShape && <ShapeElement shape={draw.tempShape} currentTool={currentTool} isTemp={true} />}
        </g>
      </svg>
      <CanvasStatusBar zoom={zoom} mousePos={mousePos} graphicsCount={graphics.length} />
    </div>
  )
}
