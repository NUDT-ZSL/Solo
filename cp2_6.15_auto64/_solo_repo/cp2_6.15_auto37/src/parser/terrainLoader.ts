import type { TrailPoint, TerrainData, TerrainVertex } from '../store/trailStore'

const ELEVATION_API_URL = 'https://api.open-elevation.com/api/v1/lookup'
const MAX_BATCH_SIZE = 100

function latLonToXY(
  lat: number,
  lon: number,
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number },
  size: number
): { x: number; y: number } {
  const latRange = bounds.maxLat - bounds.minLat || 0.001
  const lonRange = bounds.maxLon - bounds.minLon || 0.001
  const x = ((lon - bounds.minLon) / lonRange) * size - size / 2
  const y = ((lat - bounds.minLat) / latRange) * size - size / 2
  return { x, y }
}

function xyToLatLon(
  x: number,
  y: number,
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number },
  size: number
): { lat: number; lon: number } {
  const latRange = bounds.maxLat - bounds.minLat || 0.001
  const lonRange = bounds.maxLon - bounds.minLon || 0.001
  const lon = ((x + size / 2) / size) * lonRange + bounds.minLon
  const lat = ((y + size / 2) / size) * latRange + bounds.minLat
  return { lat, lon }
}

async function fetchElevationBatch(
  points: Array<{ latitude: number; longitude: number }>
): Promise<Array<{ latitude: number; longitude: number; elevation: number }>> {
  try {
    const response = await fetch(ELEVATION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ locations: points }),
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.warn('Elevation API failed, using fallback:', error)
    return points.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      elevation: generateFallbackElevation(p.latitude, p.longitude),
    }))
  }
}

function generateFallbackElevation(lat: number, lon: number): number {
  const seed = lat * 1000 + lon * 1000
  const noise1 = Math.sin(seed * 0.01) * Math.cos(seed * 0.015) * 50
  const noise2 = Math.sin(seed * 0.03 + 1.5) * Math.cos(seed * 0.02 + 0.8) * 25
  const noise3 = Math.sin(seed * 0.07 + 3) * Math.cos(seed * 0.05 + 2) * 10
  return 100 + noise1 + noise2 + noise3
}

async function fetchTerrainElevations(
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number },
  gridSize: number,
  size: number
): Promise<Map<string, number>> {
  const samples: Array<{ latitude: number; longitude: number }> = []
  const resolution = size / (gridSize - 1)

  const sampleStep = Math.max(1, Math.floor(gridSize / 8))
  for (let j = 0; j < gridSize; j += sampleStep) {
    for (let i = 0; i < gridSize; i += sampleStep) {
      const x = -size / 2 + i * resolution
      const y = -size / 2 + j * resolution
      const { lat, lon } = xyToLatLon(x, y, bounds, size)
      samples.push({ latitude: lat, longitude: lon })
    }
  }

  for (let j = 0; j < gridSize; j += gridSize - 1) {
    for (let i = 0; i < gridSize; i += gridSize - 1) {
      const x = -size / 2 + i * resolution
      const y = -size / 2 + j * resolution
      const { lat, lon } = xyToLatLon(x, y, bounds, size)
      const exists = samples.some(
        (s) => Math.abs(s.latitude - lat) < 0.00001 && Math.abs(s.longitude - lon) < 0.00001
      )
      if (!exists) {
        samples.push({ latitude: lat, longitude: lon })
      }
    }
  }

  const elevationMap = new Map<string, number>()
  const batches: Array<Array<{ latitude: number; longitude: number }>> = []

  for (let i = 0; i < samples.length; i += MAX_BATCH_SIZE) {
    batches.push(samples.slice(i, i + MAX_BATCH_SIZE))
  }

  const results = await Promise.all(
    batches.map((batch) => fetchElevationBatch(batch))
  )

  for (const batchResult of results) {
    for (const r of batchResult) {
      const key = `${r.latitude.toFixed(6)},${r.longitude.toFixed(6)}`
      elevationMap.set(key, r.elevation)
    }
  }

  return elevationMap
}

function interpolateElevation(
  x: number,
  y: number,
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number },
  size: number,
  elevationMap: Map<string, number>,
  trailElevations: Array<{ x: number; y: number; ele: number }>
): number {
  const { lat, lon } = xyToLatLon(x, y, bounds, size)
  const key = `${lat.toFixed(6)},${lon.toFixed(6)}`

  if (elevationMap.has(key)) {
    return elevationMap.get(key)!
  }

  let minDist = Infinity
  let nearestElev = 0

  for (const [k, elev] of elevationMap) {
    const [sLat, sLon] = k.split(',').map(Number)
    const dLat = (sLat - lat) * 111000
    const dLon = (sLon - lon) * 111000 * Math.cos(lat * Math.PI / 180)
    const dist = Math.sqrt(dLat * dLat + dLon * dLon)

    if (dist < minDist) {
      minDist = dist
      nearestElev = elev
    }
  }

  let trailInfluence = 0
  let trailWeight = 0
  for (const tp of trailElevations) {
    const dist = Math.sqrt((x - tp.x) ** 2 + (y - tp.y) ** 2)
    if (dist < 3) {
      const w = 1 - dist / 3
      trailInfluence += tp.ele * w
      trailWeight += w
    }
  }

  if (trailWeight > 0 && minDist < 10000) {
    const t = Math.min(1, trailWeight)
    return nearestElev * (1 - t) + (trailInfluence / trailWeight) * t
  }

  return nearestElev
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

  const latPad = (maxLat - minLat) * 0.2 || 0.01
  const lonPad = (maxLon - minLon) * 0.2 || 0.01

  const bounds = {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLon: minLon - lonPad,
    maxLon: maxLon + lonPad,
  }

  const size = 20
  const resolution = 1
  const gridSize = Math.floor(size / resolution) + 1

  const trailElevations: Array<{ x: number; y: number; ele: number }> = []
  for (const pt of trailPoints) {
    const { x, y } = latLonToXY(pt.lon, pt.lat, bounds, size)
    trailElevations.push({ x, y, ele: pt.ele })
  }

  const elevationMap = await fetchTerrainElevations(bounds, gridSize, size)

  const vertices: TerrainVertex[] = []
  let terrainMinEle = Infinity
  let terrainMaxEle = -Infinity

  for (let j = 0; j < gridSize; j++) {
    for (let i = 0; i < gridSize; i++) {
      const x = -size / 2 + i * resolution
      const y = -size / 2 + j * resolution
      const z = interpolateElevation(x, y, bounds, size, elevationMap, trailElevations)

      if (z < terrainMinEle) terrainMinEle = z
      if (z > terrainMaxEle) terrainMaxEle = z

      vertices.push({ x, y, z })
    }
  }

  if (terrainMaxEle - terrainMinEle < 10) {
    terrainMaxEle = terrainMinEle + 20
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
    const latRange = bounds.maxLat - bounds.minLat || 0.001
    const lonRange = bounds.maxLon - bounds.minLon || 0.001
    const x = ((pt.lon - bounds.minLon) / lonRange) * size - size / 2
    const y = ((pt.lat - bounds.minLat) / latRange) * size - size / 2

    const eleRange = terrainData.maxEle - terrainData.minEle || 1
    const normalizedEle = Math.max(0, Math.min(1, (pt.ele - terrainData.minEle) / eleRange))
    const z = normalizedEle * 5

    return { x, y, z }
  })
}
