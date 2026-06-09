export interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  hue: number
  baseHue: number
  saturation: number
  lightness: number
  alpha: number
  age: number
  maxAge: number
  wobbleOffset: number
  wobbleFrequency: number
  wobbleAmplitude: number
  hasSplit: boolean
  isInkDot?: boolean
  isExplosion?: boolean
}

export interface BrushConfig {
  startHue: number
  endHue: number
  saturation: number
  lightness: number
  brushSize: number
  maxAge: number
}

const DEFAULT_CONFIG: BrushConfig = {
  startHue: 176,
  endHue: 343,
  saturation: 90,
  lightness: 80,
  brushSize: 3,
  maxAge: 1800
}

export class BrushEngine {
  private particles: Particle[] = []
  private config: BrushConfig
  private nextId = 0
  private lastMouseX = 0
  private lastMouseY = 0
  private isDrawing = false

  constructor(config?: Partial<BrushConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  updateConfig(config: Partial<BrushConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): BrushConfig {
    return { ...this.config }
  }

  startDrawing(x: number, y: number): void {
    this.isDrawing = true
    this.lastMouseX = x
    this.lastMouseY = y
    this.generateParticles(x, y)
  }

  moveDrawing(x: number, y: number): void {
    if (!this.isDrawing) return
    const dx = x - this.lastMouseX
    const dy = y - this.lastMouseY
    const distance = Math.sqrt(dx * dx + dy * dy)
    const steps = Math.max(1, Math.floor(distance / 3))

    for (let i = 0; i < steps; i++) {
      const t = i / steps
      const px = this.lastMouseX + dx * t
      const py = this.lastMouseY + dy * t
      this.generateParticles(px, py)
    }

    this.lastMouseX = x
    this.lastMouseY = y
  }

  endDrawing(): void {
    this.isDrawing = false
  }

  private generateParticles(x: number, y: number): void {
    const count = 5 + Math.floor(Math.random() * 4)
    const progressFactor = this.config.startHue <= this.config.endHue ? 1 : -1

    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * this.config.brushSize * 2
      const offsetY = (Math.random() - 0.5) * this.config.brushSize * 2
      const ageRatio = Math.random()
      const hueRange = Math.abs(this.config.endHue - this.config.startHue)
      const hue = this.config.startHue + progressFactor * hueRange * ageRatio

      this.particles.push({
        id: this.nextId++,
        x: x + offsetX,
        y: y + offsetY,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: 2 + Math.random() * 2,
        hue,
        baseHue: hue,
        saturation: this.config.saturation,
        lightness: this.config.lightness,
        alpha: 0.9,
        age: 0,
        maxAge: this.config.maxAge,
        wobbleOffset: Math.random() * Math.PI * 2,
        wobbleFrequency: 0.1 + Math.random() * 0.2,
        wobbleAmplitude: 0.5,
        hasSplit: false
      })
    }
  }

  addInkDots(x: number, y: number, hue: number): void {
    const count = 5 + Math.floor(Math.random() * 4)
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3
      const distance = 2 + Math.random() * 6
      this.particles.push({
        id: this.nextId++,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        vx: Math.cos(angle) * 0.3,
        vy: Math.sin(angle) * 0.3,
        radius: 0.5 + Math.random(),
        hue,
        baseHue: hue,
        saturation: 85,
        lightness: 65,
        alpha: 0.3,
        age: 0,
        maxAge: 30,
        wobbleOffset: 0,
        wobbleFrequency: 0,
        wobbleAmplitude: 0,
        hasSplit: true,
        isInkDot: true
      })
    }
  }

  addExplosionParticles(x: number, y: number, w: number, h: number): void {
    const count = 60 + Math.floor(Math.random() * 21)
    for (let i = 0; i < count; i++) {
      const px = Math.random() * w
      const py = Math.random() * h
      const angle = Math.atan2(py - y, px - x)
      const speed = 0.5 + Math.random() * 1.5
      this.particles.push({
        id: this.nextId++,
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 0.5 + Math.random() * 1.5,
        hue: Math.random() * 360,
        baseHue: Math.random() * 360,
        saturation: 95,
        lightness: 75,
        alpha: 0.9,
        age: 0,
        maxAge: 60,
        wobbleOffset: 0,
        wobbleFrequency: 0,
        wobbleAmplitude: 0,
        hasSplit: true,
        isExplosion: true
      })
    }
  }

  getParticles(): Particle[] {
    return this.particles
  }

  setParticles(particles: Particle[]): void {
    this.particles = particles
  }

  clearParticles(): void {
    this.particles = []
  }
}
