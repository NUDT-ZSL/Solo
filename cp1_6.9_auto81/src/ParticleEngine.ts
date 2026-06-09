export interface TextParticle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  hue: number
  saturation: number
  lightness: number
  targetHue: number
  opacity: number
  life: number
  maxLife: number
  charIndex: number
}

interface ParticleEngineOptions {
  canvasWidth: number
  canvasHeight: number
  maxParticles?: number
  particlesPerChar?: { min: number; max: number }
  lifeRange?: { min: number; max: number }
  speedRange?: { min: number; max: number }
  radiusRange?: { min: number; max: number }
}

const DEFAULT_OPTIONS: Required<Omit<ParticleEngineOptions, 'canvasWidth' | 'canvasHeight'>> = {
  maxParticles: 1500,
  particlesPerChar: { min: 5, max: 8 },
  lifeRange: { min: 500, max: 1500 },
  speedRange: { min: 0.3, max: 1.8 },
  radiusRange: { min: 3, max: 6 }
}

export class ParticleEngine {
  private particles: TextParticle[] = []
  private nextId: number = 0
  private options: Required<Omit<ParticleEngineOptions, 'canvasWidth' | 'canvasHeight'>>
  private canvasWidth: number
  private canvasHeight: number
  private lastText: string = ''
  private lastLength: number = 0

  constructor(options: ParticleEngineOptions) {
    this.canvasWidth = options.canvasWidth
    this.canvasHeight = options.canvasHeight
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width
    this.canvasHeight = height
  }

  getParticles(): TextParticle[] {
    return this.particles
  }

  clear(): void {
    this.particles = []
    this.lastText = ''
    this.lastLength = 0
  }

  private getCharSpawnPosition(charIndex: number): { x: number; y: number } {
    const charsPerLine = Math.max(20, Math.floor(this.canvasWidth / 35))
    const lineHeight = 42
    const lineIndex = Math.floor(charIndex / charsPerLine)
    const colInLine = charIndex % charsPerLine
    const paddingX = this.canvasWidth * 0.15
    const usableWidth = this.canvasWidth - paddingX * 2
    const charSpacing = usableWidth / charsPerLine

    const x = paddingX + colInLine * charSpacing + charSpacing / 2
    const y = 60 + lineIndex * lineHeight

    return { x, y }
  }

  private hslToRgb(h: number, s: number, l: number): string {
    s /= 100
    l /= 100
    const k = (n: number) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    const r = Math.round(f(0) * 255)
    const g = Math.round(f(8) * 255)
    const b = Math.round(f(4) * 255)
    return `rgb(${r}, ${g}, ${b})`
  }

  updateText(newText: string): void {
    const oldLength = this.lastLength
    const newLength = newText.length

    if (newLength > oldLength) {
      for (let i = oldLength; i < newLength; i++) {
        const char = newText[i]
        if (char && char !== ' ' && char !== '\n' && char !== '\t') {
          this.spawnParticlesForChar(char, i, false)
        }
      }
    } else if (newLength < oldLength) {
      const deletedCount = oldLength - newLength
      for (let i = newLength; i < oldLength; i++) {
        this.accelerateDissipate(i)
      }
    }

    this.enforceMaxParticles()
    this.lastText = newText
    this.lastLength = newLength
  }

  private spawnParticlesForChar(
    char: string,
    charIndex: number,
    isAccelerated: boolean
  ): void {
    const { particlesPerChar, lifeRange, speedRange, radiusRange } = this.options
    const count =
      Math.floor(Math.random() * (particlesPerChar.max - particlesPerChar.min + 1)) +
      particlesPerChar.min

    const pos = this.getCharSpawnPosition(charIndex)
    const charCode = char.charCodeAt(0) || 32
    const baseHue = charCode % 360
    const saturation = 80
    const lightness = 60 + Math.random() * 30
    const hueShift = (Math.random() - 0.5) * 60

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed =
        Math.random() * (speedRange.max - speedRange.min) + speedRange.min

      const jitterX = (Math.random() - 0.5) * 14
      const jitterY = (Math.random() - 0.5) * 14

      const maxLife = isAccelerated
        ? 200
        : Math.random() * (lifeRange.max - lifeRange.min) + lifeRange.min

      const particle: TextParticle = {
        id: this.nextId++,
        x: pos.x + jitterX,
        y: pos.y + jitterY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius:
          Math.random() * (radiusRange.max - radiusRange.min) + radiusRange.min,
        hue: baseHue,
        saturation,
        lightness,
        targetHue: baseHue + hueShift,
        opacity: 1,
        life: 0,
        maxLife,
        charIndex
      }

      this.particles.push(particle)
    }
  }

  private accelerateDissipate(charIndex: number): void {
    for (const p of this.particles) {
      if (p.charIndex === charIndex) {
        p.maxLife = Math.min(p.maxLife, p.life + 200)
        p.vx *= 2.5
        p.vy *= 2.5
      }
    }
  }

  private enforceMaxParticles(): void {
    if (this.particles.length <= this.options.maxParticles) return

    const excess = this.particles.length - this.options.maxParticles
    const sorted = [...this.particles].sort((a, b) => b.life - a.life)
    const toRemove = new Set(sorted.slice(0, excess).map((p) => p.id))
    this.particles = this.particles.filter((p) => !toRemove.has(p.id))
  }

  update(deltaMs: number): void {
    const toRemove: number[] = []

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]

      p.life += deltaMs

      const progress = Math.min(p.life / p.maxLife, 1)
      p.opacity = 1 - progress

      p.x += p.vx
      p.y += p.vy
      p.vy += 0.005
      p.vx *= 0.998
      p.vy *= 0.998

      const hueProgress = Math.min(p.life / p.maxLife, 1)
      p.hue = p.hue + (p.targetHue - p.hue) * hueProgress * 0.02

      if (p.life >= p.maxLife || p.opacity <= 0.01) {
        toRemove.push(i)
      }
    }

    if (toRemove.length > 0) {
      for (let i = toRemove.length - 1; i >= 0; i--) {
        this.particles.splice(toRemove[i], 1)
      }
    }
  }
}
