import type { Shape, RectShape, CircleShape, LineShape } from '../types'

export function shapeToSvgElement(shape: Shape): string {
  switch (shape.type) {
    case 'rect': {
      const s = shape as RectShape
      const halfW = s.width / 2
      const halfH = s.height / 2
      return `  <rect x="${s.x - halfW}" y="${s.y - halfH}" width="${s.width}" height="${s.height}" rx="${s.rx}" ry="${s.rx}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" transform="rotate(${s.rotation} ${s.x} ${s.y})"/>`
    }
    case 'circle': {
      const s = shape as CircleShape
      return `  <circle cx="${s.x}" cy="${s.y}" r="${s.radius}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" transform="rotate(${s.rotation} ${s.x} ${s.y})"/>`
    }
    case 'line': {
      const s = shape as LineShape
      const cx = (s.x + s.x2) / 2
      const cy = (s.y + s.y2) / 2
      return `  <line x1="${s.x}" y1="${s.y}" x2="${s.x2}" y2="${s.y2}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" transform="rotate(${s.rotation} ${cx} ${cy})"/>`
    }
    default:
      return ''
  }
}

export function exportGraphicsToSvg(graphics: Shape[]): string {
  if (graphics.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="-100 -100 200 200">
</svg>`
  }

  const minX = Math.min(...graphics.map((g: Shape) => {
    if (g.type === 'rect') return (g as RectShape).x - (g as RectShape).width / 2
    if (g.type === 'circle') return (g as CircleShape).x - (g as CircleShape).radius
    return Math.min((g as LineShape).x, (g as LineShape).x2)
  }))
  const minY = Math.min(...graphics.map((g: Shape) => {
    if (g.type === 'rect') return (g as RectShape).y - (g as RectShape).height / 2
    if (g.type === 'circle') return (g as CircleShape).y - (g as CircleShape).radius
    return Math.min((g as LineShape).y, (g as LineShape).y2)
  }))
  const maxX = Math.max(...graphics.map((g: Shape) => {
    if (g.type === 'rect') return (g as RectShape).x + (g as RectShape).width / 2
    if (g.type === 'circle') return (g as CircleShape).x + (g as CircleShape).radius
    return Math.max((g as LineShape).x, (g as LineShape).x2)
  }))
  const maxY = Math.max(...graphics.map((g: Shape) => {
    if (g.type === 'rect') return (g as RectShape).y + (g as RectShape).height / 2
    if (g.type === 'circle') return (g as CircleShape).y + (g as CircleShape).radius
    return Math.max((g as LineShape).y, (g as LineShape).y2)
  }))

  const padding = 20
  const width = maxX - minX + padding * 2
  const height = maxY - minY + padding * 2

  const elements = graphics.map(shapeToSvgElement).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX - padding} ${minY - padding} ${width} ${height}">
${elements}
</svg>`
}

export function parseSvgToGraphics(svgContent: string): Shape[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgContent, 'image/svg+xml')
  const graphics: Shape[] = []
  let idCounter = Date.now()

  const generateId = () => `shape_${idCounter++}`

  const extractRotation = (element: Element): { rotation: number; centerX: number; centerY: number } => {
    const transform = element.getAttribute('transform') || ''
    const match = transform.match(/rotate\(([-\d.]+)(?:\s+([-\d.]+)\s+([-\d.]+))?\)/)
    if (match) {
      return {
        rotation: parseFloat(match[1]) || 0,
        centerX: match[2] ? parseFloat(match[2]) : 0,
        centerY: match[3] ? parseFloat(match[3]) : 0
      }
    }
    return { rotation: 0, centerX: 0, centerY: 0 }
  }

  const rects = doc.querySelectorAll('rect')
  rects.forEach((rect) => {
    const x = parseFloat(rect.getAttribute('x') || '0')
    const y = parseFloat(rect.getAttribute('y') || '0')
    const width = parseFloat(rect.getAttribute('width') || '100')
    const height = parseFloat(rect.getAttribute('height') || '100')
    const { rotation } = extractRotation(rect)

    graphics.push({
      id: generateId(),
      type: 'rect',
      x: x + width / 2,
      y: y + height / 2,
      width,
      height,
      rx: parseFloat(rect.getAttribute('rx') || '0'),
      rotation,
      fill: rect.getAttribute('fill') || '#4a90d9',
      stroke: rect.getAttribute('stroke') || '#ffffff',
      strokeWidth: parseFloat(rect.getAttribute('stroke-width') || '2')
    } as RectShape)
  })

  const circles = doc.querySelectorAll('circle')
  circles.forEach((circle) => {
    const cx = parseFloat(circle.getAttribute('cx') || '0')
    const cy = parseFloat(circle.getAttribute('cy') || '0')
    const { rotation } = extractRotation(circle)

    graphics.push({
      id: generateId(),
      type: 'circle',
      x: cx,
      y: cy,
      radius: parseFloat(circle.getAttribute('r') || '50'),
      rotation,
      fill: circle.getAttribute('fill') || '#e74c3c',
      stroke: circle.getAttribute('stroke') || '#ffffff',
      strokeWidth: parseFloat(circle.getAttribute('stroke-width') || '2')
    } as CircleShape)
  })

  const lines = doc.querySelectorAll('line')
  lines.forEach((line) => {
    const x1 = parseFloat(line.getAttribute('x1') || '0')
    const y1 = parseFloat(line.getAttribute('y1') || '0')
    const x2 = parseFloat(line.getAttribute('x2') || '100')
    const y2 = parseFloat(line.getAttribute('y2') || '100')
    const { rotation } = extractRotation(line)

    graphics.push({
      id: generateId(),
      type: 'line',
      x: x1,
      y: y1,
      x2,
      y2,
      rotation,
      fill: 'none',
      stroke: line.getAttribute('stroke') || '#2ecc71',
      strokeWidth: parseFloat(line.getAttribute('stroke-width') || '2')
    } as LineShape)
  })

  return graphics
}

export function downloadSvgFile(svgContent: string, filename: string = 'drawing.svg'): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
