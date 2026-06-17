import type { FixationPoint, SaccadeParams } from './store'

interface Point {
  x: number
  y: number
}

function interpolatePoints(p1: Point, p2: Point, segments: number): Point[] {
  const points: Point[] = []
  for (let i = 1; i <= segments; i++) {
    const t = i / (segments + 1)
    points.push({
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t
    })
  }
  return points
}

export class SaccadeRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.ctx = this.canvas.getContext('2d')!
  }

  resize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
  }

  private drawArrowhead(
    from: Point,
    to: Point,
    lineWidth: number
  ): void {
    const angle = Math.atan2(to.y - from.y, to.x - from.x)
    const arrowSize = 8 + lineWidth * 2
    const headLength = arrowSize
    const headWidth = arrowSize * 0.6

    const tipX = to.x
    const tipY = to.y
    const baseX = tipX - headLength * Math.cos(angle)
    const baseY = tipY - headLength * Math.sin(angle)

    const leftX = baseX + headWidth * Math.cos(angle - Math.PI / 2)
    const leftY = baseY + headWidth * Math.sin(angle - Math.PI / 2)
    const rightX = baseX + headWidth * Math.cos(angle + Math.PI / 2)
    const rightY = baseY + headWidth * Math.sin(angle + Math.PI / 2)

    this.ctx.beginPath()
    this.ctx.moveTo(tipX, tipY)
    this.ctx.lineTo(leftX, leftY)
    this.ctx.lineTo(rightX, rightY)
    this.ctx.closePath()
    this.ctx.fill()
  }

  private drawNumberMarker(
    point: Point,
    index: number,
    lineColor: string
  ): void {
    const radius = 12
    this.ctx.beginPath()
    this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.fill()
    this.ctx.lineWidth = 2
    this.ctx.strokeStyle = lineColor
    this.ctx.stroke()

    this.ctx.fillStyle = '#000000'
    this.ctx.font = 'bold 11px Arial, sans-serif'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    const text = (index + 1).toString()
    this.ctx.fillText(text, point.x, point.y + 0.5)
  }

  render(
    fixations: FixationPoint[],
    params: SaccadeParams,
    sourceWidth: number,
    sourceHeight: number,
    targetWidth: number,
    targetHeight: number
  ): HTMLCanvasElement {
    const scaleX = targetWidth / sourceWidth
    const scaleY = targetHeight / sourceHeight

    this.resize(targetWidth, targetHeight)
    this.ctx.clearRect(0, 0, targetWidth, targetHeight)

    if (fixations.length === 0) return this.canvas

    const points: Point[] = fixations.map(f => ({
      x: f.x * scaleX,
      y: f.y * scaleY
    }))

    this.ctx.strokeStyle = params.lineColor
    this.ctx.fillStyle = params.lineColor
    this.ctx.lineWidth = params.lineWidth
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]

      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > 5) {
        this.ctx.beginPath()
        this.ctx.moveTo(p1.x, p1.y)

        const segments = Math.min(5, Math.floor(distance / 30))
        if (segments > 0) {
          const interpolated = interpolatePoints(p1, p2, segments)
          for (const ip of interpolated) {
            this.ctx.lineTo(ip.x, ip.y)
          }
        }

        const markerRadius = 14
        const angle = Math.atan2(dy, dx)
        const endX = p2.x - markerRadius * Math.cos(angle)
        const endY = p2.y - markerRadius * Math.sin(angle)
        this.ctx.lineTo(endX, endY)
        this.ctx.stroke()

        const arrowStart = {
          x: endX - 10 * Math.cos(angle),
          y: endY - 10 * Math.sin(angle)
        }
        this.drawArrowhead(arrowStart, { x: endX, y: endY }, params.lineWidth)
      }
    }

    for (let i = 0; i < points.length; i++) {
      this.drawNumberMarker(points[i], i, params.lineColor)
    }

    return this.canvas
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas
  }
}
