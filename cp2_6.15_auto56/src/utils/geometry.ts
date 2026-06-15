export type ShapeType = 'rect' | 'circle' | 'triangle'

export interface Shape {
  id: string
  type: ShapeType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  fill: string
}

export interface Point {
  x: number
  y: number
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export type HandlePosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export const handlePositions: HandlePosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]

export function getShapeBounds(shape: Shape): Bounds {
  const cx = shape.x + shape.width / 2
  const cy = shape.y + shape.height / 2
  const angle = (shape.rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(angle))
  const sin = Math.abs(Math.sin(angle))
  const w = shape.width * cos + shape.height * sin
  const h = shape.width * sin + shape.height * cos
  return {
    minX: cx - w / 2,
    minY: cy - h / 2,
    maxX: cx + w / 2,
    maxY: cy + h / 2,
  }
}

export function getHandlePoint(shape: Shape, handle: HandlePosition): Point {
  const bounds = getShapeBounds(shape)
  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  switch (handle) {
    case 'top-left':
      return { x: bounds.minX, y: bounds.minY }
    case 'top-center':
      return { x: cx, y: bounds.minY }
    case 'top-right':
      return { x: bounds.maxX, y: bounds.minY }
    case 'middle-left':
      return { x: bounds.minX, y: cy }
    case 'middle-right':
      return { x: bounds.maxX, y: cy }
    case 'bottom-left':
      return { x: bounds.minX, y: bounds.maxY }
    case 'bottom-center':
      return { x: cx, y: bounds.maxY }
    case 'bottom-right':
      return { x: bounds.maxX, y: bounds.maxY }
  }
}

export function pointInShape(point: Point, shape: Shape): boolean {
  const cx = shape.x + shape.width / 2
  const cy = shape.y + shape.height / 2
  const angle = (-shape.rotation * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = point.x - cx
  const dy = point.y - cy
  const localX = dx * cos - dy * sin
  const localY = dx * sin + dy * cos
  const halfW = shape.width / 2
  const halfH = shape.height / 2

  if (shape.type === 'rect') {
    return localX >= -halfW && localX <= halfW && localY >= -halfH && localY <= halfH
  }

  if (shape.type === 'circle') {
    const rx = halfW
    const ry = halfH
    return (localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) <= 1
  }

  if (shape.type === 'triangle') {
    const p1 = { x: 0, y: -halfH }
    const p2 = { x: -halfW, y: halfH }
    const p3 = { x: halfW, y: halfH }
    const d1 = sign({ x: localX, y: localY }, p1, p2)
    const d2 = sign({ x: localX, y: localY }, p2, p3)
    const d3 = sign({ x: localX, y: localY }, p3, p1)
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0
    return !(hasNeg && hasPos)
  }

  return false
}

function sign(p1: Point, p2: Point, p3: Point): number {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y)
}

export function pointNearHandle(point: Point, shape: Shape, handle: HandlePosition, threshold = 10): boolean {
  const hp = getHandlePoint(shape, handle)
  return Math.abs(point.x - hp.x) <= threshold && Math.abs(point.y - hp.y) <= threshold
}

export function findHandleAtPoint(point: Point, shape: Shape): HandlePosition | null {
  for (const handle of handlePositions) {
    if (pointNearHandle(point, shape, handle)) {
      return handle
    }
  }
  return null
}

export function findShapeAtPoint(point: Point, shapes: Shape[]): Shape | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (pointInShape(point, shapes[i])) {
      return shapes[i]
    }
  }
  return null
}

export function generateId(): string {
  return 'shape_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9)
}

export function normalizeRect(x1: number, y1: number, x2: number, y2: number): { x: number; y: number; width: number; height: number } {
  const x = Math.min(x1, x2)
  const y = Math.min(y1, y2)
  const width = Math.abs(x2 - x1)
  const height = Math.abs(y2 - y1)
  return { x, y, width, height }
}
