export function generateId(): string {
  return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function getShapeBoundingBox(shape: any): { minX: number; minY: number; maxX: number; maxY: number; centerX: number; centerY: number } {
  let minX: number, minY: number, maxX: number, maxY: number
  let centerX: number, centerY: number

  switch (shape.type) {
    case 'rect': {
      const halfW = shape.width / 2
      const halfH = shape.height / 2
      minX = shape.x - halfW
      minY = shape.y - halfH
      maxX = shape.x + halfW
      maxY = shape.y + halfH
      centerX = shape.x
      centerY = shape.y
      break
    }
    case 'circle': {
      minX = shape.x - shape.radius
      minY = shape.y - shape.radius
      maxX = shape.x + shape.radius
      maxY = shape.y + shape.radius
      centerX = shape.x
      centerY = shape.y
      break
    }
    case 'line': {
      minX = Math.min(shape.x, shape.x2)
      minY = Math.min(shape.y, shape.y2)
      maxX = Math.max(shape.x, shape.x2)
      maxY = Math.max(shape.y, shape.y2)
      centerX = (shape.x + shape.x2) / 2
      centerY = (shape.y + shape.y2) / 2
      break
    }
    default:
      minX = shape.x
      minY = shape.y
      maxX = shape.x
      maxY = shape.y
      centerX = shape.x
      centerY = shape.y
  }

  return { minX, minY, maxX, maxY, centerX, centerY }
}
