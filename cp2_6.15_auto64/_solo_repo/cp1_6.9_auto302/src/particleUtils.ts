import * as THREE from 'three'

export interface ParticleData {
  position: THREE.Vector3
  color: THREE.Color
  size: number
  opacity: number
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function hslToColor(h: number, s: number, l: number): THREE.Color {
  const color = new THREE.Color()
  color.setHSL(h / 360, s / 100, l / 100)
  return color
}

export function randomButterflyColor(): THREE.Color {
  const h = randomRange(200, 320)
  return hslToColor(h, 80, 90)
}

export function randomFlowerColor(): THREE.Color {
  const h = randomRange(300, 360) < 330 ? randomRange(310, 340) : randomRange(30, 70)
  return hslToColor(h, 85, 75)
}

export function greenBudColor(): THREE.Color {
  return hslToColor(120, 60, 40)
}

export function goldColor(): THREE.Color {
  return hslToColor(45, 100, 65)
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpColor(c1: THREE.Color, c2: THREE.Color, t: number): THREE.Color {
  const r = lerp(c1.r, c2.r, t)
  const g = lerp(c1.g, c2.g, t)
  const bl = lerp(c1.b, c2.b, t)
  return new THREE.Color(r, g, bl)
}

export function bezierPoint(t: number, p0: THREE.Vector2, p1: THREE.Vector2, p2: THREE.Vector2, p3: THREE.Vector2): THREE.Vector2 {
  const mt = 1 - t
  const mt2 = mt * mt
  const mt3 = mt2 * mt
  const t2 = t * t
  const t3 = t2 * t
  const x = mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x
  const y = mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
  return new THREE.Vector2(x, y)
}

export function generateWingParticles(count: number, isLeft: boolean): Array<{ base: THREE.Vector2; size: number }> {
  const particles: Array<{ base: THREE.Vector2; size: number }> = []
  const sign = isLeft ? 1 : -1
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const p0 = new THREE.Vector2(0.1, 0)
    const p1 = new THREE.Vector2(1.5 * sign, 0.8 - t * 0.3)
    const p2 = new THREE.Vector2(2.2 * sign, 0.4 - t * 0.8)
    const p3 = new THREE.Vector2(0.8 * sign, -0.3 - t * 0.2)
    const point = bezierPoint(t, p0, p1, p2, p3)
    const size = 0.06 + (1 - t) * 0.09
    particles.push({ base: point, size })
  }
  return particles
}

export function generateFlowerParticles(count: number): Array<{ offset: THREE.Vector3; size: number; petalIndex: number; petalT: number }> {
  const particles: Array<{ offset: THREE.Vector3; size: number; petalIndex: number; petalT: number }> = []
  const petalCount = 6 + Math.floor(Math.random() * 3)
  const perPetal = Math.ceil(count / petalCount)
  for (let p = 0; p < petalCount; p++) {
    const angle = (p / petalCount) * Math.PI * 2
    for (let i = 0; i < perPetal && particles.length < count; i++) {
      const t = i / perPetal
      const dist = 0.15 + t * 0.9
      const spread = t * 0.35
      const offsetAngle = angle + (Math.random() - 0.5) * spread
      const x = Math.cos(offsetAngle) * dist + (Math.random() - 0.5) * 0.08
      const z = Math.sin(offsetAngle) * dist + (Math.random() - 0.5) * 0.08
      const y = (1 - t) * 0.15 + (Math.random() - 0.5) * 0.05
      particles.push({
        offset: new THREE.Vector3(x, y, z),
        size: 0.05 + (1 - t) * 0.15,
        petalIndex: p,
        petalT: t
      })
    }
  }
  return particles
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}
