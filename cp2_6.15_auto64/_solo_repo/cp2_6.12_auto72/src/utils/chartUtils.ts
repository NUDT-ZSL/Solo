import type { StyleMetrics, TrendDataPoint, ColorSwatch } from '@/types'

export interface RadarChartOptions {
  size?: number
  padding?: number
  animationDuration?: number
}

export interface LineChartOptions {
  width?: number
  height?: number
  padding?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
  animationDuration?: number
}

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null
}

export const isWarmColor = (hex: string): boolean => {
  const rgb = hexToRgb(hex)
  if (!rgb) return false
  return rgb.r > rgb.b
}

export const calculateStyleMetrics = (colors: ColorSwatch[]): StyleMetrics => {
  let warmPercentage = 0
  let coolPercentage = 0
  let totalSaturation = 0
  let totalBrightness = 0
  let minBrightness = 255
  let maxBrightness = 0
  let totalWeight = 0

  colors.forEach((color) => {
    const rgb = hexToRgb(color.hex)
    if (!rgb) return

    const weight = color.percentage
    totalWeight += weight

    if (isWarmColor(color.hex)) {
      warmPercentage += weight
    } else {
      coolPercentage += weight
    }

    const max = Math.max(rgb.r, rgb.g, rgb.b)
    const min = Math.min(rgb.r, rgb.g, rgb.b)
    const brightness = ((max + min) / 2 / 255) * 100
    totalBrightness += brightness * weight

    if (brightness < minBrightness) minBrightness = brightness
    if (brightness > maxBrightness) maxBrightness = brightness

    const l = (max + min) / 2 / 255
    const sat =
      max === min
        ? 0
        : l > 0.5
        ? ((max - min) / (510 - max - min)) * 100
        : ((max - min) / (max + min)) * 100
    totalSaturation += sat * weight
  })

  if (totalWeight === 0) {
    return { warmRatio: 50, coolRatio: 50, saturation: 0, brightness: 50, contrast: 0 }
  }

  return {
    warmRatio: Math.round((warmPercentage / totalWeight) * 100),
    coolRatio: Math.round((coolPercentage / totalWeight) * 100),
    saturation: Math.round(totalSaturation / totalWeight),
    brightness: Math.round(totalBrightness / totalWeight),
    contrast: Math.round(maxBrightness - minBrightness)
  }
}

export const drawRadarChart = (
  ctx: CanvasRenderingContext2D,
  metrics: StyleMetrics,
  options: RadarChartOptions = {},
  progress: number = 1
): void => {
  const { size = 300, padding = 40 } = options
  const centerX = size / 2
  const centerY = size / 2
  const radius = (size - padding * 2) / 2

  const labels = ['暖色比例', '冷色比例', '饱和度', '明度', '对比度']
  const values = [
    metrics.warmRatio,
    metrics.coolRatio,
    metrics.saturation,
    metrics.brightness,
    metrics.contrast
  ]
  const angles = labels.map((_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / labels.length)

  ctx.clearRect(0, 0, size, size)

  for (let level = 5; level >= 1; level--) {
    const levelRadius = (radius * level) / 5
    ctx.beginPath()
    for (let i = 0; i < labels.length; i++) {
      const angle = angles[i]
      const x = centerX + levelRadius * Math.cos(angle)
      const y = centerY + levelRadius * Math.sin(angle)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.closePath()
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  for (let i = 0; i < labels.length; i++) {
    const angle = angles[i]
    const x = centerX + radius * Math.cos(angle)
    const y = centerY + radius * Math.sin(angle)
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.lineTo(x, y)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  if (progress > 0) {
    const totalAxes = labels.length
    const axesProgress = progress * (totalAxes + 1)

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
    gradient.addColorStop(0, 'rgba(103, 58, 183, 0.6)')
    gradient.addColorStop(1, 'rgba(103, 58, 183, 0.1)')

    ctx.beginPath()
    for (let i = 0; i < labels.length; i++) {
      const angle = angles[i]
      const axisActivation = Math.max(0, Math.min(1, axesProgress - i - 1))
      const value = (values[i] / 100) * radius * axisActivation
      const x = centerX + value * Math.cos(angle)
      const y = centerY + value * Math.sin(angle)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.beginPath()
    for (let i = 0; i < labels.length; i++) {
      const angle = angles[i]
      const axisActivation = Math.max(0, Math.min(1, axesProgress - i - 1))
      const value = (values[i] / 100) * radius * axisActivation
      const x = centerX + value * Math.cos(angle)
      const y = centerY + value * Math.sin(angle)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.closePath()
    ctx.strokeStyle = 'rgba(103, 58, 183, 0.9)'
    ctx.lineWidth = 2.5
    ctx.stroke()

    for (let i = 0; i < labels.length; i++) {
      const axisActivation = Math.max(0, Math.min(1, axesProgress - i - 1))
      if (axisActivation > 0.8) {
        const angle = angles[i]
        const value = (values[i] / 100) * radius
        const x = centerX + value * Math.cos(angle)
        const y = centerY + value * Math.sin(angle)
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.strokeStyle = '#673AB7'
        ctx.lineWidth = 2.5
        ctx.stroke()
      }
    }
  }

  for (let i = 0; i < labels.length; i++) {
    const angle = angles[i]
    const x = centerX + (radius + 24) * Math.cos(angle)
    const y = centerY + (radius + 24) * Math.sin(angle)
    ctx.fillStyle = '#333'
    ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(labels[i], x, y)
  }
}

export const drawLineChart = (
  ctx: CanvasRenderingContext2D,
  data: TrendDataPoint[],
  options: LineChartOptions = {},
  progress: number = 1,
  hoverIndex: number | null = null
): { pointPositions: { x: number; y: number; data: TrendDataPoint }[] } => {
  const width = options.width ?? 600
  const height = options.height ?? 300
  const padding = {
    top: options.padding?.top ?? 40,
    right: options.padding?.right ?? 40,
    bottom: options.padding?.bottom ?? 50,
    left: options.padding?.left ?? 60
  }

  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  ctx.clearRect(0, 0, width, height)

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartHeight * i) / 4
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(width - padding.right, y)
    ctx.stroke()

    const value = Math.round(100 - (i * 100) / 4)
    ctx.fillStyle = '#888'
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(value.toString(), padding.left - 12, y)
  }

  const pointPositions: { x: number; y: number; data: TrendDataPoint }[] = []

  if (data.length === 0) return { pointPositions: [] }

  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : 0

  data.forEach((d, i) => {
    const x = padding.left + i * xStep
    const y = padding.top + chartHeight - (d.value / 100) * chartHeight
    pointPositions.push({ x, y, data: d })

    ctx.fillStyle = '#666'
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(d.label, x, height - padding.bottom + 14)
  })

  if (progress > 0 && data.length > 1) {
    const totalLength = data.length - 1
    const currentLength = totalLength * progress
    const fullSegments = Math.floor(currentLength)
    const segmentProgress = currentLength - fullSegments

    ctx.beginPath()
    ctx.moveTo(pointPositions[0].x, pointPositions[0].y)

    for (let i = 1; i <= fullSegments && i < pointPositions.length; i++) {
      const prev = pointPositions[i - 1]
      const curr = pointPositions[i]
      const cpx1 = prev.x + (curr.x - prev.x) * 0.4
      const cpx2 = prev.x + (curr.x - prev.x) * 0.6
      ctx.bezierCurveTo(cpx1, prev.y, cpx2, curr.y, curr.x, curr.y)
    }

    if (fullSegments < totalLength && fullSegments + 1 < pointPositions.length) {
      const prev = pointPositions[fullSegments]
      const next = pointPositions[fullSegments + 1]
      const targetX = prev.x + (next.x - prev.x) * segmentProgress
      const targetY = prev.y + (next.y - prev.y) * segmentProgress
      const cpx1 = prev.x + (targetX - prev.x) * 0.4
      const cpx2 = prev.x + (targetX - prev.x) * 0.6
      ctx.bezierCurveTo(cpx1, prev.y, cpx2, targetY, targetX, targetY)
    }

    const gradient = ctx.createLinearGradient(padding.left, 0, width - padding.right, 0)
    gradient.addColorStop(0, '#4A90D9')
    gradient.addColorStop(1, '#9B59B6')
    ctx.strokeStyle = gradient
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    for (let i = 0; i < pointPositions.length; i++) {
      const point = pointPositions[i]
      const isActive = i < fullSegments || (i === fullSegments && segmentProgress >= 0.9)
      const isHovered = hoverIndex === i

      if (isActive) {
        if (isHovered) {
          ctx.beginPath()
          ctx.arc(point.x, point.y, 10, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(103, 58, 183, 0.15)'
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(point.x, point.y, isHovered ? 7 : 5, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.strokeStyle = '#673AB7'
        ctx.lineWidth = 2.5
        ctx.stroke()
      }
    }
  }

  return { pointPositions }
}
