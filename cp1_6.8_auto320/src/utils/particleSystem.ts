export interface ThemeConfig {
  name: string
  nameZh: string
  colors: [number, number, number, number][]
  glowColor: string
}

export const THEMES: ThemeConfig[] = [
  {
    name: 'aurora',
    nameZh: '极光',
    colors: [
      [0, 255, 136, 1],
      [0, 200, 255, 1],
      [136, 0, 255, 1],
      [0, 255, 200, 1],
      [100, 255, 180, 1],
    ],
    glowColor: 'rgba(0, 255, 180, 0.15)',
  },
  {
    name: 'flame',
    nameZh: '火焰',
    colors: [
      [255, 60, 0, 1],
      [255, 160, 0, 1],
      [255, 220, 0, 1],
      [255, 100, 20, 1],
      [255, 180, 60, 1],
    ],
    glowColor: 'rgba(255, 100, 0, 0.15)',
  },
  {
    name: 'deepSea',
    nameZh: '深海',
    colors: [
      [0, 100, 200, 1],
      [0, 180, 220, 1],
      [0, 60, 140, 1],
      [0, 220, 180, 1],
      [40, 140, 200, 1],
    ],
    glowColor: 'rgba(0, 140, 220, 0.15)',
  },
  {
    name: 'neon',
    nameZh: '霓虹',
    colors: [
      [255, 0, 128, 1],
      [0, 255, 255, 1],
      [255, 0, 255, 1],
      [128, 0, 255, 1],
      [0, 128, 255, 1],
    ],
    glowColor: 'rgba(255, 0, 200, 0.15)',
  },
  {
    name: 'warmSun',
    nameZh: '暖阳',
    colors: [
      [255, 200, 60, 1],
      [255, 140, 0, 1],
      [255, 220, 100, 1],
      [255, 160, 40, 1],
      [255, 180, 80, 1],
    ],
    glowColor: 'rgba(255, 180, 40, 0.15)',
  },
]

export interface TrailPoint {
  x: number
  y: number
  r: number
  g: number
  b: number
  opacity: number
  size: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  g: number
  b: number
  size: number
  opacity: number
  life: number
  maxLife: number
  trail: TrailPoint[]
  active: boolean
}

export interface ParticleSystemConfig {
  themeIndex: number
  particleSize: number
  dissipationSpeed: number
  maxParticles: number
  trailLength: number
  emitRate: number
}

function lerpColor(
  from: [number, number, number, number],
  to: [number, number, number, number],
  t: number
): [number, number, number, number] {
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
    from[3] + (to[3] - from[3]) * t,
  ]
}

export class ParticleSystem {
  particles: Particle[] = []
  config: ParticleSystemConfig
  private themeTransitionProgress = 1
  private previousThemeIndex = 0
  private themeTransitionDuration = 800
  private themeTransitionStart = 0
  private trailMaxLength = 50

  constructor(config: ParticleSystemConfig) {
    this.config = config
    this.trailMaxLength = config.trailLength
  }

  setTheme(newThemeIndex: number): void {
    if (newThemeIndex === this.config.themeIndex && this.themeTransitionProgress >= 1) return
    this.previousThemeIndex = this.config.themeIndex
    this.config.themeIndex = newThemeIndex
    this.themeTransitionStart = performance.now()
    this.themeTransitionProgress = 0
  }

  setParticleSize(size: number): void {
    this.config.particleSize = size
  }

  setDissipationSpeed(speed: number): void {
    this.config.dissipationSpeed = speed
  }

  private getCurrentColors(): [number, number, number, number][] {
    if (this.themeTransitionProgress >= 1) {
      return THEMES[this.config.themeIndex].colors
    }
    const fromColors = THEMES[this.previousThemeIndex].colors
    const toColors = THEMES[this.config.themeIndex].colors
    const t = this.easeInOutCubic(this.themeTransitionProgress)
    return fromColors.map((from, i) => lerpColor(from, toColors[i % toColors.length], t))
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  private pickColor(): [number, number, number, number] {
    const colors = this.getCurrentColors()
    return colors[Math.floor(Math.random() * colors.length)]
  }

  emit(x: number, y: number, dx: number, dy: number): void {
    if (this.particles.length >= this.config.maxParticles) return

    const count = this.config.emitRate
    for (let i = 0; i < count; i++) {
      const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.2
      const speed = 0.8 + Math.random() * 2.5
      const color = this.pickColor()
      const maxLife = 120 + Math.random() * 180
      const sizeVariation = this.config.particleSize * (0.6 + Math.random() * 0.8)

      const particle: Particle = {
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed + (dx * 0.15),
        vy: Math.sin(angle) * speed + (dy * 0.15),
        r: color[0],
        g: color[1],
        b: color[2],
        size: sizeVariation,
        opacity: 0.8 + Math.random() * 0.2,
        life: maxLife,
        maxLife,
        trail: [],
        active: true,
      }

      this.particles.push(particle)
    }
  }

  update(now: number): void {
    if (this.themeTransitionProgress < 1) {
      this.themeTransitionProgress = Math.min(
        1,
        (now - this.themeTransitionStart) / this.themeTransitionDuration
      )

      if (this.themeTransitionProgress < 1) {
        const t = this.easeInOutCubic(this.themeTransitionProgress)
        const fromColors = THEMES[this.previousThemeIndex].colors
        const toColors = THEMES[this.config.themeIndex].colors
        for (const p of this.particles) {
          for (const tp of p.trail) {
            const fromIdx = Math.floor(Math.random() * fromColors.length)
            const toIdx = Math.floor(Math.random() * toColors.length)
            const interpR = fromColors[fromIdx][0] + (toColors[toIdx][0] - fromColors[fromIdx][0]) * t
            const interpG = fromColors[fromIdx][1] + (toColors[toIdx][1] - fromColors[fromIdx][1]) * t
            const interpB = fromColors[fromIdx][2] + (toColors[toIdx][2] - fromColors[fromIdx][2]) * t
            tp.r += (interpR - tp.r) * 0.02
            tp.g += (interpG - tp.g) * 0.02
            tp.b += (interpB - tp.b) * 0.02
          }
          const fromC = fromColors[Math.floor(Math.random() * fromColors.length)]
          const toC = toColors[Math.floor(Math.random() * toColors.length)]
          p.r += (lerpColor(fromC, toC, t)[0] - p.r) * 0.02
          p.g += (lerpColor(fromC, toC, t)[1] - p.g) * 0.02
          p.b += (lerpColor(fromC, toC, t)[2] - p.b) * 0.02
        }
      }
    }

    const fadeRate = this.config.dissipationSpeed * 0.003

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]

      if (p.trail.length > 0 || p.active) {
        p.trail.push({
          x: p.x,
          y: p.y,
          r: p.r,
          g: p.g,
          b: p.b,
          opacity: p.opacity * 0.9,
          size: p.size * 0.85,
        })
      }

      if (p.trail.length > this.trailMaxLength) {
        p.trail.splice(0, p.trail.length - this.trailMaxLength)
      }

      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.985
      p.vy *= 0.985
      p.vx += (Math.random() - 0.5) * 0.08
      p.vy += (Math.random() - 0.5) * 0.08

      if (!p.active) {
        p.opacity -= fadeRate * 1.5
        p.size *= 0.995
      } else {
        p.life -= 1
        if (p.life <= 0) {
          p.active = false
        }
      }

      for (let j = p.trail.length - 1; j >= 0; j--) {
        p.trail[j].opacity -= fadeRate
        p.trail[j].size *= 0.998
        if (p.trail[j].opacity <= 0.01) {
          p.trail.splice(j, 1)
        }
      }

      if (p.trail.length === 0 && !p.active) {
        this.particles.splice(i, 1)
      }
    }
  }

  deactivateAll(): void {
    for (const p of this.particles) {
      p.active = false
    }
  }

  clear(): void {
    this.particles = []
  }

  getParticleCount(): number {
    return this.particles.length
  }

  getTrailCount(): number {
    let count = 0
    for (const p of this.particles) {
      count += p.trail.length
    }
    return count
  }
}
