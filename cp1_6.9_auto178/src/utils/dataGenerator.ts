export type CategoryLabel = 'social' | 'topic' | 'user' | 'trend'

export interface NodeData {
  id: number
  position: [number, number, number]
  initialPosition: [number, number, number]
  weight: number
  baseRadius: number
  category: CategoryLabel
  color: string
}

export interface FiberData {
  id: string
  nodeAId: number
  nodeBId: number
  colorA: string
  colorB: string
}

export interface Dataset {
  nodes: NodeData[]
  fibers: FiberData[]
}

export const CATEGORY_COLORS: Record<CategoryLabel, string> = {
  social: '#FF8C00',
  topic: '#00CED1',
  user: '#FF69B4',
  trend: '#7CFC00',
}

export const CATEGORY_LABELS: Record<CategoryLabel, string> = {
  social: '社交互动',
  topic: '话题热度',
  user: '用户群体',
  trend: '时间趋势',
}

const CATEGORIES: CategoryLabel[] = ['social', 'topic', 'user', 'trend']

const NODE_COUNT = 50
const DISTANCE_THRESHOLD = 0.8
const SPACE_RANGE = 4

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function mapWeightToRadius(weight: number): number {
  return lerp(0.3, 1.0, weight)
}

function distance3D(a: [number, number, number], b: [number, number, number]): number {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function generateSphericalPosition(radius: number): [number, number, number] {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const r = radius * Math.cbrt(Math.random())
  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
  ]
}

export function generateMockData(): Dataset {
  const nodes: NodeData[] = []

  for (let i = 0; i < NODE_COUNT; i++) {
    const position = generateSphericalPosition(SPACE_RANGE)
    const weight = Math.random()
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]

    nodes.push({
      id: i,
      position: [...position] as [number, number, number],
      initialPosition: [...position] as [number, number, number],
      weight,
      baseRadius: mapWeightToRadius(weight),
      category,
      color: CATEGORY_COLORS[category],
    })
  }

  const fibers: FiberData[] = []
  const fiberSet = new Set<string>()

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = distance3D(nodes[i].initialPosition, nodes[j].initialPosition)
      if (dist < DISTANCE_THRESHOLD && Math.random() > 0.3) {
        const key = `${i}-${j}`
        if (!fiberSet.has(key)) {
          fiberSet.add(key)
          fibers.push({
            id: key,
            nodeAId: i,
            nodeBId: j,
            colorA: nodes[i].color,
            colorB: nodes[j].color,
          })
        }
      }
    }
  }

  return { nodes, fibers }
}

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [255, 255, 255]
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
}

export function mixColors(colorA: string, colorB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(colorA)
  const [r2, g2, b2] = hexToRgb(colorB)
  const r = Math.round(lerp(r1, r2, t))
  const g = Math.round(lerp(g1, g2, t))
  const b = Math.round(lerp(b1, b2, t))
  return `rgb(${r}, ${g}, ${b})`
}
