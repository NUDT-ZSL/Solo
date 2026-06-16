import * as THREE from 'three'

export interface ThemeColors {
  center: string
  middle: string
  outer: string
}

export const themes: Record<string, ThemeColors> = {
  default: { center: '#4a00e0', middle: '#8e2de2', outer: '#00f2fe' },
  aurora: { center: '#00ff88', middle: '#7b2ff7', outer: '#00d4ff' },
  fire: { center: '#ff4d00', middle: '#ff8c00', outer: '#ffd700' },
  ice: { center: '#0066ff', middle: '#66ccff', outer: '#ffffff' }
}

export class ParticleCloud {
  private count: number
  private radius: number
  private theme: ThemeColors
  private positions: Float32Array
  private colors: Float32Array
  private sizes: Float32Array
  private basePositions: Float32Array
  private offsets: Float32Array
  private speeds: Float32Array
  private rotationSpeed: number = (Math.PI / 180) * 1
  private rotationAngle: number = 0

  constructor(count: number = 50000, radius: number = 150, theme: ThemeColors = themes.default) {
    this.count = count
    this.radius = radius
    this.theme = theme
    this.positions = new Float32Array(count * 3)
    this.colors = new Float32Array(count * 3)
    this.sizes = new Float32Array(count)
    this.basePositions = new Float32Array(count * 3)
    this.offsets = new Float32Array(count * 3)
    this.speeds = new Float32Array(count)
    this.generateParticles()
  }

  private generateParticles(): void {
    const colorCenter = new THREE.Color(this.theme.center)
    const colorMiddle = new THREE.Color(this.theme.middle)
    const colorOuter = new THREE.Color(this.theme.outer)

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3

      const r = this.radius * Math.cbrt(Math.random())
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)

      this.basePositions[i3] = x
      this.basePositions[i3 + 1] = y
      this.basePositions[i3 + 2] = z

      this.positions[i3] = x
      this.positions[i3 + 1] = y
      this.positions[i3 + 2] = z

      this.offsets[i3] = Math.random() * Math.PI * 2
      this.offsets[i3 + 1] = Math.random() * Math.PI * 2
      this.offsets[i3 + 2] = Math.random() * Math.PI * 2

      this.speeds[i] = 0.5 + Math.random() * 1.5

      const distRatio = r / this.radius
      let color: THREE.Color
      if (distRatio < 0.5) {
        const t = distRatio * 2
        color = colorCenter.clone().lerp(colorMiddle, t)
      } else {
        const t = (distRatio - 0.5) * 2
        color = colorMiddle.clone().lerp(colorOuter, t)
      }

      this.colors[i3] = color.r
      this.colors[i3 + 1] = color.g
      this.colors[i3 + 2] = color.b

      this.sizes[i] = 1 + Math.random() * 2
    }
  }

  update(deltaTime: number, elapsedTime: number): void {
    this.rotationAngle += this.rotationSpeed * deltaTime
    const sinRot = Math.sin(this.rotationAngle)
    const cosRot = Math.cos(this.rotationAngle)

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3

      const bx = this.basePositions[i3]
      const by = this.basePositions[i3 + 1]
      const bz = this.basePositions[i3 + 2]

      const rx = bx * cosRot - bz * sinRot
      const rz = bx * sinRot + bz * cosRot

      const speed = this.speeds[i]
      const floatX = Math.sin(elapsedTime * speed + this.offsets[i3]) * 0.3
      const floatY = Math.sin(elapsedTime * speed * 0.8 + this.offsets[i3 + 1]) * 0.3
      const floatZ = Math.sin(elapsedTime * speed * 1.2 + this.offsets[i3 + 2]) * 0.3

      this.positions[i3] = rx + floatX
      this.positions[i3 + 1] = by + floatY
      this.positions[i3 + 2] = rz + floatZ
    }
  }

  setCount(count: number): void {
    if (count === this.count) return
    this.count = count
    this.positions = new Float32Array(count * 3)
    this.colors = new Float32Array(count * 3)
    this.sizes = new Float32Array(count)
    this.basePositions = new Float32Array(count * 3)
    this.offsets = new Float32Array(count * 3)
    this.speeds = new Float32Array(count)
    this.generateParticles()
  }

  setTheme(theme: ThemeColors): void {
    this.theme = theme
    const colorCenter = new THREE.Color(theme.center)
    const colorMiddle = new THREE.Color(theme.middle)
    const colorOuter = new THREE.Color(theme.outer)

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3
      const r = Math.sqrt(
        this.basePositions[i3] ** 2 +
        this.basePositions[i3 + 1] ** 2 +
        this.basePositions[i3 + 2] ** 2
      )
      const distRatio = r / this.radius
      let color: THREE.Color
      if (distRatio < 0.5) {
        const t = distRatio * 2
        color = colorCenter.clone().lerp(colorMiddle, t)
      } else {
        const t = (distRatio - 0.5) * 2
        color = colorMiddle.clone().lerp(colorOuter, t)
      }
      this.colors[i3] = color.r
      this.colors[i3 + 1] = color.g
      this.colors[i3 + 2] = color.b
    }
  }

  getPositions(): Float32Array {
    return this.positions
  }

  getColors(): Float32Array {
    return this.colors
  }

  getSizes(): Float32Array {
    return this.sizes
  }

  getCount(): number {
    return this.count
  }

  getRadius(): number {
    return this.radius
  }
}
