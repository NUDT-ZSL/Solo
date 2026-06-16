import * as THREE from 'three'
import { StarData } from './stars'

export interface ConstellationData {
  id: string
  name: string
  nameEn: string
  description: string
  mythology: string
  mainStars: string[]
  starIndices: number[]
  lines: number[][]
}

export interface ConstellationLine {
  startIndex: number
  endIndex: number
  constellationId: string
}

export interface ConstellationSystem {
  group: THREE.Group
  lines: THREE.LineSegments[]
  haloParticles: THREE.Points
  highlight: (constellationId: string | null) => void
  getConstellationByLine: (line: THREE.LineSegments) => ConstellationData | null
  update: (delta: number) => void
  constellations: ConstellationData[]
  lineToConstellation: Map<THREE.LineSegments, ConstellationData>
  raycastTargets: THREE.LineSegments[]
}

class UnionFind {
  private parent: number[]
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)
  }
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x])
    }
    return this.parent[x]
  }
  union(x: number, y: number): boolean {
    const px = this.find(x)
    const py = this.find(y)
    if (px === py) return false
    this.parent[px] = py
    return true
  }
}

function minimumSpanningTree(
  vertices: { index: number; pos: THREE.Vector3 }[],
  maxDistance: number
): Array<[number, number]> {
  if (vertices.length < 2) return []
  const edges: Array<{ a: number; b: number; dist: number }> = []
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const dist = vertices[i].pos.distanceTo(vertices[j].pos)
      if (dist <= maxDistance) {
        edges.push({ a: i, b: j, dist })
      }
    }
  }
  edges.sort((a, b) => a.dist - b.dist)
  const uf = new UnionFind(vertices.length)
  const result: Array<[number, number]> = []
  for (const edge of edges) {
    if (uf.union(edge.a, edge.b)) {
      result.push([vertices[edge.a].index, vertices[edge.b].index])
    }
    if (result.length === vertices.length - 1) break
  }
  return result
}

export async function loadConstellationData(): Promise<ConstellationData[]> {
  try {
    const response = await fetch('/data/constellations.json')
    if (!response.ok) throw new Error('Failed to load constellation data')
    const data = await response.json()
    return data.constellations as ConstellationData[]
  } catch {
    return getFallbackConstellations()
  }
}

function getFallbackConstellations(): ConstellationData[] {
  return [
    {
      id: 'orion',
      name: '猎户座',
      nameEn: 'Orion',
      description: '猎户座是赤道带星座之一，其北部沉浸在银河之中。',
      mythology: '在希腊神话中，猎户座是海神波塞冬的儿子奥利翁，他是一位英俊而强壮的猎人。宙斯将奥利翁升上天空成为猎户座。',
      mainStars: ['参宿四', '参宿七', '参宿五', '参宿二', '参宿一'],
      starIndices: [0, 1, 2, 3, 4, 5, 6],
      lines: []
    }
  ]
}

function createHaloParticles(count: number): THREE.Points {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = 0
    positions[i * 3 + 1] = 0
    positions[i * 3 + 2] = 0
    const color = new THREE.Color('#FFD54F')
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
    sizes[i] = 1.5 + Math.random() * 2
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255, 213, 79, 1)')
  gradient.addColorStop(0.4, 'rgba(255, 213, 79, 0.4)')
  gradient.addColorStop(1, 'rgba(255, 213, 79, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  const material = new THREE.PointsMaterial({
    size: 3,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    map: texture,
    alphaTest: 0.01,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  return new THREE.Points(geometry, material)
}

export function createConstellationSystem(
  constellationData: ConstellationData[],
  starsData: StarData[]
): ConstellationSystem {
  const group = new THREE.Group()
  const lines: THREE.LineSegments[] = []
  const lineToConstellation = new Map<THREE.LineSegments, ConstellationData>()
  const raycastTargets: THREE.LineSegments[] = []

  const brightStars = starsData
    .map((s, i) => ({ index: i, data: s, pos: new THREE.Vector3(s.x, s.y, s.z) }))
    .filter(s => s.data.magnitude <= 2)

  const autoMstEdges = minimumSpanningTree(
    brightStars.map(s => ({ index: s.index, pos: s.pos })),
    30
  )

  const allEdges: Map<string, { starA: number; starB: number; constellation: ConstellationData | null }> = new Map()

  autoMstEdges.forEach(([a, b]) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    if (!allEdges.has(key)) {
      allEdges.set(key, { starA: a, starB: b, constellation: null })
    }
  })

  constellationData.forEach(constellation => {
    let edgesToUse = constellation.lines && constellation.lines.length > 0
      ? constellation.lines.map(l => [l[0], l[1]] as [number, number])
      : minimumSpanningTree(
          constellation.starIndices
            .filter(idx => starsData[idx])
            .map(idx => ({ index: idx, pos: new THREE.Vector3(starsData[idx].x, starsData[idx].y, starsData[idx].z) })),
          500
        )

    edgesToUse.forEach(([a, b]) => {
      if (!starsData[a] || !starsData[b]) return
      const key = a < b ? `${a}-${b}` : `${b}-${a}`
      allEdges.set(key, { starA: a, starB: b, constellation })
    })
  })

  const defaultColor = new THREE.Color('#90CAF9')
  const highlightColor = new THREE.Color('#FFD54F')

  const edgePositions: number[] = []
  const edgeColors: number[] = []
  const edgeMetadata: Array<{ starA: number; starB: number; constellation: ConstellationData | null }> = []

  allEdges.forEach(edge => {
    edgeMetadata.push(edge)
  })

  const segmentGroup = new THREE.Group()

  edgeMetadata.forEach(meta => {
    const starA = starsData[meta.starA]
    const starB = starsData[meta.starB]
    if (!starA || !starB) return

    const positions = new Float32Array([
      starA.x, starA.y, starA.z,
      starB.x, starB.y, starB.z
    ])
    const colors = new Float32Array([
      defaultColor.r, defaultColor.g, defaultColor.b,
      defaultColor.r, defaultColor.g, defaultColor.b
    ])
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.LineBasicMaterial({
      color: defaultColor,
      transparent: true,
      opacity: 0.45,
      vertexColors: true,
      linewidth: 1
    })

    const line = new THREE.LineSegments(geometry, material)
    line.userData = {
      starA: meta.starA,
      starB: meta.starB,
      constellation: meta.constellation,
      defaultColor: defaultColor.clone(),
      highlightColor: highlightColor.clone(),
      highlighted: false
    }

    lines.push(line)
    raycastTargets.push(line)
    if (meta.constellation) {
      lineToConstellation.set(line, meta.constellation)
    }
    segmentGroup.add(line)
  })

  group.add(segmentGroup)

  const haloParticles = createHaloParticles(200)
  group.add(haloParticles)

  let highlightedConstellation: ConstellationData | null = null
  let haloTime = 0

  return {
    group,
    lines,
    haloParticles,
    constellations: constellationData,
    lineToConstellation,
    raycastTargets,
    highlight(constellationId: string | null) {
      highlightedConstellation = constellationId
        ? constellationData.find(c => c.id === constellationId) || null
        : null

      lines.forEach(line => {
        const lineConst = line.userData.constellation as ConstellationData | null
        const shouldHighlight = highlightedConstellation && lineConst && lineConst.id === highlightedConstellation.id
        line.userData.highlighted = shouldHighlight
        const material = line.material as THREE.LineBasicMaterial
        const colorAttr = line.geometry.getAttribute('color') as THREE.BufferAttribute
        if (shouldHighlight) {
          material.opacity = 1
          for (let i = 0; i < 2; i++) {
            colorAttr.array[i * 3] = highlightColor.r
            colorAttr.array[i * 3 + 1] = highlightColor.g
            colorAttr.array[i * 3 + 2] = highlightColor.b
          }
          const positions = line.geometry.getAttribute('position').array as Float32Array
          const mid = new THREE.Vector3(
            (positions[0] + positions[3]) / 2,
            (positions[1] + positions[4]) / 2,
            (positions[2] + positions[5]) / 2
          )
          const haloGeom = haloParticles.geometry
          const haloPos = haloGeom.getAttribute('position') as THREE.BufferAttribute
          for (let i = 0; i < 50; i++) {
            const idx = (line.id * 50 + i) % (haloPos.array.length / 3)
            const angle = Math.random() * Math.PI * 2
            const radius = 5 + Math.random() * 5
            haloPos.array[idx * 3] = mid.x + Math.cos(angle) * radius
            haloPos.array[idx * 3 + 1] = mid.y + Math.sin(angle) * radius
            haloPos.array[idx * 3 + 2] = mid.z + (Math.random() - 0.5) * radius
          }
          haloPos.needsUpdate = true
        } else {
          material.opacity = 0.45
          for (let i = 0; i < 2; i++) {
            colorAttr.array[i * 3] = defaultColor.r
            colorAttr.array[i * 3 + 1] = defaultColor.g
            colorAttr.array[i * 3 + 2] = defaultColor.b
          }
        }
        colorAttr.needsUpdate = true
      })

      const haloMaterial = haloParticles.material as THREE.PointsMaterial
      haloMaterial.opacity = highlightedConstellation ? 0.8 : 0
    },
    getConstellationByLine(line: THREE.LineSegments): ConstellationData | null {
      return line.userData.constellation || null
    },
    update(delta: number) {
      haloTime += delta
      const haloMaterial = haloParticles.material as THREE.PointsMaterial
      if (highlightedConstellation) {
        haloMaterial.opacity = 0.6 + 0.2 * Math.sin(haloTime * 3)
        const haloGeom = haloParticles.geometry
        const haloPos = haloGeom.getAttribute('position') as THREE.BufferAttribute
        for (let i = 0; i < haloPos.array.length / 3; i++) {
          haloPos.array[i * 3] += (Math.random() - 0.5) * 0.3
          haloPos.array[i * 3 + 1] += (Math.random() - 0.5) * 0.3
          haloPos.array[i * 3 + 2] += (Math.random() - 0.5) * 0.3
        }
        haloPos.needsUpdate = true
      }
    }
  }
}
