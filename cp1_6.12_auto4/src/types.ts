export type ShapeType = 'rect' | 'circle' | 'line' | 'select'

export interface BaseShape {
  id: string
  type: ShapeType
  x: number
  y: number
  rotation: number
  fill: string
  stroke: string
  strokeWidth: number
}

export interface RectShape extends BaseShape {
  type: 'rect'
  width: number
  height: number
  rx: number
}

export interface CircleShape extends BaseShape {
  type: 'circle'
  radius: number
}

export interface LineShape extends BaseShape {
  type: 'line'
  x2: number
  y2: number
}

export type Shape = RectShape | CircleShape | LineShape

export interface CanvasState {
  graphics: Shape[]
  selectedId: string | null
  zoom: number
  panX: number
  panY: number
}

export interface EditorState {
  graphics: Shape[]
  selectedId: string | null
  currentTool: ShapeType
}

export interface DragState {
  isDragging: boolean
  startX: number
  startY: number
  shapeStartX: number
  shapeStartY: number
  shapeStartX2?: number
  shapeStartY2?: number
}

export interface ResizeState {
  isResizing: boolean
  handle: string
  startX: number
  startY: number
  originalShape: Shape | null
}

export interface RotateState {
  isRotating: boolean
  startAngle: number
  centerX: number
  centerY: number
}

export interface PanState {
  isPanning: boolean
  startX: number
  startY: number
  startPanX: number
  startPanY: number
}
