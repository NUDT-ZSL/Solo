import * as THREE from 'three'

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1))
}

export function randomPositionInSphere(radius: number): THREE.Vector3 {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const r = Math.cbrt(Math.random()) * radius
  
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  )
}

export function bezierInterpolation(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  t: number
): THREE.Vector3 {
  const mt = 1 - t
  const mt2 = mt * mt
  const t2 = t * t
  
  return new THREE.Vector3(
    mt2 * p0.x + 2 * mt * t * p1.x + t2 * p2.x,
    mt2 * p0.y + 2 * mt * t * p1.y + t2 * p2.y,
    mt2 * p0.z + 2 * mt * t * p1.z + t2 * p2.z
  )
}

export function generateBezierPath(
  start: THREE.Vector3,
  end: THREE.Vector3,
  offsetRange: { min: number; max: number } = { min: 10, max: 30 }
): { p0: THREE.Vector3; p1: THREE.Vector3; p2: THREE.Vector3 } {
  const mid = start.clone().add(end).multiplyScalar(0.5)
  const offset = new THREE.Vector3(
    randomRange(offsetRange.min, offsetRange.max) * (Math.random() > 0.5 ? 1 : -1),
    randomRange(offsetRange.min, offsetRange.max) * (Math.random() > 0.5 ? 1 : -1),
    randomRange(offsetRange.min, offsetRange.max) * (Math.random() > 0.5 ? 1 : -1)
  )
  const controlPoint = mid.clone().add(offset)
  
  return { p0: start.clone(), p1: controlPoint, p2: end.clone() }
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 }
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

export function colorInterpolation(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  const clampedT = Math.max(0, Math.min(1, t))
  
  return rgbToHex(
    c1.r + (c2.r - c1.r) * clampedT,
    c1.g + (c2.g - c1.g) * clampedT,
    c1.b + (c2.b - c1.b) * clampedT
  )
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function distance(a: THREE.Vector3, b: THREE.Vector3): number {
  return a.distanceTo(b)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}
