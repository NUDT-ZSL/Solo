export interface HSLRange {
  minHue: number
  maxHue: number
  saturation: number
  lightness: number
}

export interface SceneState {
  time: number
  audioLevel: number
  cameraDistance: number
}

const huePalettes = [
  { name: 'aurora', baseHue: 180, spread: 80 },
  { name: 'cosmic', baseHue: 270, spread: 90 },
  { name: 'sunset', baseHue: 30, spread: 70 },
  { name: 'ocean', baseHue: 210, spread: 60 },
  { name: 'crystal', baseHue: 300, spread: 100 },
]

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

export const getCrystalPalette = (state: SceneState, seed: number): HSLRange => {
  const paletteIndex = Math.floor(seed * huePalettes.length) % huePalettes.length
  const palette = huePalettes[paletteIndex]

  const driftSpeed = 30 + (seed % 31)
  const hueDrift = Math.sin((state.time / driftSpeed) * Math.PI * 2) * 30

  const baseHue = (palette.baseHue + hueDrift + 360) % 360
  const spreadFactor = 0.7 + Math.sin(state.time * 0.001 + seed * 6.28) * 0.3

  return {
    minHue: (baseHue - palette.spread * 0.5 * spreadFactor + 360) % 360,
    maxHue: (baseHue + palette.spread * 0.5 * spreadFactor + 360) % 360,
    saturation: 0.7 + Math.sin(state.time * 0.002 + seed * 12.56) * 0.15,
    lightness: 0.55 + state.audioLevel * 0.1,
  }
}

export const getPillarColors = (state: SceneState, pillarIndex: number, yNorm: number): [number, number, number] => {
  const timeOffset = state.time * 0.05 + pillarIndex * 60
  const hueBase = ((pillarIndex * 50) + timeOffset) % 360
  const hueBottom = hueBase % 360
  const hueTop = (hueBase + 60) % 360

  const hue = hueBottom + (hueTop - hueBottom) * yNorm
  const saturation = 0.85
  const lightness = 0.5 + yNorm * 0.2

  return [hue, saturation, lightness]
}

export const getLightColor = (state: SceneState, lightIndex: number): string => {
  const baseColors = [
    { h: 45, name: 'warm' },
    { h: 215, name: 'cool' },
    { h: 320, name: 'pink' },
    { h: 160, name: 'cyan' },
  ]
  const base = baseColors[lightIndex]
  const hueShift = Math.sin(state.time * 0.0005 + lightIndex) * 15
  const hue = (base.h + hueShift + 360) % 360

  return `hsl(${hue}, 100%, 65%)`
}

export const hslToHex = (h: number, s: number, l: number): number => {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0

  if (h >= 0 && h < 60) { r = c; g = x; b = 0 }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0 }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x }

  return Math.round((r + m) * 255) << 16 |
         Math.round((g + m) * 255) << 8 |
         Math.round((b + m) * 255)
}

export const fadeInOpacity = (elapsedMs: number, durationMs: number = 1500): number => {
  if (elapsedMs >= durationMs) return 1
  return easeOutCubic(elapsedMs / durationMs)
}
