export interface Point {
  x: number
  y: number
  time: number
}

export interface NeonTrail {
  id: number
  points: Point[]
  color: string
  width: number
  particles: Particle[]
  phase: number
  opacity: number
  fadingOut: boolean
  completed: boolean
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 200, b: 255 }
}

export function rgbString(r: number, g: number, b: number, a: number): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`
}

export function createParticle(x: number, y: number, color: string): Particle {
  const angle = Math.random() * Math.PI * 2
  const speed = Math.random() * 2 + 0.5
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 1,
    maxLife: 40 + Math.random() * 40,
    size: Math.random() * 3 + 1,
    color,
  }
}

export function updateParticle(p: Particle): boolean {
  p.x += p.vx
  p.y += p.vy
  p.vx *= 0.98
  p.vy *= 0.98
  p.life -= 1 / p.maxLife
  return p.life > 0
}

export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = ctx.createLinearGradient(0, 0, w, h)
  grad.addColorStop(0, '#050008')
  grad.addColorStop(0.5, '#0a0015')
  grad.addColorStop(1, '#12002a')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

function drawGlowPath(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  width: number,
  opacity: number,
  phase: number,
  isCompleted: boolean,
): void {
  if (points.length < 2) return

  const rgb = hexToRgb(color)

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (let layer = 0; layer < 3; layer++) {
    const glowMultiplier = [6, 3, 1][layer]
    const alphaMultiplier = [0.08, 0.25, 0.9][layer]
    ctx.beginPath()
    ctx.strokeStyle = rgbString(rgb.r, rgb.g, rgb.b, alphaMultiplier)
    ctx.lineWidth = width * glowMultiplier
    ctx.shadowColor = color
    ctx.shadowBlur = width * glowMultiplier * 2

    const step = Math.max(1, Math.floor(points.length / 200))
    ctx.moveTo(points[0].x, points[0].y)

    for (let i = step; i < points.length; i += step) {
      const p = points[i]
      const prev = points[Math.max(0, i - step)]

      if (isCompleted) {
        const waveOffset =
          Math.sin(phase + i * 0.02) * 2 +
          Math.sin(phase * 0.7 + i * 0.01) * 1.5
        const dx = p.x - prev.x
        const dy = p.y - prev.y
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const nx = -dy / len
        const ny = dx / len
        ctx.lineTo(p.x + nx * waveOffset, p.y + ny * waveOffset)
      } else {
        ctx.lineTo(p.x, p.y)
      }
    }

    const lastPt = points[points.length - 1]
    if (isCompleted) {
      const waveOffset =
        Math.sin(phase + points.length * 0.02) * 2 +
        Math.sin(phase * 0.7 + points.length * 0.01) * 1.5
      const dx = lastPt.x - points[Math.max(0, points.length - 2)].x
      const dy = lastPt.y - points[Math.max(0, points.length - 2)].y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const nx = -dy / len
      const ny = dx / len
      ctx.lineTo(lastPt.x + nx * waveOffset, lastPt.y + ny * waveOffset)
    } else {
      ctx.lineTo(lastPt.x, lastPt.y)
    }

    ctx.stroke()
  }

  ctx.restore()
}

function drawTrailTail(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  width: number,
  opacity: number,
): void {
  if (points.length < 2) return
  const rgb = hexToRgb(color)
  const tailLen = Math.min(points.length, 30)

  ctx.save()
  ctx.globalAlpha = opacity * 0.6
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (let i = points.length - tailLen; i < points.length - 1; i++) {
    if (i < 0) continue
    const t = (i - (points.length - tailLen)) / tailLen
    const alpha = t * 0.5
    ctx.beginPath()
    ctx.strokeStyle = rgbString(rgb.r, rgb.g, rgb.b, alpha)
    ctx.lineWidth = width * (0.3 + t * 0.7)
    ctx.shadowColor = color
    ctx.shadowBlur = width * 3 * t
    ctx.moveTo(points[i].x, points[i].y)
    ctx.lineTo(points[i + 1].x, points[i + 1].y)
    ctx.stroke()
  }

  ctx.restore()
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  ctx.save()
  for (const p of particles) {
    if (p.life <= 0) continue
    const rgb = hexToRgb(p.color)
    const alpha = p.life * 0.8
    ctx.beginPath()
    ctx.fillStyle = rgbString(rgb.r, rgb.g, rgb.b, alpha)
    ctx.shadowColor = p.color
    ctx.shadowBlur = p.size * 4
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function drawTrail(ctx: CanvasRenderingContext2D, trail: NeonTrail): void {
  if (trail.points.length < 2) return

  if (trail.completed) {
    drawGlowPath(
      ctx,
      trail.points,
      trail.color,
      trail.width,
      trail.opacity,
      trail.phase,
      true,
    )
  } else {
    drawGlowPath(ctx, trail.points, trail.color, trail.width, trail.opacity, 0, false)
    drawTrailTail(ctx, trail.points, trail.color, trail.width, trail.opacity)
  }

  drawParticles(ctx, trail.particles)
}

export function drawAllTrails(
  ctx: CanvasRenderingContext2D,
  trails: NeonTrail[],
  w: number,
  h: number,
): void {
  drawBackground(ctx, w, h)

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  for (const trail of trails) {
    drawTrail(ctx, trail)
  }

  ctx.restore()
}

export function exportCanvas(canvas: HTMLCanvasElement): void {
  const link = document.createElement('a')
  link.download = `neon-traces-${Date.now()}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

export function smoothPoints(points: Point[], iterations: number = 2): Point[] {
  if (points.length < 3) return points
  let smoothed = [...points]

  for (let iter = 0; iter < iterations; iter++) {
    const next: Point[] = [smoothed[0]]
    for (let i = 1; i < smoothed.length - 1; i++) {
      next.push({
        x: smoothed[i - 1].x * 0.25 + smoothed[i].x * 0.5 + smoothed[i + 1].x * 0.25,
        y: smoothed[i - 1].y * 0.25 + smoothed[i].y * 0.5 + smoothed[i + 1].y * 0.25,
        time: smoothed[i].time,
      })
    }
    next.push(smoothed[smoothed.length - 1])
    smoothed = next
  }

  return smoothed
}
