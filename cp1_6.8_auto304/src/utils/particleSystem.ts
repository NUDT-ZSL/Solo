export interface Particle {
  x: number
  y: number
  originX: number
  originY: number
  vx: number
  vy: number
  size: number
  hue: number
  alpha: number
  brightness: number
  noiseOffsetX: number
  noiseOffsetY: number
}

export interface PulseState {
  active: boolean
  cx: number
  cy: number
  radius: number
  maxRadius: number
  speed: number
}

export interface ParticleSystemConfig {
  dissipationIntensity: number
  reassemblySpeed: number
  animationSpeed: number
}

const CONNECTION_DIST = 18
const CONNECTION_ALPHA = 0.12
const FLOW_AMPLITUDE = 0.4
const NOISE_SPEED = 0.003
const SPRING_STIFFNESS = 0.02
const DAMPING = 0.92
const MAX_PARTICLES = 6000

function pseudoNoise(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return n - Math.floor(n)
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const n00 = pseudoNoise(ix, iy)
  const n10 = pseudoNoise(ix + 1, iy)
  const n01 = pseudoNoise(ix, iy + 1)
  const n11 = pseudoNoise(ix + 1, iy + 1)
  const nx0 = n00 + (n10 - n00) * sx
  const nx1 = n01 + (n11 - n01) * sx
  return nx0 + (nx1 - nx0) * sy
}

export function createParticlesFromText(
  text: string,
  canvasWidth: number,
  canvasHeight: number,
  devicePixelRatio: number
): Particle[] {
  if (!text.trim()) return []

  const offscreen = document.createElement('canvas')
  offscreen.width = canvasWidth
  offscreen.height = canvasHeight
  const ctx = offscreen.getContext('2d')!
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  const maxFontSize = Math.min(canvasWidth / (text.length * 0.8), canvasHeight * 0.35, 200)
  const fontSize = Math.max(maxFontSize, 24)

  ctx.fillStyle = '#fff'
  ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const metrics = ctx.measureText(text)
  const textWidth = metrics.width
  const scale = Math.min((canvasWidth * 0.85) / textWidth, 1)
  const actualFontSize = fontSize * scale

  ctx.font = `bold ${actualFontSize}px "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif`
  ctx.fillText(text, canvasWidth / 2, canvasHeight / 2)

  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight)
  const data = imageData.data

  const gap = Math.max(2, Math.floor(3 / devicePixelRatio))

  const candidates: { x: number; y: number }[] = []
  for (let y = 0; y < canvasHeight; y += gap) {
    for (let x = 0; x < canvasWidth; x += gap) {
      const idx = (y * canvasWidth + x) * 4
      if (data[idx + 3] > 128) {
        candidates.push({ x, y })
      }
    }
  }

  let particles: Particle[]
  if (candidates.length > MAX_PARTICLES) {
    const step = candidates.length / MAX_PARTICLES
    const sampled: typeof candidates = []
    for (let i = 0; i < candidates.length; i += step) {
      sampled.push(candidates[Math.floor(i)])
    }
    particles = sampled.map((p, i) => makeParticle(p.x, p.y, i))
  } else {
    particles = candidates.map((p, i) => makeParticle(p.x, p.y, i))
  }

  return particles
}

function makeParticle(x: number, y: number, index: number): Particle {
  const t = pseudoNoise(x * 0.01, y * 0.01)
  const hue = 40 + t * 20
  return {
    x,
    y,
    originX: x,
    originY: y,
    vx: 0,
    vy: 0,
    size: 1.2 + pseudoNoise(x, y) * 0.8,
    hue,
    alpha: 0.7 + pseudoNoise(x * 0.5, y * 0.5) * 0.3,
    brightness: 0,
    noiseOffsetX: index * 0.37,
    noiseOffsetY: index * 0.73,
  }
}

export function updateParticles(
  particles: Particle[],
  config: ParticleSystemConfig,
  pulse: PulseState,
  deltaTime: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  const dt = Math.min(deltaTime, 32)
  const dtFactor = dt / 16.67
  const { dissipationIntensity, reassemblySpeed, animationSpeed } = config
  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2

  const reassembleForce = reassemblySpeed * 0.03
  const dissipateForce = dissipationIntensity * 0.15
  const flowSpeed = animationSpeed * 0.5

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]

    p.noiseOffsetX += NOISE_SPEED * dtFactor * animationSpeed
    p.noiseOffsetY += NOISE_SPEED * dtFactor * animationSpeed * 1.3

    const noiseX = (smoothNoise(p.noiseOffsetX, p.noiseOffsetY) - 0.5) * 2 * FLOW_AMPLITUDE * flowSpeed
    const noiseY = (smoothNoise(p.noiseOffsetY, p.noiseOffsetX + 100) - 0.5) * 2 * FLOW_AMPLITUDE * flowSpeed

    const dx = p.originX - p.x
    const dy = p.originY - p.y
    const distToOrigin = Math.sqrt(dx * dx + dy * dy)
    const distToCenter = Math.sqrt(
      (p.x - centerX) * (p.x - centerX) + (p.y - centerY) * (p.y - centerY)
    )

    let fx = 0
    let fy = 0

    fx += dx * reassembleForce
    fy += dy * reassembleForce

    if (dissipateForce > 0) {
      const angle = Math.atan2(p.y - centerY, p.x - centerX)
      const spread = pseudoNoise(p.originX * 0.02, p.originY * 0.02) * Math.PI * 2
      fx += Math.cos(angle + spread * 0.3) * dissipateForce
      fy += Math.sin(angle + spread * 0.3) * dissipateForce
      fx += (pseudoNoise(p.x * 0.1, p.y * 0.1) - 0.5) * dissipateForce * 0.5
      fy += (pseudoNoise(p.y * 0.1, p.x * 0.1) - 0.5) * dissipateForce * 0.5
    }

    fx += noiseX
    fy += noiseY

    p.vx += fx * dtFactor
    p.vy += fy * dtFactor
    p.vx *= DAMPING
    p.vy *= DAMPING
    p.x += p.vx * dtFactor
    p.y += p.vy * dtFactor

    if (dissipateForce > 0) {
      const maxDist = dissipateForce * 200
      const fadeStart = maxDist * 0.6
      if (distToOrigin > fadeStart) {
        const fadeRatio = Math.min((distToOrigin - fadeStart) / (maxDist - fadeStart + 1), 1)
        p.alpha = Math.max(0.05, (0.7 + pseudoNoise(p.originX * 0.5, p.originY * 0.5) * 0.3) * (1 - fadeRatio * 0.8))
      }
    } else {
      p.alpha += ((0.7 + pseudoNoise(p.originX * 0.5, p.originY * 0.5) * 0.3) - p.alpha) * 0.05
    }

    if (pulse.active) {
      const distToPulse = Math.sqrt(
        (p.x - pulse.cx) * (p.x - pulse.cx) + (p.y - pulse.cy) * (p.y - pulse.cy)
      )
      const pulseWidth = 80
      const diff = Math.abs(distToPulse - pulse.radius)
      if (diff < pulseWidth) {
        const intensity = 1 - diff / pulseWidth
        p.brightness = Math.max(p.brightness, intensity * 0.9)
      }
    }

    p.brightness *= 0.95

    if (p.x < -50 || p.x > canvasWidth + 50 || p.y < -50 || p.y > canvasHeight + 50) {
      p.x = p.originX + (Math.random() - 0.5) * 4
      p.y = p.originY + (Math.random() - 0.5) * 4
      p.vx = 0
      p.vy = 0
    }
  }

  if (pulse.active) {
    pulse.radius += pulse.speed * dtFactor
    if (pulse.radius > pulse.maxRadius) {
      pulse.active = false
    }
  }
}

export function triggerPulse(
  canvasWidth: number,
  canvasHeight: number
): PulseState {
  return {
    active: true,
    cx: canvasWidth / 2,
    cy: canvasHeight / 2,
    radius: 0,
    maxRadius: Math.max(canvasWidth, canvasHeight),
    speed: 12,
  }
}

export function resetParticles(particles: Particle[]): void {
  for (const p of particles) {
    p.x = p.originX
    p.y = p.originY
    p.vx = 0
    p.vy = 0
    p.alpha = 0.7 + pseudoNoise(p.originX * 0.5, p.originY * 0.5) * 0.3
    p.brightness = 0
  }
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  canvasWidth: number,
  canvasHeight: number,
  devicePixelRatio: number
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  ctx.save()

  if (particles.length < 2000) {
    drawConnections(ctx, particles)
  }

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]
    const b = p.brightness
    const saturation = 70 + b * 30
    const lightness = 65 + b * 35
    const alpha = p.alpha * (1 - b * 0.2) + b * 0.3

    ctx.fillStyle = `hsla(${p.hue}, ${saturation}%, ${lightness}%, ${alpha})`
    ctx.beginPath()
    const drawSize = p.size * (1 + b * 0.8)
    ctx.arc(p.x, p.y, drawSize, 0, Math.PI * 2)
    ctx.fill()

    if (b > 0.3) {
      ctx.fillStyle = `hsla(${p.hue}, 100%, 90%, ${b * 0.4})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, drawSize * 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

function drawConnections(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  const len = particles.length
  const distSq = CONNECTION_DIST * CONNECTION_DIST

  ctx.lineWidth = 0.5

  for (let i = 0; i < len; i++) {
    const a = particles[i]
    let connectionCount = 0
    for (let j = i + 1; j < len; j++) {
      if (connectionCount >= 3) break
      const b = particles[j]
      const dx = a.x - b.x
      const dy = a.y - b.y
      const d2 = dx * dx + dy * dy
      if (d2 < distSq) {
        const dist = Math.sqrt(d2)
        const alpha = CONNECTION_ALPHA * (1 - dist / CONNECTION_DIST)
        const avgHue = (a.hue + b.hue) / 2
        ctx.strokeStyle = `hsla(${avgHue}, 60%, 60%, ${alpha})`
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
        connectionCount++
      }
    }
  }
}
