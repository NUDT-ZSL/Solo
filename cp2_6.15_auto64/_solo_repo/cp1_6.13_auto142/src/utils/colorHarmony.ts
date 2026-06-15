export type HarmonyRule = 'complementary' | 'analogous' | 'triadic' | 'split-complementary'

export interface RGB {
  r: number
  g: number
  b: number
}

export interface HSL {
  h: number
  s: number
  l: number
}

export interface HSV {
  h: number
  s: number
  v: number
}

export const rgbToHex = (rgb: RGB): string => {
  const { r, g, b } = rgb
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

export const hexToRgb = (hex: string): RGB => {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  }
}

export const rgbToHsl = (rgb: RGB): HSL => {
  const { r, g, b } = rgb
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255

  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0)
        break
      case gn:
        h = (bn - rn) / d + 2
        break
      case bn:
        h = (rn - gn) / d + 4
        break
    }
    h *= 60
  }

  return { h, s, l }
}

export const hslToRgb = (hsl: HSL): RGB => {
  const { h, s, l } = hsl
  const hn = ((h % 360) + 360) % 360 / 360

  if (s === 0) {
    const val = l * 255
    return { r: val, g: val, b: val }
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  return {
    r: hue2rgb(p, q, hn + 1 / 3) * 255,
    g: hue2rgb(p, q, hn) * 255,
    b: hue2rgb(p, q, hn - 1 / 3) * 255
  }
}

export const hsvToRgb = (hsv: HSV): RGB => {
  const { h, s, v } = hsv
  const hn = ((h % 360) + 360) % 360 / 60
  const i = Math.floor(hn)
  const f = hn - i
  const p = v * (1 - s)
  const q = v * (1 - s * f)
  const t = v * (1 - s * (1 - f))

  let r = 0, g = 0, b = 0

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }

  return { r: r * 255, g: g * 255, b: b * 255 }
}

export const rgbToHsv = (rgb: RGB): HSV => {
  const { r, g, b } = rgb
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255

  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max

  if (d !== 0) {
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break
      case gn: h = (bn - rn) / d + 2; break
      case bn: h = (rn - gn) / d + 4; break
    }
    h *= 60
  }

  return { h, s, v }
}

export const hexToHsl = (hex: string): HSL => rgbToHsl(hexToRgb(hex))
export const hslToHex = (hsl: HSL): string => rgbToHex(hslToRgb(hsl))

export const getComplementary = (hue: number): number[] => [hue, (hue + 180) % 360]

export const getAnalogous = (hue: number, offset: number = 30): number[] => [
  hue,
  ((hue - offset) % 360 + 360) % 360,
  (hue + offset) % 360
]

export const getTriadic = (hue: number): number[] => [
  hue,
  (hue + 120) % 360,
  (hue + 240) % 360
]

export const getSplitComplementary = (hue: number, offset: number = 150): number[] => [
  hue,
  ((hue + 180 - offset) % 360 + 360) % 360,
  (hue + 180 + offset) % 360
]

export const getHarmonyColors = (hex: string, rule: HarmonyRule): string[] => {
  const hsl = hexToHsl(hex)
  let hues: number[] = []

  switch (rule) {
    case 'complementary':
      hues = getComplementary(hsl.h)
      break
    case 'analogous':
      hues = getAnalogous(hsl.h, 30)
      break
    case 'triadic':
      hues = getTriadic(hsl.h)
      break
    case 'split-complementary':
      hues = getSplitComplementary(hsl.h, 150)
      break
  }

  return hues.map(hue => {
    const color = hslToHex({ h: hue, s: hsl.s, l: hsl.l })
    return color
  })
}

export const getRelativeLuminance = (rgb: RGB): number => {
  const toLin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * toLin(rgb.r) + 0.7152 * toLin(rgb.g) + 0.0722 * toLin(rgb.b)
}

export const getContrastRatio = (hex1: string, hex2: string): number => {
  const l1 = getRelativeLuminance(hexToRgb(hex1))
  const l2 = getRelativeLuminance(hexToRgb(hex2))
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export const darkenColor = (hex: string, amount: number): string => {
  const hsl = hexToHsl(hex)
  hsl.l = Math.max(0, hsl.l - amount)
  return hslToHex(hsl)
}

export const lightenColor = (hex: string, amount: number): string => {
  const hsl = hexToHsl(hex)
  hsl.l = Math.min(1, hsl.l + amount)
  return hslToHex(hsl)
}
