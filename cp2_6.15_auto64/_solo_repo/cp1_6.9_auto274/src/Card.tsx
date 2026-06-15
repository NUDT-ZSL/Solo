import { v4 as uuidv4 } from 'uuid'
import type { CardData, Particle } from './types'

const CARD_WIDTH_RATIO = 0.07
const CARD_HEIGHT_RATIO = 0.05

export function createCard(
  word: string,
  canvasWidth: number,
  canvasHeight: number,
  existingCards: CardData[]
): CardData {
  const baseRadius = Math.min(canvasWidth, canvasHeight) * 0.045
  let x: number, y: number
  let attempts = 0
  const maxAttempts = 100

  do {
    x = baseRadius + Math.random() * (canvasWidth - 2 * baseRadius)
    y = baseRadius + Math.random() * (canvasHeight - 2 * baseRadius - 150)
    attempts++
  } while (
    attempts < maxAttempts &&
    existingCards.some(c => {
      const dx = c.x - x
      const dy = c.y - y
      return Math.sqrt(dx * dx + dy * dy) < baseRadius * 3
    })
  )

  const angle = Math.random() * Math.PI * 2
  const speed = 0.2 + Math.random() * 0.4

  return {
    id: uuidv4(),
    word,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: baseRadius,
    isHovered: false,
    scale: 1,
    glowIntensity: 0.4
  }
}

export function updateCard(
  card: CardData,
  canvasWidth: number,
  canvasHeight: number
): void {
  const historyBarHeight = 140
  const effectiveHeight = canvasHeight - historyBarHeight

  card.x += card.vx
  card.y += card.vy

  const restitution = 0.95

  if (card.x - card.radius < 0) {
    card.x = card.radius
    card.vx = -card.vx * restitution
  } else if (card.x + card.radius > canvasWidth) {
    card.x = canvasWidth - card.radius
    card.vx = -card.vx * restitution
  }

  if (card.y - card.radius < 0) {
    card.y = card.radius
    card.vy = -card.vy * restitution
  } else if (card.y + card.radius > effectiveHeight) {
    card.y = effectiveHeight - card.radius
    card.vy = -card.vy * restitution
  }

  const targetScale = card.isHovered ? 1.1 : 1
  card.scale += (targetScale - card.scale) * 0.15

  const targetGlow = card.isHovered ? 1 : 0.4
  card.glowIntensity += (targetGlow - card.glowIntensity) * 0.1
}

export function resolveCollision(cardA: CardData, cardB: CardData): boolean {
  const dx = cardB.x - cardA.x
  const dy = cardB.y - cardA.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  const minDistance = cardA.radius + cardB.radius

  if (distance < minDistance && distance > 0) {
    const nx = dx / distance
    const ny = dy / distance

    const tx = -ny
    const ty = nx

    const dvx = cardB.vx - cardA.vx
    const dvy = cardB.vy - cardA.vy

    const vn = dvx * nx + dvy * ny

    if (vn < 0) {
      const restitution = 0.95
      const impulse = vn * restitution

      cardA.vx += impulse * nx * 0.5
      cardA.vy += impulse * ny * 0.5
      cardB.vx -= impulse * nx * 0.5
      cardB.vy -= impulse * ny * 0.5
    }

    const overlap = minDistance - distance
    const pushX = (overlap / 2 + 1) * nx
    const pushY = (overlap / 2 + 1) * ny
    cardA.x -= pushX
    cardA.y -= pushY
    cardB.x += pushX
    cardB.y += pushY

    const speedMag = Math.sqrt(
      (cardA.vx - cardB.vx) ** 2 + (cardA.vy - cardB.vy) ** 2
    )
    if (speedMag < 0.3) {
      const jitterAngle = Math.random() * Math.PI * 2
      const jitterSpeed = 0.3
      cardA.vx += Math.cos(jitterAngle) * jitterSpeed
      cardA.vy += Math.sin(jitterAngle) * jitterSpeed
      cardB.vx -= Math.cos(jitterAngle) * jitterSpeed
      cardB.vy -= Math.sin(jitterAngle) * jitterSpeed
    }

    return true
  }

  return false
}

export function getCollisionPoint(cardA: CardData, cardB: CardData): { x: number; y: number } {
  return {
    x: (cardA.x + cardB.x) / 2,
    y: (cardA.y + cardB.y) / 2
  }
}

export function drawCard(
  ctx: CanvasRenderingContext2D,
  card: CardData
): void {
  const w = card.radius * 2.4 * card.scale
  const h = card.radius * 1.8 * card.scale
  const x = card.x
  const y = card.y

  ctx.save()
  ctx.translate(x, y)

  const hue = 260
  const saturation = 80
  const lightness = 50 + card.glowIntensity * 20

  ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, ${card.glowIntensity * 0.8})`
  ctx.shadowBlur = 15 + card.glowIntensity * 20

  const radius = Math.min(w, h) * 0.2

  ctx.beginPath()
  ctx.moveTo(-w / 2 + radius, -h / 2)
  ctx.lineTo(w / 2 - radius, -h / 2)
  ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + radius)
  ctx.lineTo(w / 2, h / 2 - radius)
  ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - radius, h / 2)
  ctx.lineTo(-w / 2 + radius, h / 2)
  ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - radius)
  ctx.lineTo(-w / 2, -h / 2 + radius)
  ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + radius, -h / 2)
  ctx.closePath()

  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
  ctx.fill()

  ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.6 + card.glowIntensity * 0.4})`
  ctx.lineWidth = 1 + card.glowIntensity * 0.5
  ctx.stroke()

  ctx.shadowBlur = 0

  ctx.fillStyle = `rgba(255, 255, 255, ${0.85 + card.glowIntensity * 0.15})`
  ctx.font = `${Math.floor(h * 0.42)}px "Georgia", "Noto Serif SC", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(card.word, 0, 0)

  ctx.restore()
}

export function createGoldParticles(
  x: number,
  y: number,
  count: number
): Particle[] {
  const particles: Particle[] = []

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 4
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 5,
      opacity: 0.6 + Math.random() * 0.4,
      life: 0,
      maxLife: 60 + Math.random() * 30,
      color: `hsl(${40 + Math.random() * 20}, 100%, ${60 + Math.random() * 20}%)`
    })
  }

  return particles
}

export function updateParticles(particles: Particle[]): Particle[] {
  return particles
    .map(p => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.02
      p.vx *= 0.99
      p.life += 1
      p.opacity = Math.max(0, p.opacity - 0.012)
      return p
    })
    .filter(p => p.life < p.maxLife && p.opacity > 0)
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[]
): void {
  for (const p of particles) {
    ctx.save()
    ctx.globalAlpha = p.opacity
    ctx.fillStyle = p.color
    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)'
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

export function drawPoemDisplay(
  ctx: CanvasRenderingContext2D,
  poem: string,
  x: number,
  y: number,
  scale: number,
  opacity: number,
  elapsed: number
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.globalAlpha = opacity

  const padding = 30
  const fontSize = 22
  ctx.font = `${fontSize}px "Georgia", "Noto Serif SC", serif`
  const textMetrics = ctx.measureText(poem)
  const textWidth = textMetrics.width
  const boxWidth = textWidth + padding * 2
  const boxHeight = fontSize * 2.5

  ctx.shadowColor = 'rgba(255, 215, 0, 0.6)'
  ctx.shadowBlur = 25

  const grd = ctx.createLinearGradient(-boxWidth / 2, -boxHeight / 2, boxWidth / 2, boxHeight / 2)
  grd.addColorStop(0, 'rgba(20, 10, 50, 0.92)')
  grd.addColorStop(1, 'rgba(50, 20, 80, 0.92)')

  roundRect(ctx, -boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 12)
  ctx.fillStyle = grd
  ctx.fill()

  ctx.strokeStyle = `hsla(45, 100%, 70%, ${opacity})`
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.shadowBlur = 0

  ctx.fillStyle = `rgba(255, 235, 180, ${opacity})`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(poem, 0, 0)

  if (elapsed < 0.3) {
    const sparkleCount = 5
    for (let i = 0; i < sparkleCount; i++) {
      const sx = (Math.random() - 0.5) * boxWidth * 0.8
      const sy = (Math.random() - 0.5) * boxHeight * 0.8
      const ss = 2 + Math.random() * 3
      ctx.fillStyle = `hsla(50, 100%, 80%, ${(0.3 - elapsed) * 3})`
      ctx.beginPath()
      ctx.arc(sx, sy, ss, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

export function isPointInCard(
  card: CardData,
  px: number,
  py: number
): boolean {
  const w = card.radius * 2.4 * card.scale
  const h = card.radius * 1.8 * card.scale
  return (
    px >= card.x - w / 2 &&
    px <= card.x + w / 2 &&
    py >= card.y - h / 2 &&
    py <= card.y + h / 2
  )
}

export function getPoemBoxBounds(
  x: number,
  y: number,
  poem: string,
  scale: number
): { left: number; right: number; top: number; bottom: number; width: number; height: number } {
  const fontSize = 22
  const padding = 30
  const avgCharWidth = fontSize * 1.1
  const textWidth = poem.length * avgCharWidth
  const boxWidth = (textWidth + padding * 2) * scale
  const boxHeight = fontSize * 2.5 * scale

  return {
    left: x - boxWidth / 2,
    right: x + boxWidth / 2,
    top: y - boxHeight / 2,
    bottom: y + boxHeight / 2,
    width: boxWidth,
    height: boxHeight
  }
}
