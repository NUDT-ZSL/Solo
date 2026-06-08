import type { AnimationStyle } from '@/store/useStore'

export interface Particle {
  char: string
  x: number
  y: number
  homeX: number
  homeY: number
  vx: number
  vy: number
  opacity: number
  rotation: number
  phase: number
  age: number
  index: number
  fontSize: number
  burstAngle: number
  burstSpeed: number
  transFromX: number
  transFromY: number
  transFromOpacity: number
  transFromRotation: number
}

const TRANSITION_MS = 800
const MAX_PARTICLES = 500

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export class ParticleEngine {
  particles: Particle[] = []
  style: AnimationStyle = 'fall'
  speed = 1
  particleSize = 1
  color = '#D4A574'
  width = 0
  height = 0
  time = 0
  dissolving = false
  dissolvingProgress = 0
  transitioning = false
  transitionStart = 0
  needsInit = false
  pendingText = ''
  private dpr = 1

  init(text: string, width: number, height: number, ctx: CanvasRenderingContext2D) {
    this.width = width
    this.height = height
    this.dpr = window.devicePixelRatio || 1
    this.particles = this.createParticles(text, ctx)
    this.time = 0
    this.dissolvingProgress = 0
    this.transitioning = false
  }

  resize(width: number, height: number, ctx: CanvasRenderingContext2D) {
    const text = this.particles.map((p) => p.char).join('')
    this.width = width
    this.height = height
    this.dpr = window.devicePixelRatio || 1
    this.particles = this.createParticles(text, ctx)
    this.time = 0
  }

  setStyle(newStyle: AnimationStyle) {
    if (newStyle === this.style) return
    for (const p of this.particles) {
      p.transFromX = p.x
      p.transFromY = p.y
      p.transFromOpacity = p.opacity
      p.transFromRotation = p.rotation
    }
    this.transitioning = true
    this.transitionStart = this.time
    this.style = newStyle

    if (newStyle === 'explode') {
      for (const p of this.particles) {
        p.burstAngle = Math.random() * Math.PI * 2
        p.burstSpeed = 200 + Math.random() * 400
      }
    }
  }

  update(dt: number) {
    this.time += dt

    if (this.dissolving) {
      this.dissolvingProgress = Math.min(1, this.dissolvingProgress + dt * 0.5)
    } else {
      this.dissolvingProgress = Math.max(0, this.dissolvingProgress - dt * 0.8)
    }

    const transProgress = this.transitioning
      ? easeInOut(Math.min(1, (this.time - this.transitionStart) / (TRANSITION_MS / 1000)))
      : 1

    if (this.transitioning && transProgress >= 1) {
      this.transitioning = false
    }

    for (const p of this.particles) {
      p.age += dt
      this.applyStyle(p, dt)

      if (this.transitioning) {
        p.x = lerp(p.transFromX, p.x, transProgress)
        p.y = lerp(p.transFromY, p.y, transProgress)
        p.opacity = lerp(p.transFromOpacity, p.opacity, transProgress)
        p.rotation = lerp(p.transFromRotation, p.rotation, transProgress)
      }

      if (this.dissolvingProgress > 0) {
        const fade = 1 - this.dissolvingProgress * (0.6 + 0.4 * Math.sin(p.phase + this.time))
        p.opacity *= Math.max(0, fade)
        p.x += Math.sin(p.phase + this.time * 2) * dt * 20 * this.dissolvingProgress
        p.y += Math.cos(p.phase + this.time * 1.5) * dt * 15 * this.dissolvingProgress
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, this.width, this.height)

    const fontSize = Math.max(14, Math.min(40, this.width / 25)) * this.particleSize
    const fontStr = (size: number) =>
      `${size}px "LXGW WenKai", "Noto Sans SC", sans-serif`

    for (const p of this.particles) {
      if (p.opacity <= 0.01) continue

      ctx.save()
      ctx.globalAlpha = p.opacity
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.font = fontStr(p.fontSize * this.particleSize)
      ctx.fillStyle = this.color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      ctx.shadowColor = this.color
      ctx.shadowBlur = 6 * this.particleSize * p.opacity
      ctx.fillText(p.char, 0, 0)
      ctx.shadowBlur = 0

      ctx.restore()
    }
  }

  private applyStyle(p: Particle, dt: number) {
    switch (this.style) {
      case 'fall':
        this.updateFall(p, dt)
        break
      case 'ripple':
        this.updateRipple(p, dt)
        break
      case 'explode':
        this.updateExplode(p, dt)
        break
      case 'spiral':
        this.updateSpiral(p, dt)
        break
    }
  }

  private updateFall(p: Particle, dt: number) {
    const fallSpeed = 40 * this.speed
    const amplitude = 25
    const frequency = 1.2

    p.y += fallSpeed * dt
    p.x = p.homeX + amplitude * Math.sin(this.time * frequency + p.phase)
    p.rotation = Math.sin(this.time * frequency + p.phase) * 0.15

    if (p.y > this.height + 60) {
      p.y = -60
    }

    if (p.y < 0) {
      p.opacity = Math.max(0, 1 + p.y / 60)
    } else if (p.y > this.height - 120) {
      p.opacity = Math.max(0, (this.height + 60 - p.y) / 180)
    } else {
      p.opacity = 0.85 + 0.15 * Math.sin(this.time + p.phase)
    }
  }

  private updateRipple(p: Particle, dt: number) {
    const cx = this.width / 2
    const cy = this.height / 2
    const dx = p.homeX - cx
    const dy = p.homeY - cy
    const baseAngle = Math.atan2(dy, dx)
    const baseDist = Math.sqrt(dx * dx + dy * dy)

    const waveSpeed = 2 * this.speed
    const waveAmp = 35
    const wave = waveAmp * Math.sin(this.time * waveSpeed - baseDist * 0.008 + p.phase)
    const dist = baseDist + wave
    const angleOffset = Math.sin(this.time * 0.3 * this.speed + p.phase) * 0.25

    p.x = cx + dist * Math.cos(baseAngle + angleOffset)
    p.y = cy + dist * Math.sin(baseAngle + angleOffset)
    p.rotation = angleOffset * 0.4
    p.opacity =
      0.5 + 0.5 * Math.cos(this.time * waveSpeed - baseDist * 0.008 + p.phase)
  }

  private updateExplode(p: Particle, dt: number) {
    const friction = 0.97

    p.vx *= friction
    p.vy *= friction
    p.x += p.vx * dt * this.speed
    p.y += p.vy * dt * this.speed
    p.rotation += (p.burstSpeed * 0.0003) * dt * this.speed

    const dx = p.homeX - p.x
    const dy = p.homeY - p.y
    const pullStrength = 0.0008 * this.speed
    p.vx += dx * pullStrength
    p.vy += dy * pullStrength

    const dist = Math.sqrt(dx * dx + dy * dy)
    const maxDist = Math.min(this.width, this.height) * 0.45
    p.opacity = Math.max(0.3, 1 - dist / maxDist)

    if (dist < 5 && Math.abs(p.vx) < 2 && Math.abs(p.vy) < 2) {
      if (Math.random() < dt * 0.3 * this.speed) {
        p.burstAngle = Math.random() * Math.PI * 2
        p.burstSpeed = 150 + Math.random() * 300
        p.vx = Math.cos(p.burstAngle) * p.burstSpeed
        p.vy = Math.sin(p.burstAngle) * p.burstSpeed
      }
    }
  }

  private updateSpiral(p: Particle, dt: number) {
    const cx = this.width / 2
    const cy = this.height / 2
    const dx = p.homeX - cx
    const dy = p.homeY - cy
    const baseDist = Math.sqrt(dx * dx + dy * dy)
    const baseAngle = Math.atan2(dy, dx)

    const rotSpeed = 0.8 * this.speed
    const angle = baseAngle + this.time * rotSpeed + p.phase * 0.5
    const radiusOsc = 25 * Math.sin(this.time * 0.4 + p.phase)
    const radius = baseDist + radiusOsc

    p.x = cx + radius * Math.cos(angle)
    p.y = cy + radius * Math.sin(angle)
    p.rotation = (angle - baseAngle) * 0.3
    p.opacity = 0.6 + 0.4 * Math.sin(this.time * 0.8 + p.phase)
  }

  private createParticles(text: string, ctx: CanvasRenderingContext2D): Particle[] {
    const chars = text.split('').filter((c) => c.trim().length > 0)
    if (chars.length === 0) return []

    let effectiveChars = chars
    if (chars.length > MAX_PARTICLES) {
      effectiveChars = []
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const s = Math.floor((i * chars.length) / MAX_PARTICLES)
        const e = Math.floor(((i + 1) * chars.length) / MAX_PARTICLES)
        effectiveChars.push(chars.slice(s, e).join(''))
      }
    }

    const fontSize = Math.max(16, Math.min(40, this.width / 25))
    ctx.font = `${fontSize}px "LXGW WenKai", "Noto Sans SC", sans-serif`

    const lineHeight = fontSize * 1.6
    const maxWidth = this.width * 0.8

    const lines: string[][] = []
    let curLine: string[] = []
    let curWidth = 0

    for (const char of effectiveChars) {
      const cw = ctx.measureText(char).width
      if (curWidth + cw > maxWidth && curLine.length > 0) {
        lines.push(curLine)
        curLine = [char]
        curWidth = cw
      } else {
        curLine.push(char)
        curWidth += cw
      }
    }
    if (curLine.length > 0) lines.push(curLine)

    const totalH = lines.length * lineHeight
    const startY = (this.height - totalH) / 2
    const particles: Particle[] = []
    let idx = 0

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li]
      const lineW = line.reduce((s, c) => s + ctx.measureText(c).width, 0)
      let x = (this.width - lineW) / 2
      const y = startY + li * lineHeight + lineHeight / 2

      for (const char of line) {
        const cw = ctx.measureText(char).width
        const homeX = x + cw / 2
        particles.push({
          char,
          x: homeX + (Math.random() - 0.5) * 200,
          y: y + (Math.random() - 0.5) * 200,
          homeX,
          homeY: y,
          vx: Math.random() * 100 - 50,
          vy: Math.random() * 100 - 50,
          opacity: 0,
          rotation: 0,
          phase: Math.random() * Math.PI * 2,
          age: 0,
          index: idx++,
          fontSize,
          burstAngle: Math.random() * Math.PI * 2,
          burstSpeed: 200 + Math.random() * 400,
          transFromX: homeX,
          transFromY: y,
          transFromOpacity: 1,
          transFromRotation: 0,
        })
        x += cw
      }
    }

    return particles
  }
}
