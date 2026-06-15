import type { TrailPoint, TerrainData, TerrainVertex } from '../store/trailStore'

function latLonToXY(
  lat: number,
  lon: number,
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number },
  size: number
): { x: number; y: number } {
  const latRange = bounds.maxLat - bounds.minLat
  const lonRange = bounds.maxLon - bounds.minLon
  const x = ((lon - bounds.minLon) / lonRange) * size - size / 2
  const y = ((lat - bounds.minLat) / latRange) * size - size / 2
  return { x, y }
}

function generateTerrainHeight(
  x: number,
  y: number,
  baseElevations: Array<{ x: number; y: number; ele: number }>,
  minEle: number,
  maxEle: number
): number {
  if (baseElevations.length === 0) {
    const noise = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 2 +
      Math.sin(x * 0.8 + 1.5) * Math.cos(y * 0.6 + 0.8) * 1
    return (minEle + maxEle) / 2 + noise
  }

  let totalWeight = 0
  let weightedSum = 0
  const radius = 4

  for (const pt of baseElevations) {
    const dist = Math.sqrt((x - pt.x) ** 2 + (y - pt.y) ** 2)
    if (dist < radius) {
      const weight = 1 - dist / radius
      weightedSum += pt.ele * weight
      totalWeight += weight
    }
  }

  if (totalWeight > 0) {
    const base = weightedSum / totalWeight
    const noise = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 1.5 +
      Math.sin(x * 1.2 + 2) * Math.cos(y * 0.9 + 1) * 0.8
    return base + noise
  }

  const avgEle = baseElevations.reduce((sum, p) => sum + p.ele, 0) / baseElevations.length
  const noise = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 3 +
    Math.sin(x * 0.8 + 1.5) * Math.cos(y * 0.6 + 0.8) * 1.5
  return avgEle + noise
}

export async function loadTerrain(trailPoints: TrailPoint[]): Promise<TerrainData> {
  if (trailPoints.length === 0) {
    return {
      vertices: [],
      width: 0,
      height: 0,
      minEle: 0,
      maxEle: 0,
      bounds: { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 },
    }
  }

  const minLat = Math.min(...trailPoints.map((p) => p.lat))
  const maxLat = Math.max(...trailPoints.map((p) => p.lat))
  const minLon = Math.min(...trailPoints.map((p) => p.lon))
  const maxLon = Math.max(...trailPoints.map((p) => p.lon))
  const minEle = Math.min(...trailPoints.map((p) => p.ele))
  const maxEle = Math.max(...trailPoints.map((p) => p.ele))

  const bounds = { minLat, maxLat, minLon, maxLon }
  const size = 20
  const resolution = 1
  const gridSize = Math.floor(size / resolution) + 1

  const baseElevations: Array<{ x: number; y: number; ele: number }> = []
  for (const pt of trailPoints) {
    const { x, y } = latLonToXY(pt.lat, pt.lon, bounds, size)
    baseElevations.push({ x, y, ele: pt.ele })
  }

  const vertices: TerrainVertex[] = []
  let terrainMinEle = Infinity
  let terrainMaxEle = -Infinity

  for (let j = 0; j < gridSize; j++) {
    for (let i = 0; i < gridSize; i++) {
      const x = -size / 2 + i * resolution
      const y = -size / 2 + j * resolution
      const z = generateTerrainHeight(x, y, baseElevations, minEle, maxEle)

      if (z < terrainMinEle) terrainMinEle = z
      if (z > terrainMaxEle) terrainMaxEle = z

      vertices.push({ x, y, z })
    }
  }

  return {
    vertices,
    width: gridSize,
    height: gridSize,
    minEle: terrainMinEle,
    maxEle: terrainMaxEle,
    bounds,
  }
}

export function projectTrailToScene(
  trailPoints: TrailPoint[],
  terrainData: TerrainData
): Array<{ x: number; y: number; z: number }> {
  const { bounds } = terrainData
  const size = 20

  return trailPoints.map((pt) => {
    const latRange = bounds.maxLat - bounds.minLat
    const lonRange = bounds.maxLon - bounds.minLon
    const x = ((pt.lon - bounds.minLon) / lonRange) * size - size / 2
    const y = ((pt.lat - bounds.minLat) / latRange) * size - size / 2

    const eleRange = terrainData.maxEle - terrainData.minEle || 1
    const normalizedEle = (pt.ele - terrainData.minEle) / eleRange
    const z = normalizedEle * 5

    return { x, y, z }
  })
}
