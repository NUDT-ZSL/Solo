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

  const canvasPanZoom = useCanvasPanZoom({
    zoom,
    panX,
    panY,
    onCanvasStateChange,
    svgRef
  })

  const shapeDrag = useShapeDrag({
    graphics,
    selectedId,
    onGraphicsChange,
    getSvgPoint
  })

  const shapeResize = useShapeResize({
    graphics,
    selectedId,
    onGraphicsChange,
    getSvgPoint
  })

  const shapeRotate = useShapeRotate({
    graphics,
    selectedId,
    onGraphicsChange,
    getSvgPoint
  })

  const shapeDraw = useShapeDraw({
    currentTool,
    onGraphicsChange,
    onSelectionChange,
    onCommitChange,
    graphics
  })

  const isInteracting =
    shapeDrag.isDragging() ||
    shapeResize.isResizing() ||
    shapeRotate.isRotating() ||
    shapeDraw.isDrawing ||
    canvasPanZoom.panState.current.isPanning

  useEditorKeyboard({
    selectedId,
    graphics,
    onGraphicsChange,
    onSelectionChange,
    onCommitChange,
    onUndo,
    onRedo,
    onToolChange,
    onSpaceChange: canvasPanZoom.setSpacePressed,
    isSpacePressed: canvasPanZoom.spacePressed,
    isInteracting,
    onCursorChange: canvasPanZoom.setCursor
  })

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.button !== 0) return

      const point = getSvgPoint(e.clientX, e.clientY)
      const isBgClick = (e.target as Element).classList.contains('svg-canvas-bg')

      if (canvasPanZoom.spacePressed || isBgClick) {
        if (canvasPanZoom.spacePressed) {
          canvasPanZoom.startPanning(e.clientX, e.clientY)
          return
        }
      }

      if (currentTool !== 'select') {
        shapeDraw.startDrawing(point)
        return
      }

      if (isBgClick && currentTool === 'select') {
        onSelectionChange(null)
      }
    },
    [
      currentTool,
      canvasPanZoom.spacePressed,
      getSvgPoint,
      canvasPanZoom,
      shapeDraw,
      onSelectionChange
    ]
  )

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const point = getSvgPoint(e.clientX, e.clientY)
      setMousePos(point)

      if (canvasPanZoom.panState.current.isPanning) {
        canvasPanZoom.updatePanning(e.clientX, e.clientY)
        return
      }

      if (shapeDraw.isDrawing) {
        shapeDraw.updateDrawing(point)
        return
      }

      if (shapeDrag.dragState.current.isDragging) {
        shapeDrag.updateDrag(e as unknown as React.MouseEvent<SVGGElement>)
        return
      }

      if (shapeResize.resizeState.current.isResizing) {
        shapeResize.updateResize(e)
        return
      }

      if (shapeRotate.rotateState.current.isRotating) {
        shapeRotate.updateRotate(e)
        return
      }
    },
    [
      getSvgPoint,
      canvasPanZoom,
      shapeDraw,
      shapeDrag,
      shapeResize,
      shapeRotate
    ]
  )

  const handleCanvasMouseUp = useCallback(
    (_e: React.MouseEvent<SVGSVGElement>) => {
      if (canvasPanZoom.panState.current.isPanning) {
        canvasPanZoom.endPanning()
        if (!canvasPanZoom.spacePressed) {
          canvasPanZoom.setCursor('default')
        } else {
          canvasPanZoom.setCursor('grab')
        }
        return
      }

      if (shapeDraw.isDrawing) {
        shapeDraw.endDrawing()
        return
      }

      if (shapeDrag.isDragging() || shapeResize.isResizing() || shapeRotate.isRotating()) {
        shapeDrag.dragState.current.isDragging = false
        shapeResize.resizeState.current.isResizing = false
        shapeRotate.rotateState.current.isRotating = false
        canvasPanZoom.setCursor('default')
        onCommitChange()
      }
    },
    [
      canvasPanZoom,
      shapeDraw,
      shapeDrag,
      shapeResize,
      shapeRotate,
      onCommitChange
    ]
  )

  const handleCanvasMouseLeave = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      handleCanvasMouseUp(e)
    },
    [handleCanvasMouseUp]
  )

  const handleShapeMouseDown = useCallback(
    (e: React.MouseEvent<SVGGElement>, shape: Shape) => {
      e.stopPropagation()
      if (currentTool !== 'select') return

      onSelectionChange(shape.id)
      shapeDrag.startDrag(e, shape)
      canvasPanZoom.setCursor('move')
    },
    [currentTool, onSelectionChange, shapeDrag, canvasPanZoom]
  )

  const selectedShape = graphics.find((s) => s.id === selectedId)

  const renderShapeWithSelection = (shape: Shape) => {
    const isSelected = shape.id === selectedId
    return (
      <ShapeElement
        key={shape.id}
        shape={shape}
        currentTool={currentTool}
        onShapeMouseDown={handleShapeMouseDown}
      >
        {isSelected && (
          <SelectionHandles
            shape={shape}
            onResizeMouseDown={shapeResize.startResize}
            onRotateMouseDown={shapeRotate.startRotate}
          />
        )}
      </ShapeElement>
    )
  }

  const renderTempShape = () => {
    if (!shapeDraw.tempShape) return null
    return (
      <ShapeElement
        shape={shapeDraw.tempShape}
        currentTool={currentTool}
        isTemp={true}
      />
    )
  }

  const finalCursor =
    shapeDrag.isDragging() || shapeResize.isResizing() || shapeRotate.isRotating()
      ? 'move'
      : canvasPanZoom.cursor

  return (
    <div className="editor-container">
      <svg
        ref={svgRef}
        className="svg-canvas"
        style={{ cursor: finalCursor }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseLeave}
        onWheel={canvasPanZoom.handleWheel}
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
            cursor: canvasPanZoom.spacePressed
              ? 'grab'
              : currentTool === 'select'
              ? 'default'
              : 'crosshair'
          }}
        />
        <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
          {graphics.map(renderShapeWithSelection)}
          {renderTempShape()}
        </g>
      </svg>
      <CanvasStatusBar
        zoom={zoom}
        mousePos={mousePos}
        graphicsCount={graphics.length}
      />
    </div>
  )
}
