import type { Star } from './star'

export interface ConstellationLine {
  starA: Star
  starB: Star
  opacity: number
}

export class SpatialHash {
  private cellSize: number
  private cells: Map<string, Star[]>

  constructor(cellSize: number) {
    this.cellSize = cellSize
    this.cells = new Map()
  }

  clear(): void {
    this.cells.clear()
  }

  insert(star: Star): void {
    const col = Math.floor(star.x / this.cellSize)
    const row = Math.floor(star.y / this.cellSize)
    const key = `${col},${row}`
    let cell = this.cells.get(key)
    if (!cell) {
      cell = []
      this.cells.set(key, cell)
    }
    cell.push(star)
  }

  query(x: number, y: number, radius: number): Star[] {
    const result: Star[] = []
    const minCol = Math.floor((x - radius) / this.cellSize)
    const maxCol = Math.floor((x + radius) / this.cellSize)
    const minRow = Math.floor((y - radius) / this.cellSize)
    const maxRow = Math.floor((y + radius) / this.cellSize)
    const radiusSq = radius * radius

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const key = `${col},${row}`
        const cell = this.cells.get(key)
        if (cell) {
          for (const star of cell) {
            const dx = star.x - x
            const dy = star.y - y
            if (dx * dx + dy * dy <= radiusSq) {
              result.push(star)
            }
          }
        }
      }
    }

    return result
  }
}

const MAX_CONNECTIONS_PER_STAR = 4
const BRIGHTNESS_THRESHOLD = 0.5

function toScreen(x: number, y: number, cameraRotation: number, cameraZoom: number): [number, number] {
  const cos = Math.cos(cameraRotation)
  const sin = Math.sin(cameraRotation)
  return [
    (x * cos - y * sin) * cameraZoom,
    (x * sin + y * cos) * cameraZoom
  ]
}

export function generateConstellationLines(
  stars: Star[],
  spatialHash: SpatialHash,
  maxDist: number,
  cameraRotation: number,
  cameraZoom: number
): ConstellationLine[] {
  const lines: ConstellationLine[] = []
  const connectionCounts = new Map<number, number>()
  const worldRadius = maxDist / cameraZoom

  for (const star of stars) {
    const neighbors = spatialHash.query(star.x, star.y, worldRadius)

    for (const neighbor of neighbors) {
      if (star.id >= neighbor.id) continue

      const starCount = connectionCounts.get(star.id) ?? 0
      const neighborCount = connectionCounts.get(neighbor.id) ?? 0
      if (starCount >= MAX_CONNECTIONS_PER_STAR || neighborCount >= MAX_CONNECTIONS_PER_STAR) continue

      const [sx1, sy1] = toScreen(star.x, star.y, cameraRotation, cameraZoom)
      const [sx2, sy2] = toScreen(neighbor.x, neighbor.y, cameraRotation, cameraZoom)
      const dx = sx1 - sx2
      const dy = sy1 - sy2
      const screenDist = Math.sqrt(dx * dx + dy * dy)

      if (screenDist >= maxDist) continue

      const combinedBrightness = star.brightness + neighbor.brightness
      if (combinedBrightness <= BRIGHTNESS_THRESHOLD) continue

      const opacity = Math.min((1 - screenDist / maxDist) * (combinedBrightness / 2), 1)

      lines.push({ starA: star, starB: neighbor, opacity })

      connectionCounts.set(star.id, starCount + 1)
      connectionCounts.set(neighbor.id, neighborCount + 1)
    }
  }

  return lines
}

function applyAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }

  if (color.startsWith('rgba')) {
    return color.replace(/[\d.]+\)$/, `${alpha})`)
  }

  if (color.startsWith('rgb')) {
    return color.replace('rgb', 'rgba').replace(')', `,${alpha})`)
  }

  return color
}

export function drawConstellationLines(
  ctx: CanvasRenderingContext2D,
  lines: ConstellationLine[],
  theme: { lineColor: string },
  cameraRotation: number,
  cameraZoom: number,
  centerX: number,
  centerY: number
): void {
  const cos = Math.cos(cameraRotation)
  const sin = Math.sin(cameraRotation)
  const time = performance.now() / 1000
  const breathe = 0.85 + 0.15 * Math.sin(time * 0.8)

  ctx.save()
  ctx.shadowColor = theme.lineColor

  for (const line of lines) {
    const x1 = (line.starA.x * cos - line.starA.y * sin) * cameraZoom + centerX
    const y1 = (line.starA.x * sin + line.starA.y * cos) * cameraZoom + centerY
    const x2 = (line.starB.x * cos - line.starB.y * sin) * cameraZoom + centerX
    const y2 = (line.starB.x * sin + line.starB.y * cos) * cameraZoom + centerY

    const alpha = line.opacity * breathe

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = applyAlpha(theme.lineColor, alpha)
    ctx.lineWidth = 0.5 + alpha * 1.5
    ctx.shadowBlur = 4 + alpha * 6
    ctx.stroke()
  }

  ctx.restore()
}
