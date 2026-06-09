export interface LightPoint {
  x: number
  y: number
  baseY: number
  radius: number
  opacity: number
  period: number
  phase: number
}

export interface ArtState {
  points: LightPoint[]
  pulseIntensity: number
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 179, b: 71 }
}

export const generateLightPoints = (
  width: number,
  height: number,
  color: string
): LightPoint[] => {
  const count = 20 + Math.floor(Math.random() * 11)
  const points: LightPoint[] = []
  void color

  for (let i = 0; i < count; i++) {
    const radius = 2 + Math.random() * 3
    points.push({
      x: Math.random() * width,
      y: Math.random() * height,
      baseY: Math.random() * height,
      radius,
      opacity: 0.4 + Math.random() * 0.5,
      period: 3 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2
    })
  }
  return points
}

export const drawArt = (
  ctx: CanvasRenderingContext2D,
  color: string,
  width: number,
  height: number,
  state: ArtState,
  time: number,
  isPlaying: boolean = false
): void => {
  const { r, g, b } = hexToRgb(color)
  const speedMultiplier = isPlaying ? 2 : 1

  ctx.clearRect(0, 0, width, height)

  const bgGradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    Math.max(width, height) / 1.5
  )
  bgGradient.addColorStop(0, `rgba(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)}, 0.15)`)
  bgGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.02)`)
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, width, height)

  const ringCount = 3
  for (let i = 0; i < ringCount; i++) {
    const radius = 30 + (170 / (ringCount - 1 || 1)) * i
    const alpha = 0.8 - (0.7 / (ringCount - 1 || 1)) * i
    const ringGradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.max(0, radius - 20),
      width / 2,
      height / 2,
      radius
    )
    ringGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`)
    ringGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`)
    ringGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
    ctx.beginPath()
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2)
    ctx.fillStyle = ringGradient
    ctx.fill()
  }

  for (const point of state.points) {
    const t = (time * speedMultiplier) / 1000
    const floatY = point.baseY + Math.sin(t * ((Math.PI * 2) / point.period) + point.phase) * 8
    point.y = floatY

    let pointOpacity = point.opacity
    let pointRadius = point.radius

    if (isPlaying) {
      const pulsePhase = (t * 4) % 1
      const pulse = Math.sin(pulsePhase * Math.PI * 2) * 0.5 + 0.5
      pointOpacity = Math.min(1, pointOpacity + pulse * 0.4)
      pointRadius = point.radius + pulse * 2

      const glowGradient = ctx.createRadialGradient(
        point.x,
        point.y,
        0,
        point.x,
        point.y,
        pointRadius * 6
      )
      glowGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.3 * pulse})`)
      glowGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
      ctx.beginPath()
      ctx.arc(point.x, point.y, pointRadius * 6, 0, Math.PI * 2)
      ctx.fillStyle = glowGradient
      ctx.fill()
    }

    ctx.beginPath()
    ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, ${Math.min(255, b + 50)}, ${pointOpacity})`
    ctx.fill()
  }
}

export const createArtState = (width: number, height: number, color: string): ArtState => {
  return {
    points: generateLightPoints(width, height, color),
    pulseIntensity: 0
  }
}
