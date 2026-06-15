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

const SHADE_LEVELS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '')
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('')
  }
  const num = parseInt(h, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

export function rgbToHex(rgb: RGB): string {
  const { r, g, b } = rgb
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(clamp(x, 0, 255)).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360
  const s = hsl.s / 100
  const l = hsl.l / 100

  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
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

    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

export function hexToHsl(hex: string): HSL {
  return rgbToHsl(hexToRgb(hex))
}

export function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb(hsl))
}

export function parseColor(input: string): string | null {
  const trimmed = input.trim()

  if (/^#?[0-9a-fA-F]{3}$/.test(trimmed) || /^#?[0-9a-fA-F]{6}$/.test(trimmed)) {
    const hex = trimmed.startsWith('#') ? trimmed : '#' + trimmed
    return hex.toUpperCase()
  }

  const rgbMatch = trimmed.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i)
  if (rgbMatch) {
    return rgbToHex({
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
    }).toUpperCase()
  }

  const hslMatch = trimmed.match(/^hsl\s*\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*\)$/i)
  if (hslMatch) {
    return hslToHex({
      h: parseInt(hslMatch[1]),
      s: parseInt(hslMatch[2]),
      l: parseInt(hslMatch[3]),
    }).toUpperCase()
  }

  return null
}

export function generateShades(baseHex: string): string[] {
  const hsl = hexToHsl(baseHex)

  return SHADE_LEVELS.map(level => {
    let lightness: number
    if (level <= 500) {
      lightness = 97 - (level / 500) * 47
    } else {
      lightness = 50 - ((level - 500) / 450) * 38
    }

    const saturation = level >= 700
      ? hsl.s * (1 - (level - 700) / 600)
      : hsl.s

    return hslToHex({
      h: hsl.h,
      s: clamp(saturation, 5, 100),
      l: clamp(lightness, 3, 97),
    })
  })
}

export function getShadeLabel(index: number): string {
  return String(SHADE_LEVELS[index])
}

export const SHADE_LABELS = SHADE_LEVELS.map(String)

export function formatCSSVariables(
  primary: string[],
  secondary: string[],
  neutral: string[],
  success: string[],
  warning: string[],
  error: string[],
): string {
  const lines: string[] = [':root {']

  const addShades = (prefix: string, shades: string[]) => {
    SHADE_LABELS.forEach((label, i) => {
      lines.push(`  --color-${prefix}-${label}: ${shades[i]};`)
    })
  }

  addShades('primary', primary)
  lines.push('')
  addShades('secondary', secondary)
  lines.push('')
  addShades('neutral', neutral)
  lines.push('')
  addShades('success', success)
  lines.push('')
  addShades('warning', warning)
  lines.push('')
  addShades('error', error)

  lines.push('}')
  return lines.join('\n')
}

export function formatTailwindConfig(
  primary: string[],
  secondary: string[],
  neutral: string[],
  success: string[],
  warning: string[],
  error: string[],
): string {
  const shadeObj = (shades: string[]): string => {
    const entries = SHADE_LABELS.map((label, i) =>
      `    ${label}: '${shades[i]}'`
    )
    return `{\n${entries.join(',\n')}\n  }`
  }

  return [
    "/** @type {import('tailwindcss').Config} */",
    'module.exports = {',
    '  theme: {',
    '    extend: {',
    '      colors: {',
    `        primary: ${shadeObj(primary)},`,
    `        secondary: ${shadeObj(secondary)},`,
    `        neutral: ${shadeObj(neutral)},`,
    `        success: ${shadeObj(success)},`,
    `        warning: ${shadeObj(warning)},`,
    `        error: ${shadeObj(error)},`,
    '      },',
    '    },',
    '  },',
    '}',
  ].join('\n')
}

export function getContrastText(hex: string): string {
  const rgb = hexToRgb(hex)
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}
