export type PlantType = 'ginkgo' | 'rose' | 'waterLily'

export interface PlantConfig {
  name: string
  cellCount: { min: number; max: number }
  stomataDensity: number
  wallThickness: number
  wallHeight: number
  baseColor: [number, number, number]
  wallColor: [number, number, number]
  cellIrregularity: number
}

export interface CellData {
  id: number
  vertices: [number, number, number][]
  center: [number, number, number]
  area: number
  perimeter: number
  hasStomata: boolean
  stomataPosition?: [number, number, number]
  stomataRadius?: number
}

export interface TerrainData {
  vertices: Float32Array
  colors: Float32Array
  normals: Float32Array
  indices: Uint32Array
  cells: CellData[]
  cellIdMap: Map<number, number>
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
}

export const PLANT_CONFIGS: Record<PlantType, PlantConfig> = {
  ginkgo: {
    name: '银杏',
    cellCount: { min: 500, max: 600 },
    stomataDensity: 0.05,
    wallThickness: 0.12,
    wallHeight: 1.5,
    baseColor: [0.55, 0.75, 0.45],
    wallColor: [0.85, 0.95, 0.7],
    cellIrregularity: 0.35,
  },
  rose: {
    name: '玫瑰',
    cellCount: { min: 600, max: 700 },
    stomataDensity: 0.08,
    wallThickness: 0.15,
    wallHeight: 2.2,
    baseColor: [0.4, 0.65, 0.4],
    wallColor: [0.75, 0.85, 0.6],
    cellIrregularity: 0.5,
  },
  waterLily: {
    name: '睡莲',
    cellCount: { min: 700, max: 800 },
    stomataDensity: 0.12,
    wallThickness: 0.1,
    wallHeight: 0.8,
    baseColor: [0.5, 0.7, 0.55],
    wallColor: [0.8, 0.9, 0.75],
    cellIrregularity: 0.25,
  },
}

const seededRandom = (seed: number): (() => number) => {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const interpolateTerrainData = (
  from: TerrainData,
  to: TerrainData,
  t: number
): TerrainData => {
  const clampedT = Math.max(0, Math.min(1, t))
  const newVertices = new Float32Array(from.vertices.length)
  const minLen = Math.min(from.vertices.length, to.vertices.length)

  for (let i = 0; i < minLen; i++) {
    newVertices[i] = lerp(from.vertices[i], to.vertices[i], clampedT)
  }
  if (to.vertices.length > minLen) {
    for (let i = minLen; i < to.vertices.length; i++) {
      newVertices[i] = to.vertices[i]
    }
  } else if (from.vertices.length > minLen) {
    for (let i = minLen; i < from.vertices.length; i++) {
      newVertices[i] = from.vertices[i] * (1 - clampedT)
    }
  }

  return {
    ...to,
    vertices: newVertices,
    colors: clampedT < 0.5 ? from.colors : to.colors,
    normals: clampedT < 0.5 ? from.normals : to.normals,
    indices: clampedT < 0.5 ? from.indices : to.indices,
    cells: clampedT < 0.5 ? from.cells : to.cells,
    cellIdMap: clampedT < 0.5 ? from.cellIdMap : to.cellIdMap,
  }
}

const generateVoronoiCells = (
  count: number,
  width: number,
  height: number,
  random: () => number,
  irregularity: number
): { x: number; y: number }[] => {
  const cols = Math.ceil(Math.sqrt(count * (width / height)))
  const rows = Math.ceil(count / cols)
  const cellW = width / cols
  const cellH = height / rows
  const points: { x: number; y: number }[] = []

  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const baseX = (col + 0.5) * cellW - width / 2
    const baseY = (row + 0.5) * cellH - height / 2
    const jitterX = (random() - 0.5) * cellW * irregularity * 2
    const jitterY = (random() - 0.5) * cellH * irregularity * 2
    points.push({
      x: Math.max(-width / 2 + cellW * 0.3, Math.min(width / 2 - cellW * 0.3, baseX + jitterX)),
      y: Math.max(-height / 2 + cellH * 0.3, Math.min(height / 2 - cellH * 0.3, baseY + jitterY)),
    })
  }
  return points
}

const computePolygonAroundPoint = (
  cx: number,
  cy: number,
  allPoints: { x: number; y: number }[],
  vertexCount: number,
  random: () => number,
  irregularity: number,
  width: number,
  height: number
): [number, number][] => {
  const distances = allPoints
    .map((p, idx) => ({
      idx,
      d: Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2),
    }))
    .filter((d) => d.d > 0.001)
    .sort((a, b) => a.d - b.d)

  const avgNeighborDist =
    distances.slice(1, Math.min(7, distances.length)).reduce((s, d) => s + d.d, 0) /
    Math.max(1, Math.min(6, distances.length - 1))

  const baseRadius = avgNeighborDist * 0.42
  const vertices: [number, number][] = []
  const angleStep = (Math.PI * 2) / vertexCount

  for (let i = 0; i < vertexCount; i++) {
    const angle = i * angleStep + random() * irregularity * 0.3
    const radiusVariation = 1 + (random() - 0.5) * irregularity
    const r = baseRadius * radiusVariation
    let vx = cx + Math.cos(angle) * r
    let vy = cy + Math.sin(angle) * r
    vx = Math.max(-width / 2 + 0.5, Math.min(width / 2 - 0.5, vx))
    vy = Math.max(-height / 2 + 0.5, Math.min(height / 2 - 0.5, vy))
    vertices.push([vx, vy])
  }
  return vertices
}

const computePolygonArea = (verts: [number, number][]): number => {
  let area = 0
  for (let i = 0; i < verts.length; i++) {
    const [x1, y1] = verts[i]
    const [x2, y2] = verts[(i + 1) % verts.length]
    area += x1 * y2 - x2 * y1
  }
  return Math.abs(area) / 2
}

const computePolygonPerimeter = (verts: [number, number][]): number => {
  let p = 0
  for (let i = 0; i < verts.length; i++) {
    const [x1, y1] = verts[i]
    const [x2, y2] = verts[(i + 1) % verts.length]
    p += Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  }
  return p
}

const pointInPolygon = (px: number, py: number, verts: [number, number][]): boolean => {
  let inside = false
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i][0],
      yi = verts[i][1]
    const xj = verts[j][0],
      yj = verts[j][1]
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 0.0001) + xi
    if (intersect) inside = !inside
  }
  return inside
}

export const generateTerrainData = (plantType: PlantType, seed: number = Date.now()): TerrainData => {
  const config = PLANT_CONFIGS[plantType]
  const random = seededRandom(seed)
  const width = 40
  const height = 30

  const count = Math.floor(
    config.cellCount.min + random() * (config.cellCount.max - config.cellCount.min)
  )

  const cellCenters = generateVoronoiCells(count, width, height, random, config.cellIrregularity)

  const cells: CellData[] = []
  const finalVertices: [number, number, number][] = []
  const finalColors: [number, number, number][] = []
  const finalIndices: number[] = []
  const cellIdMap = new Map<number, number>()

  let vertexOffset = 0
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity

  for (let ci = 0; ci < cellCenters.length; ci++) {
    const center = cellCenters[ci]
    const vertexCount = Math.floor(5 + random() * 5)
    const poly2D = computePolygonAroundPoint(
      center.x,
      center.y,
      cellCenters,
      vertexCount,
      random,
      config.cellIrregularity,
      width,
      height
    )

    const hasStomata = random() < config.stomataDensity
    let stomataPos: [number, number, number] | undefined
    let stomataRadius: number | undefined

    if (hasStomata) {
      stomataRadius = 1.5 + random() * 2.5
      stomataPos = [center.x, center.y, -0.5]
    }

    const cellVertices: [number, number, number][] = []
    const cellColors: [number, number, number][] = []

    const cx = poly2D.reduce((s, v) => s + v[0], 0) / poly2D.length
    const cy = poly2D.reduce((s, v) => s + v[1], 0) / poly2D.length

    cellVertices.push([cx, cy, config.wallHeight * 0.3])
    cellColors.push([...config.baseColor] as [number, number, number])

    for (let i = 0; i < poly2D.length; i++) {
      const [px, py] = poly2D[i]
      const [nx, ny] = poly2D[(i + 1) % poly2D.length]
      const midX = (px + nx) / 2
      const midY = (py + ny) / 2

      cellVertices.push([px, py, config.wallHeight + (random() - 0.5) * 0.3])
      cellColors.push([...config.wallColor] as [number, number, number])

      cellVertices.push([midX, midY, config.wallHeight * 1.1 + (random() - 0.5) * 0.2])
      cellColors.push([
        (config.wallColor[0] + config.baseColor[0]) / 2,
        (config.wallColor[1] + config.baseColor[1]) / 2,
        (config.wallColor[2] + config.baseColor[2]) / 2,
      ])
    }

    if (hasStomata && stomataPos && stomataRadius) {
      const guardCount = 12
      for (let i = 0; i < guardCount; i++) {
        const angle = (i / guardCount) * Math.PI * 2
        const gx = stomataPos[0] + Math.cos(angle) * stomataRadius
        const gy = stomataPos[1] + Math.sin(angle) * stomataRadius
        cellVertices.push([gx, gy, config.wallHeight * 0.6])
        cellColors.push([0.3, 0.25, 0.15])
      }
    }

    for (const [vx, vy, vz] of cellVertices) {
      minX = Math.min(minX, vx)
      maxX = Math.max(maxX, vx)
      minY = Math.min(minY, vy)
      maxY = Math.max(maxY, vy)
      minZ = Math.min(minZ, vz)
      maxZ = Math.max(maxZ, vz)
      finalVertices.push([vx, vy, vz])
    }
    for (const c of cellColors) finalColors.push(c)

    const innerCount = poly2D.length * 2
    for (let i = 0; i < innerCount; i++) {
      const i1 = 1 + i
      const i2 = 1 + ((i + 1) % innerCount)
      finalIndices.push(vertexOffset + 0, vertexOffset + i1, vertexOffset + i2)
      cellIdMap.set(finalIndices.length / 3 - 1, ci)
    }

    if (hasStomata && stomataPos && stomataRadius) {
      const guardStart = vertexOffset + innerCount + 1
      for (let i = 0; i < 12; i++) {
        const next = (i + 1) % 12
        finalIndices.push(vertexOffset + 0, guardStart + i, guardStart + next)
        cellIdMap.set(finalIndices.length / 3 - 1, ci)
      }
    }

    const cellArea = computePolygonArea(poly2D)
    const cellPerimeter = computePolygonPerimeter(poly2D)

    cells.push({
      id: ci,
      vertices: cellVertices,
      center: [cx, cy, config.wallHeight * 0.3],
      area: cellArea,
      perimeter: cellPerimeter,
      hasStomata,
      stomataPosition: stomataPos,
      stomataRadius,
    })

    vertexOffset += cellVertices.length
  }

  const vertexCount = finalVertices.length
  const verticesArr = new Float32Array(vertexCount * 3)
  const colorsArr = new Float32Array(vertexCount * 3)
  const normalsArr = new Float32Array(vertexCount * 3)

  for (let i = 0; i < vertexCount; i++) {
    verticesArr[i * 3] = finalVertices[i][0]
    verticesArr[i * 3 + 1] = finalVertices[i][2]
    verticesArr[i * 3 + 2] = -finalVertices[i][1]
    colorsArr[i * 3] = finalColors[i][0]
    colorsArr[i * 3 + 1] = finalColors[i][1]
    colorsArr[i * 3 + 2] = finalColors[i][2]
    normalsArr[i * 3] = 0
    normalsArr[i * 3 + 1] = 1
    normalsArr[i * 3 + 2] = 0
  }

  const indicesArr = new Uint32Array(finalIndices)

  for (let i = 0; i < indicesArr.length; i += 3) {
    const i0 = indicesArr[i]
    const i1 = indicesArr[i + 1]
    const i2 = indicesArr[i + 2]
    const ax = verticesArr[i1 * 3] - verticesArr[i0 * 3]
    const ay = verticesArr[i1 * 3 + 1] - verticesArr[i0 * 3 + 1]
    const az = verticesArr[i1 * 3 + 2] - verticesArr[i0 * 3 + 2]
    const bx = verticesArr[i2 * 3] - verticesArr[i0 * 3]
    const by = verticesArr[i2 * 3 + 1] - verticesArr[i0 * 3 + 1]
    const bz = verticesArr[i2 * 3 + 2] - verticesArr[i0 * 3 + 2]
    const nx = ay * bz - az * by
    const ny = az * bx - ax * bz
    const nz = ax * by - ay * bx
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
    normalsArr[i0 * 3] += nx / len
    normalsArr[i0 * 3 + 1] += ny / len
    normalsArr[i0 * 3 + 2] += nz / len
    normalsArr[i1 * 3] += nx / len
    normalsArr[i1 * 3 + 1] += ny / len
    normalsArr[i1 * 3 + 2] += nz / len
    normalsArr[i2 * 3] += nx / len
    normalsArr[i2 * 3 + 1] += ny / len
    normalsArr[i2 * 3 + 2] += nz / len
  }

  for (let i = 0; i < vertexCount; i++) {
    const l =
      Math.sqrt(
        normalsArr[i * 3] ** 2 + normalsArr[i * 3 + 1] ** 2 + normalsArr[i * 3 + 2] ** 2
      ) || 1
    normalsArr[i * 3] /= l
    normalsArr[i * 3 + 1] /= l
    normalsArr[i * 3 + 2] /= l
  }

  return {
    vertices: verticesArr,
    colors: colorsArr,
    normals: normalsArr,
    indices: indicesArr,
    cells,
    cellIdMap,
    bounds: { minX, maxX, minY, maxZ: minZ, minZ: maxZ, maxY },
  }
}
