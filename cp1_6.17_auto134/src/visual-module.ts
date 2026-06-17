import type { EnergyData } from './audio-module'

export type ThemeName = 'neon' | 'flame' | 'aurora' | 'cyber' | 'sunset'

interface ThemeColors {
  rings: string[][]
  particles: string[]
  waveHueShift: number
  globalBase: string
}

interface EnergyFrame {
  ts: number
  val: number
}

const THEMES: Record<ThemeName, ThemeColors> = {
  neon: {
    rings: [
      ['#7B2FFF', '#00E5FF'],
      ['#9B59B6', '#3498DB'],
      ['#6C3483', '#1ABC9C'],
      ['#8E44AD', '#2ECC71'],
      ['#A569BD', '#5DADE2'],
    ],
    particles: ['#7B2FFF', '#00E5FF', '#9B59B6', '#3498DB', '#1ABC9C'],
    waveHueShift: 30,
    globalBase: '#00E5FF',
  },
  flame: {
    rings: [
      ['#FF4500', '#FF8C00'],
      ['#FF6347', '#FFA500'],
      ['#DC143C', '#FFD700'],
      ['#FF0000', '#FF6600'],
      ['#E74C3C', '#F39C12'],
    ],
    particles: ['#FF4500', '#FF8C00', '#FF6347', '#FFA500', '#FFD700'],
    waveHueShift: 30,
    globalBase: '#FF8C00',
  },
  aurora: {
    rings: [
      ['#00FF88', '#00E5FF'],
      ['#2ECC71', '#1ABC9C'],
      ['#27AE60', '#16A085'],
      ['#00FF7F', '#00CED1'],
      ['#3DED97', '#40E0D0'],
    ],
    particles: ['#00FF88', '#00E5FF', '#2ECC71', '#1ABC9C', '#00FF7F'],
    waveHueShift: 30,
    globalBase: '#00FF88',
  },
  cyber: {
    rings: [
      ['#FF69B4', '#DA70D6'],
      ['#FF1493', '#BA55D3'],
      ['#C71585', '#9370DB'],
      ['#FF00FF', '#EE82EE'],
      ['#DB7093', '#DDA0DD'],
    ],
    particles: ['#FF69B4', '#DA70D6', '#FF1493', '#BA55D3', '#FF00FF'],
    waveHueShift: 30,
    globalBase: '#FF69B4',
  },
  sunset: {
    rings: [
      ['#FFD700', '#FF8C00'],
      ['#FFA500', '#FF6347'],
      ['#F0E68C', '#FF4500'],
      ['#DAA520', '#DC143C'],
      ['#BDB76B', '#FF0000'],
    ],
    particles: ['#FFD700', '#FF8C00', '#FFA500', '#FF6347', '#F0E68C'],
    waveHueShift: 30,
    globalBase: '#FFD700',
  },
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  life: number
  maxLife: number
}

interface Ring {
  radius: number
  maxRadius: number
  colorPair: string[]
  opacity: number
  speed: number
}

const TRANSITION_FRAMES = 60
const GLOW_RING_OPACITY_MIN = 0.1
const GLOW_RING_OPACITY_MAX = 0.15

export interface ClimaxConfig {
  windowMs: number
  ratioThreshold: number
  shiftMinDeg: number
  shiftMaxDeg: number
}

const DEFAULT_CLIMAX_CONFIG: ClimaxConfig = {
  windowMs: 5000,
  ratioThreshold: 1.2,
  shiftMinDeg: 10,
  shiftMaxDeg: 15,
}

export interface VisualModule {
  setTheme(name: ThemeName): void
  cycleTheme(): void
  getTheme(): ThemeName
  render(energy: EnergyData, canvas: HTMLCanvasElement): void
  resize(w: number, h: number): void
  reset(): void
  setClimaxConfig(partial: Partial<ClimaxConfig>): void
  getClimaxConfig(): ClimaxConfig
  isInClimax(): boolean
  getDebugInfo(): { avg5s: number; current: number; ratio: number; shift: number }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16)
  const g1 = parseInt(c1.slice(3, 5), 16)
  const b1 = parseInt(c1.slice(5, 7), 16)
  const r2 = parseInt(c2.slice(1, 3), 16)
  const g2 = parseInt(c2.slice(3, 5), 16)
  const b2 = parseInt(c2.slice(5, 7), 16)
  const rr = Math.round(lerp(r1, r2, t))
  const gg = Math.round(lerp(g1, g2, t))
  const bb = Math.round(lerp(b1, b2, t))
  return `#${rr.toString(16).padStart(2, '0')}${gg.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`
}

function mixThemeColors(
  t1: ThemeColors,
  t2: ThemeColors,
  progress: number
): ThemeColors {
  if (progress <= 0) return t1
  if (progress >= 1) return t2
  const rings: string[][] = t1.rings.map((pair, i) => [
    lerpColor(pair[0], t2.rings[i][0], progress),
    lerpColor(pair[1], t2.rings[i][1], progress),
  ])
  const particles: string[] = t1.particles.map((c, i) =>
    lerpColor(c, t2.particles[i], progress)
  )
  return {
    rings,
    particles,
    waveHueShift: lerp(t1.waveHueShift, t2.waveHueShift, progress),
    globalBase: lerpColor(t1.globalBase, t2.globalBase, progress),
  }
}

export function createVisualModule(): VisualModule {
  let currentThemeName: ThemeName = 'neon'
  let fromThemeName: ThemeName = 'neon'
  let toThemeName: ThemeName = 'neon'
  let themeTransitionProgress = 1
  let climaxConfig: ClimaxConfig = { ...DEFAULT_CLIMAX_CONFIG }
  let inClimax = false
  let rings: Ring[] = []
  let particles: Particle[] = []
  let wavePhase = 0
  let waveSwingOffset = 0
  let prevLowEnergy = 0
  const energyHistory: EnergyFrame[] = []
  let currentGlobalShift = 0
  let savedGlobalShiftAtThemeChange = 0
  let debugInfo = { avg5s: 0, current: 0, ratio: 0, shift: 0 }

  function getActiveTheme(): ThemeColors {
    if (themeTransitionProgress >= 1) return THEMES[currentThemeName]
    return mixThemeColors(
      THEMES[fromThemeName],
      THEMES[toThemeName],
      themeTransitionProgress
    )
  }

  function computeAverage5s(now: number): number {
    const cutoff = now - climaxConfig.windowMs
    while (energyHistory.length > 0 && energyHistory[0].ts < cutoff) {
      energyHistory.shift()
    }
    if (energyHistory.length === 0) return 0
    let sum = 0
    for (const f of energyHistory) sum += f.val
    return sum / energyHistory.length
  }

  function computeComputedShift(currentFrameEnergy: number, isClimax: boolean): number {
    if (!isClimax) return 0
    const e = Math.max(0, Math.min(1, currentFrameEnergy))
    return lerp(climaxConfig.shiftMinDeg, climaxConfig.shiftMaxDeg, e)
  }

  function spawnRings(energy: number, cx: number, cy: number, maxR: number, shift: number) {
    const theme = getActiveTheme()
    const count = Math.floor(energy * 3) + 1
    for (let i = 0; i < count; i++) {
      const ci = Math.floor(Math.random() * theme.rings.length)
      const rawPair = theme.rings[ci]
      rings.push({
        radius: 10,
        maxRadius: maxR,
        colorPair: [shiftHue(rawPair[0], shift), shiftHue(rawPair[1], shift)],
        opacity: 0.6,
        speed: 2 + energy * 4,
      })
    }
  }

  function spawnParticles(energy: number, cx: number, cy: number, shift: number) {
    const theme = getActiveTheme()
    const count = Math.floor(50 + energy * 250)
    for (let i = 0; i < Math.min(count, 10); i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + energy * 6 + Math.random() * 3
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color: shiftHue(theme.particles[Math.floor(Math.random() * theme.particles.length)], shift),
        life: 1,
        maxLife: 40 + Math.random() * 40,
      })
    }
  }

  function drawRings(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]
      r.radius += r.speed
      r.opacity = 0.6 * (1 - r.radius / r.maxRadius)
      if (r.opacity <= 0 || r.radius >= r.maxRadius) {
        rings.splice(i, 1)
        continue
      }
      const grad = ctx.createRadialGradient(cx, cy, r.radius * 0.8, cx, cy, r.radius)
      grad.addColorStop(0, r.colorPair[0] + alphaHex(r.opacity))
      grad.addColorStop(1, r.colorPair[1] + alphaHex(0))
      ctx.beginPath()
      ctx.arc(cx, cy, r.radius, 0, Math.PI * 2)
      ctx.strokeStyle = grad
      ctx.lineWidth = 2 + r.opacity * 3
      ctx.stroke()
    }
  }

  function drawParticles(ctx: CanvasRenderingContext2D) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.98
      p.vy *= 0.98
      p.life -= 1 / p.maxLife
      if (p.life <= 0) {
        particles.splice(i, 1)
        continue
      }
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = p.color + alphaHex(p.life)
      ctx.fill()
    }
  }

  function drawWaveform(
    ctx: CanvasRenderingContext2D,
    energy: EnergyData,
    w: number,
    h: number,
    shift: number
  ) {
    const theme = getActiveTheme()
    const baseColor = theme.particles[0]
    const totalShift = theme.waveHueShift + shift

    const hueShifted = shiftHue(baseColor, totalShift)

    wavePhase += 0.03 + energy.high * 0.1
    waveSwingOffset = Math.sin(wavePhase * 0.5) * w * 0.01

    const amp = 20 + energy.high * 80
    const cy = h / 2
    const points: [number, number][] = []

    for (let x = 0; x <= w; x += 3) {
      const nx = (x + waveSwingOffset) / w
      const y =
        cy +
        Math.sin(nx * 6 * Math.PI + wavePhase) * amp * 0.5 +
        Math.sin(nx * 3 * Math.PI + wavePhase * 1.3) * amp * 0.3 +
        Math.sin(nx * 10 * Math.PI + wavePhase * 0.7) * amp * 0.2
      points.push([x, y])
    }

    ctx.beginPath()
    ctx.moveTo(points[0][0], points[0][1])
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1])
    }
    ctx.strokeStyle = hueShifted
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(points[0][0], points[0][1])
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1])
    }
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()

    const grad = ctx.createLinearGradient(0, cy - amp, 0, h)
    grad.addColorStop(0, hueShifted + '33')
    grad.addColorStop(1, hueShifted + '00')
    ctx.fillStyle = grad
    ctx.fill()
  }

  function drawGlobalToneMapping(
    ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number, maxR: number, shift: number
  ) {
    if (shift <= 0) return
    const theme = getActiveTheme()
    const base = theme.globalBase
    const range = climaxConfig.shiftMaxDeg - climaxConfig.shiftMinDeg
    const rangeNorm = range > 0 ? (shift - climaxConfig.shiftMinDeg) / range : 1
    const t = Math.max(0, Math.min(1, rangeNorm))

    const warmColor = shiftHue(base, shift)
    const toneAlpha = 0.04 * t

    ctx.save()
    ctx.globalCompositeOperation = 'overlay'
    ctx.fillStyle = warmColor + alphaHex(toneAlpha)
    ctx.fillRect(0, 0, w, h)
    ctx.restore()

    const glowAlpha = GLOW_RING_OPACITY_MIN + t * (GLOW_RING_OPACITY_MAX - GLOW_RING_OPACITY_MIN)
    const grad = ctx.createRadialGradient(cx, cy, maxR * 0.2, cx, cy, maxR)
    grad.addColorStop(0, warmColor + alphaHex(glowAlpha))
    grad.addColorStop(1, warmColor + alphaHex(0))
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }

  const mod: VisualModule = {
    setTheme(name: ThemeName) {
      if (name === currentThemeName) return
      fromThemeName = currentThemeName
      toThemeName = name
      currentThemeName = name
      themeTransitionProgress = 0
      savedGlobalShiftAtThemeChange = currentGlobalShift
    },
    cycleTheme() {
      const idx = THEME_NAMES.indexOf(currentThemeName)
      const next = THEME_NAMES[(idx + 1) % THEME_NAMES.length]
      mod.setTheme(next)
    },
    getTheme() {
      return currentThemeName
    },
    setClimaxConfig(partial: Partial<ClimaxConfig>) {
      climaxConfig = { ...climaxConfig, ...partial }
    },
    getClimaxConfig() {
      return { ...climaxConfig }
    },
    isInClimax() {
      return inClimax
    },
    getDebugInfo() {
      return { ...debugInfo }
    },
    render(energy: EnergyData, canvas: HTMLCanvasElement) {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const w = canvas.width
      const h = canvas.height
      const cx = w / 2
      const cy = h / 2
      const maxR = Math.sqrt(cx * cx + cy * cy)

      const now = Date.now()
      const currentFrameEnergy = (energy.low + energy.mid + energy.high) / 3
      energyHistory.push({ ts: now, val: currentFrameEnergy })

      const avg5s = computeAverage5s(now)
      const ratio = avg5s > 0.0001 ? currentFrameEnergy / avg5s : 1
      inClimax = ratio >= climaxConfig.ratioThreshold

      const targetShift = computeComputedShift(currentFrameEnergy, inClimax)
      currentGlobalShift = lerp(currentGlobalShift, targetShift, 0.08)

      if (themeTransitionProgress < 1) {
        themeTransitionProgress = Math.min(1, themeTransitionProgress + 1 / TRANSITION_FRAMES)
      }

      let effectiveShift = currentGlobalShift
      if (themeTransitionProgress < 1) {
        effectiveShift = lerp(savedGlobalShiftAtThemeChange, currentGlobalShift, themeTransitionProgress)
      }

      debugInfo = { avg5s, current: currentFrameEnergy, ratio, shift: effectiveShift }

      const lowDelta = energy.low - prevLowEnergy
      if (lowDelta > 0.05 || energy.low > 0.4) {
        spawnRings(energy.low, cx, cy, maxR, effectiveShift)
      }
      prevLowEnergy = energy.low

      spawnParticles(energy.mid, cx, cy, effectiveShift)

      ctx.clearRect(0, 0, w, h)

      drawRings(ctx, cx, cy)
      drawParticles(ctx)
      drawWaveform(ctx, energy, w, h, effectiveShift)
      drawGlobalToneMapping(ctx, w, h, cx, cy, maxR, effectiveShift)
    },
    resize(_w: number, _h: number) {},
    reset() {
      rings = []
      particles = []
      wavePhase = 0
      waveSwingOffset = 0
      prevLowEnergy = 0
      energyHistory.length = 0
      currentGlobalShift = 0
      savedGlobalShiftAtThemeChange = 0
      inClimax = false
    },
  }

  return mod
}

function alphaHex(a: number): string {
  const v = Math.max(0, Math.min(255, Math.round(a * 255)))
  return v.toString(16).padStart(2, '0')
}

function shiftHue(hex: string, degrees: number): string {
  if (degrees === 0) return hex
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  let s = 0

  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }

  h = ((h * 360 + degrees) % 360) / 360
  if (h < 0) h += 1

  function hue2rgb(p: number, q: number, t: number) {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const rr = Math.round(hue2rgb(p, q, h + 1 / 3) * 255)
  const gg = Math.round(hue2rgb(p, q, h) * 255)
  const bb = Math.round(hue2rgb(p, q, h - 1 / 3) * 255)

  return `#${rr.toString(16).padStart(2, '0')}${gg.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`
}

export const THEME_NAMES: ThemeName[] = ['neon', 'flame', 'aurora', 'cyber', 'sunset']

export const THEME_DOT_COLORS: Record<ThemeName, string> = {
  neon: '#7B2FFF',
  flame: '#FF4500',
  aurora: '#00FF88',
  cyber: '#FF69B4',
  sunset: '#FFD700',
}
