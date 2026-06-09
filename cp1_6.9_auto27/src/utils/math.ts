import type { GrowthMode, LayerColorStop } from '../types'

export const GOLDEN_RATIO = 1.618033988749895
export const GOLDEN_SCALE = 1 / GOLDEN_RATIO

export const PHI = GOLDEN_RATIO

export const MANUAL_CUBE_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4'
] as const

export const WARM_RED = '#FF4500'
export const COOL_PURPLE = '#8A2BE2'

export function hslToString(h: number, s: number, l: number, a = 1): string {
  if (a < 1) {
    return `hsla(${h}, ${s}%, ${l}%, ${a})`
  }
  return `hsl(${h}, ${s}%, ${l}%)`
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h *= 60
  }

  return { h, s: s * 100, l: l * 100 }
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpHsl(a: LayerColorStop, b: LayerColorStop, t: number): LayerColorStop {
  const h = lerpAngle(a.h, b.h, t)
  return {
    h,
    s: lerp(a.s, b.s, t),
    l: lerp(a.l, b.l, t),
    a: lerp(a.a, b.a, t)
  }
}

export function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a
  while (diff > 180) diff -= 360
  while (diff < -180) diff += 360
  return (a + diff * t + 360) % 360
}

export function getLayerHsl(layerIndex: number, totalLayers: number): LayerColorStop {
  const t = totalLayers <= 1 ? 0 : layerIndex / (totalLayers - 1)
  const warm = hexToHsl(WARM_RED)
  const cool = hexToHsl(COOL_PURPLE)
  return lerpHsl(
    { h: warm.h, s: warm.s, l: warm.l, a: 0.8 },
    { h: cool.h, s: cool.s, l: cool.l, a: 1.0 },
    t
  )
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
}

export function bounceInterpolation(t: number): [number, number, number] {
  const eased = easeOutCubic(Math.min(1, t))
  const bounceT = t < 1 ? Math.sin(t * Math.PI) * 0.35 * (1 - t) : 0
  return [eased, bounceT, eased]
}

export function generateSpiralAngle(layerIndex: number, mode: GrowthMode): number {
  const base = layerIndex * 15
  switch (mode) {
    case 'spiral':
      return base
    case 'recursive':
      return base + Math.sin(layerIndex * PHI) * 25
    case 'mirror':
      return layerIndex % 2 === 0 ? base : -base
    default:
      return base
  }
}

export function goldenSpiralPosition(
  cubeIndex: number,
  totalCubes: number,
  layerIndex: number,
  radius: number,
  layerRotation: number
): [number, number, number] {
  const anglePerCube = (2 * Math.PI) / totalCubes
  const phi = cubeIndex * anglePerCube + layerRotation
  const r = radius * (1 + 0.05 * Math.sin(layerIndex * PHI + cubeIndex))
  return [
    r * Math.cos(phi),
    0,
    r * Math.sin(phi)
  ]
}

export function snapToGrid(x: number, z: number, gridSize = 0.5): [number, number] {
  return [
    Math.round(x / gridSize) * gridSize,
    Math.round(z / gridSize) * gridSize
  ]
}

export function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}
