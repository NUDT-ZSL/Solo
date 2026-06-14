export type ThemeName = 'light' | 'dark' | 'forest' | 'ocean' | 'cyberpunk'

export interface ThemeColors {
  '--bg-primary': string
  '--bg-secondary': string
  '--bg-card': string
  '--text-primary': string
  '--text-secondary': string
  '--accent-primary': string
  '--accent-secondary': string
  '--border-color': string
  '--shadow-color': string
  '--progress-bg': string
  '--progress-fill': string
  '--btn-primary': string
  '--btn-hover': string
  '--table-row-alt': string
}

export type ThemeVariable = keyof ThemeColors

const themes: Record<ThemeName, ThemeColors> = {
  light: {
    '--bg-primary': '#f5f6fa',
    '--bg-secondary': '#ffffff',
    '--bg-card': '#ffffff',
    '--text-primary': '#2d3436',
    '--text-secondary': '#636e72',
    '--accent-primary': '#6c5ce7',
    '--accent-secondary': '#00b894',
    '--border-color': '#dfe6e9',
    '--shadow-color': 'rgba(0, 0, 0, 0.08)',
    '--progress-bg': '#dfe6e9',
    '--progress-fill': '#6c5ce7',
    '--btn-primary': '#6c5ce7',
    '--btn-hover': '#5a4bcf',
    '--table-row-alt': '#f8f9fa',
  },
  dark: {
    '--bg-primary': '#121220',
    '--bg-secondary': '#1e1e2e',
    '--bg-card': '#2a2a3e',
    '--text-primary': '#e0e0e0',
    '--text-secondary': '#a0a0b0',
    '--accent-primary': '#6c5ce7',
    '--accent-secondary': '#00cec9',
    '--border-color': '#3a3a4e',
    '--shadow-color': 'rgba(0, 0, 0, 0.3)',
    '--progress-bg': '#3a3a4e',
    '--progress-fill': '#6c5ce7',
    '--btn-primary': '#6c5ce7',
    '--btn-hover': '#5a4bcf',
    '--table-row-alt': '#252538',
  },
  forest: {
    '--bg-primary': '#1a2e1a',
    '--bg-secondary': '#243524',
    '--bg-card': '#2d4a2d',
    '--text-primary': '#e8f5e8',
    '--text-secondary': '#a8d5a8',
    '--accent-primary': '#4caf50',
    '--accent-secondary': '#8bc34a',
    '--border-color': '#3e5e3e',
    '--shadow-color': 'rgba(0, 0, 0, 0.35)',
    '--progress-bg': '#3e5e3e',
    '--progress-fill': '#4caf50',
    '--btn-primary': '#4caf50',
    '--btn-hover': '#43a047',
    '--table-row-alt': '#263e26',
  },
  ocean: {
    '--bg-primary': '#0a1628',
    '--bg-secondary': '#112240',
    '--bg-card': '#1a3358',
    '--text-primary': '#ccd6f6',
    '--text-secondary': '#8892b0',
    '--accent-primary': '#64ffda',
    '--accent-secondary': '#5ce1e6',
    '--border-color': '#233554',
    '--shadow-color': 'rgba(0, 0, 0, 0.4)',
    '--progress-bg': '#233554',
    '--progress-fill': '#64ffda',
    '--btn-primary': '#0ea5e9',
    '--btn-hover': '#0284c7',
    '--table-row-alt': '#152a4a',
  },
  cyberpunk: {
    '--bg-primary': '#0d0221',
    '--bg-secondary': '#150535',
    '--bg-card': '#1f0a47',
    '--text-primary': '#ff00ff',
    '--text-secondary': '#e0aaff',
    '--accent-primary': '#ff00ff',
    '--accent-secondary': '#00ffff',
    '--border-color': '#3d1f7e',
    '--shadow-color': 'rgba(255, 0, 255, 0.15)',
    '--progress-bg': '#3d1f7e',
    '--progress-fill': '#ff00ff',
    '--btn-primary': '#ff00ff',
    '--btn-hover': '#cc00cc',
    '--table-row-alt': '#190740',
  },
}

export const themeNames: ThemeName[] = ['light', 'dark', 'forest', 'ocean', 'cyberpunk']

export const themeLabels: Record<ThemeName, string> = {
  light: '明亮',
  dark: '暗黑',
  forest: '森林',
  ocean: '海洋',
  cyberpunk: '赛博朋克',
}

export const themeIcons: Record<ThemeName, string> = {
  light: '☀️',
  dark: '🌙',
  forest: '🌲',
  ocean: '🌊',
  cyberpunk: '🕹️',
}

export function applyTheme(colors: ThemeColors, element?: HTMLElement) {
  const target = element || document.documentElement
  const keys = Object.keys(colors) as ThemeVariable[]
  for (const key of keys) {
    target.style.setProperty(key, colors[key])
  }
}

export function clearInlineStyles(element?: HTMLElement) {
  const target = element || document.documentElement
  const keys = Object.keys(themes.dark) as ThemeVariable[]
  for (const key of keys) {
    target.style.removeProperty(key)
  }
}

export function getTheme(name: ThemeName): ThemeColors {
  return { ...themes[name] }
}

export function getAllThemeVariables(): ThemeVariable[] {
  return Object.keys(themes.dark) as ThemeVariable[]
}

export function getCurrentColors(): ThemeColors {
  const root = document.documentElement
  const result = {} as ThemeColors
  const keys = getAllThemeVariables()
  for (const key of keys) {
    result[key] = getComputedStyle(root).getPropertyValue(key).trim()
  }
  return result
}

function rgbToHslOutput(r: number, g: number, b: number): string {
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

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
}

function expandShortHex(short: string): string {
  // 处理 #RGB -> #RRGGBB, #RGBA -> #RRGGBBAA
  let expanded = ''
  for (const char of short) {
    expanded += char + char
  }
  return expanded
}

export function hexToHsl(input: string): string {
  if (!input || typeof input !== 'string') {
    return input || 'hsl(0, 0%, 0%)'
  }

  const trimmed = input.trim()

  // 已经是 HSL 格式直接返回
  if (trimmed.startsWith('hsl')) {
    return trimmed
  }

  // 处理 rgb / rgba 格式
  if (trimmed.startsWith('rgba(') || trimmed.startsWith('rgb(')) {
    try {
      const match = trimmed.match(/[\d.]+/g)
      if (!match || match.length < 3) return trimmed
      const r = parseInt(match[0], 10) / 255
      const g = parseInt(match[1], 10) / 255
      const b = parseInt(match[2], 10) / 255

      if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
        return trimmed
      }
      return rgbToHslOutput(r, g, b)
    } catch {
      return trimmed
    }
  }

  // 处理十六进制格式
  if (!trimmed.startsWith('#')) {
    return trimmed
  }

  try {
    // 去掉 # 号前缀
    let hexStr = trimmed.slice(1)

    // 处理短格式：#RGB / #RGBA
    if (hexStr.length === 3 || hexStr.length === 4) {
      hexStr = expandShortHex(hexStr)
    }

    // 验证是否为有效十六进制
    if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(hexStr)) {
      return trimmed
    }

    // 解析 6 位（无透明度）或 8 位（含透明度）
    const r = parseInt(hexStr.substring(0, 2), 16) / 255
    const g = parseInt(hexStr.substring(2, 4), 16) / 255
    const b = parseInt(hexStr.substring(4, 6), 16) / 255

    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
      return trimmed
    }

    // #RRGGBBAA 格式中的透明度暂时不参与 HSL 转换
    return rgbToHslOutput(r, g, b)
  } catch {
    return trimmed
  }
}

export function useTheme() {
  const applyThemeByName = (name: ThemeName) => {
    const colors = getTheme(name)
    applyTheme(colors)
    return colors
  }

  const updateVariable = (variable: ThemeVariable, value: string) => {
    document.documentElement.style.setProperty(variable, value)
  }

  return {
    applyThemeByName,
    updateVariable,
    getTheme,
    getCurrentColors,
    getAllThemeVariables,
  }
}
