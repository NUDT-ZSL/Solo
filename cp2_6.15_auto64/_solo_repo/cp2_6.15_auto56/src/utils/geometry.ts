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
  const cosA = Math.abs(Math.cos(angle))
  const sinA = Math.abs(Math.sin(angle))
  const w = shape.width * cosA + shape.height * sinA
  const h = shape.width * sinA + shape.height * cosA
  return {
    minX: cx - w / 2,
    minY: cy - h / 2,
    maxX: cx + w / 2,
    maxY: cy + h / 2,
  }
}

export function getHandlePoint(shape: Shape, handle: HandlePosition): Point {
  const cx = shape.x + shape.width / 2
  const cy = shape.y + shape.height / 2
  const halfW = shape.width / 2
  const halfH = shape.height / 2
  switch (handle) {
    case 'top-left':
      return { x: cx - halfW, y: cy - halfH }
    case 'top-center':
      return { x: cx, y: cy - halfH }
    case 'top-right':
      return { x: cx + halfW, y: cy - halfH }
    case 'middle-left':
      return { x: cx - halfW, y: cy }
    case 'middle-right':
      return { x: cx + halfW, y: cy }
    case 'bottom-left':
      return { x: cx - halfW, y: cy + halfH }
    case 'bottom-center':
      return { x: cx, y: cy + halfH }
    case 'bottom-right':
      return { x: cx + halfW, y: cy + halfH }
  }
}

export function pointInShape(point: Point, shape: Shape): boolean {
  const cx = shape.x + shape.width / 2
  const cy = shape.y + shape.height / 2
  const angle = (-shape.rotation * Math.PI) / 180
  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)
  const dx = point.x - cx
  const dy = point.y - cy
  const localX = dx * cosA - dy * sinA
  const localY = dx * sinA + dy * cosA
  const halfW = shape.width / 2
  const halfH = shape.height / 2

  if (shape.type === 'rect') {
    return localX >= -halfW && localX <= halfW && localY >= -halfH && localY <= halfH
  }

  if (shape.type === 'circle') {
    if (halfW === 0 || halfH === 0) return false
    return (localX * localX) / (halfW * halfW) + (localY * localY) / (halfH * halfH) <= 1
  }

  if (shape.type === 'triangle') {
    const v0 = { x: 0, y: -halfH }
    const v1 = { x: -halfW, y: halfH }
    const v2 = { x: halfW, y: halfH }
    return pointInTriangle(localX, localY, v0, v1, v2)
  }

  return false
}

function pointInTriangle(
  px: number,
  py: number,
  v0: Point,
  v1: Point,
  v2: Point
): boolean {
  const d00 = v1.x - v0.x
  const d01 = v1.y - v0.y
  const d10 = v2.x - v0.x
  const d11 = v2.y - v0.y
  const d20 = px - v0.x
  const d21 = py - v0.y

  const dot00 = d00 * d00 + d01 * d01
  const dot01 = d00 * d10 + d01 * d11
  const dot02 = d00 * d20 + d01 * d21
  const dot11 = d10 * d10 + d11 * d11
  const dot12 = d10 * d20 + d11 * d21

  const inv = 1 / (dot00 * dot11 - dot01 * dot01)
  const u = (dot11 * dot02 - dot01 * dot12) * inv
  const v = (dot00 * dot12 - dot01 * dot02) * inv

  return u >= 0 && v >= 0 && u + v <= 1
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
