export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function normalizeAngleDiff(target: number, current: number): number {
  let diff = ((target - current) % 360 + 540) % 360 - 180
  return diff
}

export function dampFactor(vel: number, factor = 0.85, threshold = 0.05): number {
  const next = vel * factor
  return Math.abs(next) < threshold ? 0 : next
}
