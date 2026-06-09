export interface Theme {
  name: string
  colors: string[]
}

export const defaultTheme: Theme = {
  name: '默认',
  colors: ['#FFFFFF', '#A0C4FF', '#FFD6A5', '#B39DDB', '#FF9AA2'],
}

export const themes: Record<string, Theme> = {
  default: defaultTheme,
  '1': {
    name: '冷夜',
    colors: ['#1A237E', '#283593', '#3949AB', '#5C6BC0', '#7986CB'],
  },
  '2': {
    name: '暖阳',
    colors: ['#E65100', '#F57C00', '#FB8C00', '#FFB300', '#FFC107'],
  },
  '3': {
    name: '幻彩',
    colors: ['#8E24AA', '#AB47BC', '#CE93D8', '#26C6DA', '#4DD0E1'],
  },
}

export class ThemeManager {
  private currentTheme: Theme
  private targetColors: number[][]
  private currentColors: number[][]
  private transitionStart: number = 0
  private transitioning: boolean = false
  private readonly transitionDuration: number = 500

  constructor() {
    this.currentTheme = defaultTheme
    this.targetColors = this.currentTheme.colors.map(hexToRgb)
    this.currentColors = this.currentTheme.colors.map(hexToRgb)
  }

  getCurrentTheme(): Theme {
    return this.currentTheme
  }

  getThemeColors(): string[] {
    return this.currentTheme.colors
  }

  getInterpolatedColor(index: number): string {
    const color = this.currentColors[index % this.currentColors.length]
    return rgbToHex(color[0], color[1], color[2])
  }

  getRandomColor(): string {
    const idx = Math.floor(Math.random() * this.currentColors.length)
    const color = this.currentColors[idx]
    return rgbToHex(color[0], color[1], color[2])
  }

  switchTheme(key: string): void {
    const theme = themes[key]
    if (!theme || theme.name === this.currentTheme.name) return

    this.currentTheme = theme
    this.targetColors = theme.colors.map(hexToRgb)
    this.transitionStart = performance.now()
    this.transitioning = true
  }

  update(): void {
    if (!this.transitioning) return

    const now = performance.now()
    const elapsed = now - this.transitionStart
    const t = Math.min(1, elapsed / this.transitionDuration)
    const easeT = easeInOutCubic(t)

    for (let i = 0; i < this.currentColors.length; i++) {
      const from = this.currentColors[i]
      const to = this.targetColors[i]
      from[0] = lerp(from[0], to[0], easeT)
      from[1] = lerp(from[1], to[1], easeT)
      from[2] = lerp(from[2], to[2], easeT)
    }

    if (t >= 1) {
      this.transitioning = false
    }
  }

  isTransitioning(): boolean {
    return this.transitioning
  }
}

function hexToRgb(hex: string): number[] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => {
    const h = Math.round(Math.max(0, Math.min(255, v))).toString(16)
    return h.length === 1 ? '0' + h : h
  }
  return '#' + toHex(r) + toHex(g) + toHex(b)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function mixColors(color1: string, color2: string): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  return rgbToHex((c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2, (c1[2] + c2[2]) / 2)
}
