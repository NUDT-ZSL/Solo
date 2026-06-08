export type ThemeName = 'forest' | 'ocean' | 'dusk' | 'aurora'

export interface ThemeColors {
  primary: string
  secondary: string
  bgTop: string
  bgBottom: string
  glowColor: string
}

export const THEMES: Record<ThemeName, ThemeColors> = {
  forest: {
    primary: '#7dffb3',
    secondary: '#7dc8ff',
    bgTop: '#0a1a0f',
    bgBottom: '#050d08',
    glowColor: '#4dff94',
  },
  ocean: {
    primary: '#7dc8ff',
    secondary: '#b37dff',
    bgTop: '#0a0f1a',
    bgBottom: '#050810',
    glowColor: '#4da6ff',
  },
  dusk: {
    primary: '#ffb37d',
    secondary: '#ff7d9a',
    bgTop: '#1a0f0a',
    bgBottom: '#0d0805',
    glowColor: '#ff944d',
  },
  aurora: {
    primary: '#b37dff',
    secondary: '#7dffc8',
    bgTop: '#0f0a1a',
    bgBottom: '#08051a',
    glowColor: '#994dff',
  },
}

interface Particle {
  x: number
  y: number
  baseX: number
  baseY: number
  size: number
  brightness: number
  baseBrightness: number
  colorR: number
  colorG: number
  colorB: number
  vx: number
  vy: number
  phase: number
  phaseSpeed: number
  offsetX: number
  offsetY: number
}

export interface ForestConfig {
  particleCount: number
  theme: ThemeName
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function lerpColor(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): [number, number, number] {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ]
}

export class ForestSystem {
  particles: Particle[] = []
  private width = 0
  private height = 0
  private theme: ThemeName = 'forest'
  private time = 0

  init(width: number, height: number, config: ForestConfig) {
    this.width = width
    this.height = height
    this.theme = config.theme
    this.particles = []
    this.createParticles(config.particleCount)
  }

  private createParticles(count: number) {
    const colors = THEMES[this.theme]
    const primaryRgb = hexToRgb(colors.primary)
    const secondaryRgb = hexToRgb(colors.secondary)

    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.width
      const y = Math.random() * this.height
      const t = Math.random()
      const rgb = lerpColor(primaryRgb, secondaryRgb, t)
      const size = 1 + Math.random() * 2.5
      const baseBrightness = 0.3 + Math.random() * 0.5

      this.particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        size,
        brightness: baseBrightness,
        baseBrightness,
        colorR: rgb[0],
        colorG: rgb[1],
        colorB: rgb[2],
        vx: 0,
        vy: 0,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.005 + Math.random() * 0.015,
        offsetX: 0,
        offsetY: 0,
      })
    }
  }

  update() {
    this.time += 0.016

    for (const p of this.particles) {
      p.phase += p.phaseSpeed

      p.offsetX = Math.sin(p.phase) * 8 + Math.cos(p.phase * 0.7) * 4
      p.offsetY = Math.cos(p.phase * 1.3) * 6 + Math.sin(p.phase * 0.5) * 3

      const targetX = p.baseX + p.offsetX
      const targetY = p.baseY + p.offsetY

      p.x += (targetX - p.x) * 0.03
      p.y += (targetY - p.y) * 0.03

      p.brightness += (p.baseBrightness - p.brightness) * 0.02

      p.baseX += p.vx
      p.baseY += p.vy
      p.vx *= 0.96
      p.vy *= 0.96
    }
  }

  applyRipple(x: number, y: number, radius: number, strength: number) {
    const radiusSq = radius * radius
    for (const p of this.particles) {
      const dx = p.x - x
      const dy = p.y - y
      const distSq = dx * dx + dy * dy
      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq)
        const factor = 1 - dist / radius
        const pushStrength = factor * strength * 30
        const angle = Math.atan2(dy, dx)
        p.vx += Math.cos(angle) * pushStrength
        p.vy += Math.sin(angle) * pushStrength
        p.brightness = Math.min(1, p.baseBrightness + factor * strength * 0.8)
      }
    }
  }

  applyDragTrail(x: number, y: number, radius: number, strength: number) {
    const trailRadius = radius * 0.5
    const radiusSq = trailRadius * trailRadius
    for (const p of this.particles) {
      const dx = p.x - x
      const dy = p.y - y
      const distSq = dx * dx + dy * dy
      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq)
        const factor = 1 - dist / trailRadius
        p.brightness = Math.min(1, p.baseBrightness + factor * strength * 0.5)
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = p.brightness
      const glowAlpha = alpha * 0.3
      const glowSize = p.size * 4

      ctx.beginPath()
      ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${p.colorR},${p.colorG},${p.colorB},${glowAlpha})`
      ctx.fill()

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${p.colorR},${p.colorG},${p.colorB},${alpha})`
      ctx.fill()

      if (p.brightness > p.baseBrightness + 0.2) {
        const coreAlpha = (p.brightness - p.baseBrightness) * 0.8
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${coreAlpha})`
        ctx.fill()
      }
    }
  }

  setTheme(theme: ThemeName) {
    this.theme = theme
    const colors = THEMES[theme]
    const primaryRgb = hexToRgb(colors.primary)
    const secondaryRgb = hexToRgb(colors.secondary)

    for (const p of this.particles) {
      const t = Math.random()
      const rgb = lerpColor(primaryRgb, secondaryRgb, t)
      p.colorR = rgb[0]
      p.colorG = rgb[1]
      p.colorB = rgb[2]
    }
  }

  setParticleCount(count: number) {
    if (count > this.particles.length) {
      const colors = THEMES[this.theme]
      const primaryRgb = hexToRgb(colors.primary)
      const secondaryRgb = hexToRgb(colors.secondary)
      const diff = count - this.particles.length
      for (let i = 0; i < diff; i++) {
        const x = Math.random() * this.width
        const y = Math.random() * this.height
        const t = Math.random()
        const rgb = lerpColor(primaryRgb, secondaryRgb, t)
        const size = 1 + Math.random() * 2.5
        const baseBrightness = 0.3 + Math.random() * 0.5
        this.particles.push({
          x,
          y,
          baseX: x,
          baseY: y,
          size,
          brightness: baseBrightness,
          baseBrightness,
          colorR: rgb[0],
          colorG: rgb[1],
          colorB: rgb[2],
          vx: 0,
          vy: 0,
          phase: Math.random() * Math.PI * 2,
          phaseSpeed: 0.005 + Math.random() * 0.015,
          offsetX: 0,
          offsetY: 0,
        })
      }
    } else if (count < this.particles.length) {
      this.particles.length = count
    }
  }

  reset(width: number, height: number, config: ForestConfig) {
    this.width = width
    this.height = height
    this.theme = config.theme
    this.particles = []
    this.time = 0
    this.createParticles(config.particleCount)
  }

  resize(width: number, height: number) {
    const scaleX = width / this.width
    const scaleY = height / this.height
    this.width = width
    this.height = height

    for (const p of this.particles) {
      p.baseX *= scaleX
      p.baseY *= scaleY
      p.x *= scaleX
      p.y *= scaleY
    }
  }
}
