export interface HSL {
  h: number
  s: number
  l: number
}

export interface RGB {
  r: number
  g: number
  b: number
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function angleToHue(angle: number): number {
  return ((angle % 360) + 360) % 360
}

export function angleToPercent(angle: number): number {
  const a = ((angle % 360) + 360) % 360
  return clamp((a / 360) * 100, 0, 100)
}

export function percentToAngle(p: number): number {
  return clamp(p, 0, 100) / 100 * 360
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const c = (1 - Math.abs(2 * l / 100 - 1)) * (s / 100)
  const hp = h / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let r = 0, g = 0, b = 0
  if (0 <= hp && hp < 1) { r = c; g = x; b = 0 }
  else if (1 <= hp && hp < 2) { r = x; g = c; b = 0 }
  else if (2 <= hp && hp < 3) { r = 0; g = c; b = x }
  else if (3 <= hp && hp < 4) { r = 0; g = x; b = c }
  else if (4 <= hp && hp < 5) { r = x; g = 0; b = c }
  else if (5 <= hp && hp < 6) { r = c; g = 0; b = x }
  const m = l / 100 - c / 2
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (n: number) => clamp(n, 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

export function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb(hsl))
}

export function hslToString(hsl: HSL): string {
  return `hsl(${Math.round(hsl.h)} ${Math.round(hsl.s)}% ${Math.round(hsl.l)}%)`
}

export function rgbToString(rgb: RGB): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  let h = 0, s = 0
  const l = (max + min) / 2
  const d = max - min
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break
      case gn: h = (bn - rn) / d + 2; break
      case bn: h = (rn - gn) / d + 4; break
    }
    h *= 60
  }
  return { h, s: s * 100, l: l * 100 }
}

export function hexToHsl(hex: string): HSL | null {
  const match = hex.replace('#', '').match(/^([0-9a-f]{6})$/i)
  if (!match) return null
  const r = parseInt(match[1].slice(0, 2), 16)
  const g = parseInt(match[1].slice(2, 4), 16)
  const b = parseInt(match[1].slice(4, 6), 16)
  return rgbToHsl({ r, g, b })
}

export function hslToCssString(hsl: HSL, alpha = 1): string {
  return `hsla(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%, ${alpha})`
}
