export interface FragmentData {
  id: string
  x: number
  y: number
  rotation: number
  scale: number
  vertices: number[][]
  hue: number
  opacity: number
  reflectIntensity: number
  generation: number
  autoRotate: boolean
  rotateSpeed: number
  birthTime: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  hue: number
  size: number
}

export interface StarPoint {
  x: number
  y: number
  size: number
  opacity: number
  speed: number
  twinklePhase: number
  twinkleSpeed: number
}

export interface ViewState {
  offsetX: number
  offsetY: number
  zoom: number
  targetZoom: number
  targetOffsetX: number
  targetOffsetY: number
}

export interface ReflectedColor {
  h: number
  s: number
  l: number
}

let _idCounter = 0

export function generateId(): string {
  _idCounter++
  return `frag_${Date.now()}_${_idCounter}`
}

export function createRandomVertices(sides?: number, baseRadius?: number): number[][] {
  const numSides = sides ?? Math.floor(Math.random() * 4) + 4
  const radius = baseRadius ?? 40 + Math.random() * 30
  const vertices: number[][] = []
  for (let i = 0; i < numSides; i++) {
    const angle = (Math.PI * 2 * i) / numSides + (Math.random() - 0.5) * 0.4
    const r = radius * (0.6 + Math.random() * 0.4)
    vertices.push([Math.cos(angle) * r, Math.sin(angle) * r])
  }
  return vertices
}

export function createFragment(
  x: number,
  y: number,
  generation: number = 0,
  parentHue?: number
): FragmentData {
  const baseRadius = Math.max(15, 50 - generation * 8)
  const hue = parentHue != null
    ? (parentHue + 30 + Math.random() * 60) % 360
    : Math.random() * 360
  return {
    id: generateId(),
    x,
    y,
    rotation: Math.random() * Math.PI * 2,
    scale: Math.max(0.3, 1 - generation * 0.15),
    vertices: createRandomVertices(undefined, baseRadius),
    hue,
    opacity: Math.max(0.3, 0.8 - generation * 0.1),
    reflectIntensity: Math.max(0.2, 1 - generation * 0.15),
    generation,
    autoRotate: false,
    rotateSpeed: (Math.random() - 0.5) * 0.02,
    birthTime: performance.now(),
  }
}

export function splitFragment(fragment: FragmentData): FragmentData[] {
  const gen = fragment.generation + 1
  const offsetDist = 20 * fragment.scale
  const angle1 = fragment.rotation + Math.PI * 0.25
  const angle2 = fragment.rotation - Math.PI * 0.25
  return [
    createFragment(
      fragment.x + Math.cos(angle1) * offsetDist,
      fragment.y + Math.sin(angle1) * offsetDist,
      gen,
      fragment.hue
    ),
    createFragment(
      fragment.x + Math.cos(angle2) * offsetDist,
      fragment.y + Math.sin(angle2) * offsetDist,
      gen,
      fragment.hue + 15
    ),
  ]
}

export function isPointInFragment(
  fragment: FragmentData,
  px: number,
  py: number
): boolean {
  const dx = px - fragment.x
  const dy = py - fragment.y
  const cos = Math.cos(-fragment.rotation)
  const sin = Math.sin(-fragment.rotation)
  const lx = (dx * cos - dy * sin) / fragment.scale
  const ly = (dx * sin + dy * cos) / fragment.scale

  const verts = fragment.vertices
  let inside = false
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i][0], yi = verts[i][1]
    const xj = verts[j][0], yj = verts[j][1]
    if (((yi > ly) !== (yj > ly)) && (lx < (xj - xi) * (ly - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}
