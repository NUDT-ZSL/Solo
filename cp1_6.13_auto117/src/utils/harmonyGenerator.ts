import type { HarmonySchemes } from '@/types'
import { hexToHsl, hslToHex } from './colorUtils'

function wrapHue(h: number): number {
  return ((h % 360) + 360) % 360
}

export function generateHarmonySchemes(baseColor: string): HarmonySchemes {
  const base = hexToHsl(baseColor)

  const complementary: string[] = [
    baseColor,
    hslToHex(wrapHue(base.h + 180), base.s, base.l),
    hslToHex(wrapHue(base.h + 180 - 15), clamp(base.s - 10), clamp(base.l + 10)),
    hslToHex(wrapHue(base.h + 180 + 15), clamp(base.s + 10), clamp(base.l - 10)),
    hslToHex(base.h, base.s, clamp(base.l + 15)),
  ]

  const analogous: string[] = [
    baseColor,
    hslToHex(wrapHue(base.h - 30), base.s, base.l),
    hslToHex(wrapHue(base.h - 15), base.s, base.l),
    hslToHex(wrapHue(base.h + 15), base.s, base.l),
    hslToHex(wrapHue(base.h + 30), base.s, base.l),
  ]

  const triadic: string[] = [
    baseColor,
    hslToHex(wrapHue(base.h + 120), base.s, base.l),
    hslToHex(wrapHue(base.h - 120), base.s, base.l),
    hslToHex(wrapHue(base.h + 120), base.s, clamp(base.l + 10)),
    hslToHex(wrapHue(base.h - 120), base.s, clamp(base.l - 10)),
  ]

  const splitComplementary: string[] = [
    baseColor,
    hslToHex(wrapHue(base.h + 150), base.s, base.l),
    hslToHex(wrapHue(base.h + 210), base.s, base.l),
    hslToHex(wrapHue(base.h + 150), clamp(base.s - 10), clamp(base.l + 10)),
    hslToHex(wrapHue(base.h + 210), clamp(base.s + 10), clamp(base.l - 10)),
  ]

  return {
    complementary,
    analogous,
    triadic,
    'split-complementary': splitComplementary,
  }
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(Math.max(value, min), max)
}
