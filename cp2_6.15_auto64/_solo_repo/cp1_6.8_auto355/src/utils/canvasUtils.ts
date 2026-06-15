export interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export interface StrokeData {
  id: string;
  regionId: string;
  points: Point[];
  color: string;
  size: number;
  glow: boolean;
  userId: string;
  timestamp: number;
}

export interface RegionData {
  id: string;
  seed: number;
  likeCount: number;
  brightness: number;
  createdAt: number;
}

export type WSMessage =
  | { type: 'stroke'; payload: StrokeData }
  | { type: 'discover'; payload: { regionId: string } }
  | { type: 'like'; payload: { regionId: string } }
  | { type: 'online_count'; payload: { count: number } }
  | { type: 'activity'; payload: { text: string; timestamp: number } }
  | { type: 'region_update'; payload: { regionId: string; likeCount: number; brightness: number } }
  | { type: 'strokes_sync'; payload: { regionId: string; strokes: StrokeData[] } }
  | { type: 'init'; payload: { regionId: string; seed: number; strokes: StrokeData[]; likeCount: number; brightness: number } }

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const ISLAND_COLORS = [
  '#FF9AA2', '#FFB7B2', '#FFDAC1', '#E2F0CB',
  '#B5EAD7', '#C7CEEA', '#F0E6EF', '#D4A5A5',
  '#9ED2C6', '#FFC8A2', '#A8D8EA', '#AA96DA',
  '#FCBAD3', '#FFFFD2', '#C1E1C5', '#AEDEFC',
]

const COLOR_NAMES: Record<string, string> = {
  '#FF9AA2': '珊瑚红',
  '#FFB7B2': '蜜桃粉',
  '#FFDAC1': '杏黄',
  '#E2F0CB': '嫩绿',
  '#B5EAD7': '薄荷',
  '#C7CEEA': '薰衣草',
  '#FF6B6B': '烈焰红',
  '#4ECDC4': '碧海蓝',
  '#45B7D1': '天空蓝',
  '#96CEB4': '翡翠绿',
  '#FFEAA7': '阳光金',
  '#DDA0DD': '梅子紫',
  '#FF7F50': '珊瑚橙',
  '#87CEEB': '晴空蓝',
  '#FF69B4': '粉玫瑰',
  '#32CD32': '草绿',
}

export function getStrokeDescription(color: string): string {
  return COLOR_NAMES[color.toUpperCase()] || '彩色'
}

export function generateIslandBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  seed: number,
  brightness: number
): void {
  const rand = seededRandom(seed)

  ctx.fillStyle = '#FAF0E6'
  ctx.fillRect(0, 0, width, height)

  const gridSize = 40
  ctx.strokeStyle = 'rgba(210, 190, 160, 0.3)'
  ctx.lineWidth = 0.5
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  const numBlobs = 12 + Math.floor(rand() * 10)
  for (let i = 0; i < numBlobs; i++) {
    const x = rand() * width
    const y = rand() * height
    const radiusX = 60 + rand() * 180
    const radiusY = 40 + rand() * 120
    const color = ISLAND_COLORS[Math.floor(rand() * ISLAND_COLORS.length)]
    const alpha = 0.12 + rand() * 0.18

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rand() * Math.PI * 2)
    ctx.scale(1, radiusY / radiusX)

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radiusX)
    gradient.addColorStop(0, hexToRgba(color, alpha * 1.5))
    gradient.addColorStop(0.6, hexToRgba(color, alpha))
    gradient.addColorStop(1, hexToRgba(color, 0))

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(0, 0, radiusX, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  const numCurves = 5 + Math.floor(rand() * 6)
  for (let i = 0; i < numCurves; i++) {
    const startX = rand() * width
    const startY = rand() * height
    const cp1x = rand() * width
    const cp1y = rand() * height
    const cp2x = rand() * width
    const cp2y = rand() * height
    const endX = rand() * width
    const endY = rand() * height
    const color = ISLAND_COLORS[Math.floor(rand() * ISLAND_COLORS.length)]
    const alpha = 0.15 + rand() * 0.25
    const lineWidth = 2 + rand() * 8

    ctx.strokeStyle = hexToRgba(color, alpha)
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY)
    ctx.stroke()
  }

  if (brightness > 1) {
    const glowAlpha = Math.min((brightness - 1) * 0.03, 0.3)
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) * 0.6
    )
    gradient.addColorStop(0, `rgba(255, 223, 186, ${glowAlpha})`)
    gradient.addColorStop(0.5, `rgba(255, 200, 150, ${glowAlpha * 0.5})`)
    gradient.addColorStop(1, `rgba(255, 180, 130, 0)`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }
}

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: StrokeData,
  glowPhase: number = 0
): void {
  if (stroke.points.length < 2) return

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (stroke.glow) {
    const pulseAlpha = 0.4 + 0.3 * Math.sin(glowPhase + stroke.timestamp * 0.001)
    const pulseSize = stroke.size * (1.5 + 0.5 * Math.sin(glowPhase + stroke.timestamp * 0.002))

    ctx.shadowColor = stroke.color
    ctx.shadowBlur = pulseSize * 2
    ctx.globalAlpha = pulseAlpha

    drawSmoothLine(ctx, stroke.points, pulseSize, stroke.color)

    ctx.shadowBlur = pulseSize * 4
    ctx.globalAlpha = pulseAlpha * 0.3
    drawSmoothLine(ctx, stroke.points, pulseSize * 1.5, stroke.color)
  }

  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
  drawSmoothLine(ctx, stroke.points, stroke.size, stroke.color)

  ctx.restore()
}

function drawSmoothLine(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  size: number,
  color: string
): void {
  ctx.strokeStyle = color
  ctx.lineWidth = size
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y)
  } else {
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2
      const midY = (points[i].y + points[i + 1].y) / 2
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY)
    }
    const last = points[points.length - 1]
    const secondLast = points[points.length - 2]
    ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y)
  }

  ctx.stroke()
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function blendColors(base: string, overlay: string, alpha: number): string {
  const b = hexToRgb(base)
  const o = hexToRgb(overlay)
  if (!b || !o) return base
  const r = Math.round(b.r * (1 - alpha) + o.r * alpha)
  const g = Math.round(b.g * (1 - alpha) + o.g * alpha)
  const bl = Math.round(b.b * (1 - alpha) + o.b * alpha)
  return `rgb(${r}, ${g}, ${bl})`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!match) return null
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  }
}

export function serializeStroke(stroke: StrokeData): string {
  return JSON.stringify(stroke)
}

export function deserializeStroke(data: string): StrokeData {
  return JSON.parse(data)
}

export function generateRegionId(): string {
  return `region_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

export function generateUserId(): string {
  return `user_${Math.random().toString(36).substring(2, 10)}`
}

export function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647)
}

export function saveCanvasAsPNG(canvas: HTMLCanvasElement, filename: string = 'dream-island.png'): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}
