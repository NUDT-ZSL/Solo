import * as THREE from 'three'

export enum RoadDirection {
  HORIZONTAL = 'H',
  VERTICAL = 'V'
}

export interface RoadSegment {
  id: string
  direction: RoadDirection
  start: THREE.Vector3
  end: THREE.Vector3
  length: number
  width: number
  gridIndex: { row: number; col: number; segmentIndex: number }
  adjacentSegments: string[]
  aabb: { minX: number; maxX: number; minZ: number; maxZ: number }
}

export interface Intersection {
  id: string
  position: THREE.Vector3
  size: number
  connectedRoads: string[]
}

export interface RoadGridData {
  segments: RoadSegment[]
  intersections: Intersection[]
  bounds: { min: THREE.Vector3; max: THREE.Vector3 }
  gridSize: number
  segmentLength: number
}

const SEGMENTS_PER_ROAD = 6

export function generateRoadGrid(
  gridSize: number = 6,
  segmentLength: number = 200,
  roadWidth: number = 8,
  intersectionSize: number = 15
): RoadGridData {
  const segments: RoadSegment[] = []
  const intersections: Intersection[] = []
  const segmentMap = new Map<string, RoadSegment>()

  const totalLength = segmentLength * SEGMENTS_PER_ROAD
  const offset = totalLength / 2

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const ix = -offset + col * segmentLength + segmentLength / 2
      const iz = -offset + row * segmentLength + segmentLength / 2
      const intersection: Intersection = {
        id: `int_${row}_${col}`,
        position: new THREE.Vector3(ix, 0.05, iz),
        size: intersectionSize,
        connectedRoads: []
      }
      intersections.push(intersection)
    }
  }

  const getIntersection = (row: number, col: number): Intersection | undefined => {
    return intersections.find(i => i.id === `int_${row}_${col}`)
  }

  for (let row = 0; row < gridSize; row++) {
    for (let segIdx = 0; segIdx < SEGMENTS_PER_ROAD; segIdx++) {
      const z = -offset + row * segmentLength + segmentLength / 2
      const startX = -offset + segIdx * segmentLength
      const endX = startX + segmentLength
      const start = new THREE.Vector3(startX, 0, z)
      const end = new THREE.Vector3(endX, 0, z)
      const id = `H_${row}_${segIdx}`
      const segment: RoadSegment = {
        id,
        direction: RoadDirection.HORIZONTAL,
        start,
        end,
        length: segmentLength,
        width: roadWidth,
        gridIndex: { row, col: 0, segmentIndex: segIdx },
        adjacentSegments: [],
        aabb: {
          minX: Math.min(startX, endX) - roadWidth / 2,
          maxX: Math.max(startX, endX) + roadWidth / 2,
          minZ: z - roadWidth / 2,
          maxZ: z + roadWidth / 2
        }
      }
      segments.push(segment)
      segmentMap.set(id, segment)
    }
  }

  for (let col = 0; col < gridSize; col++) {
    for (let segIdx = 0; segIdx < SEGMENTS_PER_ROAD; segIdx++) {
      const x = -offset + col * segmentLength + segmentLength / 2
      const startZ = -offset + segIdx * segmentLength
      const endZ = startZ + segmentLength
      const start = new THREE.Vector3(x, 0, startZ)
      const end = new THREE.Vector3(x, 0, endZ)
      const id = `V_${col}_${segIdx}`
      const segment: RoadSegment = {
        id,
        direction: RoadDirection.VERTICAL,
        start,
        end,
        length: segmentLength,
        width: roadWidth,
        gridIndex: { row: 0, col, segmentIndex: segIdx },
        adjacentSegments: [],
        aabb: {
          minX: x - roadWidth / 2,
          maxX: x + roadWidth / 2,
          minZ: Math.min(startZ, endZ) - roadWidth / 2,
          maxZ: Math.max(startZ, endZ) + roadWidth / 2
        }
      }
      segments.push(segment)
      segmentMap.set(id, segment)
    }
  }

  segments.forEach(seg => {
    const adjacents: string[] = []
    if (seg.direction === RoadDirection.HORIZONTAL) {
      const { row, segmentIndex } = seg.gridIndex
      if (segmentIndex > 0) adjacents.push(`H_${row}_${segmentIndex - 1}`)
      if (segmentIndex < SEGMENTS_PER_ROAD - 1) adjacents.push(`H_${row}_${segmentIndex + 1}`)
      const col1 = segmentIndex
      const col2 = segmentIndex + 1
      if (col1 < gridSize) adjacents.push(`V_${col1}_${row}`)
      if (col2 < gridSize && col2 >= 0) adjacents.push(`V_${col2}_${row}`)
    } else {
      const { col, segmentIndex } = seg.gridIndex
      if (segmentIndex > 0) adjacents.push(`V_${col}_${segmentIndex - 1}`)
      if (segmentIndex < SEGMENTS_PER_ROAD - 1) adjacents.push(`V_${col}_${segmentIndex + 1}`)
      const row1 = segmentIndex
      const row2 = segmentIndex + 1
      if (row1 < gridSize) adjacents.push(`H_${row1}_${col}`)
      if (row2 < gridSize && row2 >= 0) adjacents.push(`H_${row2}_${col}`)
    }
    seg.adjacentSegments = adjacents.filter(id => segmentMap.has(id))
  })

  intersections.forEach(int => {
    const [rowStr, colStr] = int.id.replace('int_', '').split('_')
    const row = parseInt(rowStr, 10)
    const col = parseInt(colStr, 10)
    if (col > 0) int.connectedRoads.push(`H_${row}_${col - 1}`)
    if (col < SEGMENTS_PER_ROAD) int.connectedRoads.push(`H_${row}_${col}`)
    if (row > 0) int.connectedRoads.push(`V_${col}_${row - 1}`)
    if (row < SEGMENTS_PER_ROAD) int.connectedRoads.push(`V_${col}_${row}`)
    int.connectedRoads = int.connectedRoads.filter(id => segmentMap.has(id))
  })

  const allCoords = segments.flatMap(s => [s.start, s.end])
  const minX = Math.min(...allCoords.map(c => c.x)) - roadWidth
  const maxX = Math.max(...allCoords.map(c => c.x)) + roadWidth
  const minZ = Math.min(...allCoords.map(c => c.z)) - roadWidth
  const maxZ = Math.max(...allCoords.map(c => c.z)) + roadWidth

  return {
    segments,
    intersections,
    bounds: {
      min: new THREE.Vector3(minX, -1, minZ),
      max: new THREE.Vector3(maxX, 1, maxZ)
    },
    gridSize,
    segmentLength
  }
}

export function getSegmentById(
  data: RoadGridData,
  id: string
): RoadSegment | undefined {
  return data.segments.find(s => s.id === id)
}

const _tmpStart = new THREE.Vector3()
const _tmpDir = new THREE.Vector3()

export function getPointOnSegment(
  segment: RoadSegment,
  progress: number,
  direction: 1 | -1 = 1,
  offset: number = 0
): THREE.Vector3 {
  _tmpStart.copy(segment.start)
  _tmpDir.subVectors(segment.end, segment.start).normalize()
  const actualProgress = direction === 1 ? progress : 1 - progress
  const result = _tmpStart.addScaledVector(_tmpDir, actualProgress * segment.length)
  if (segment.direction === RoadDirection.HORIZONTAL) {
    result.z += offset
  } else {
    result.x += offset
  }
  return result.clone()
}

export function isPointOnSegment(
  point: THREE.Vector3,
  segment: RoadSegment,
  tolerance: number = 10
): boolean {
  const a = segment.aabb
  if (point.x < a.minX - tolerance || point.x > a.maxX + tolerance) return false
  if (point.z < a.minZ - tolerance || point.z > a.maxZ + tolerance) return false
  return true
}

export function findNearestSegment(
  point: THREE.Vector3,
  gridData: RoadGridData
): RoadSegment | null {
  let nearest: RoadSegment | null = null
  let minDist = Infinity
  for (const seg of gridData.segments) {
    if (!isPointOnSegment(point, seg, 30)) continue
    _tmpStart.copy(seg.start)
    _tmpDir.subVectors(seg.end, seg.start).normalize()
    const v = new THREE.Vector3().subVectors(point, seg.start)
    const t = Math.max(0, Math.min(1, v.dot(_tmpDir) / seg.length))
    const closest = _tmpStart.addScaledVector(_tmpDir, t * seg.length)
    const dist = point.distanceTo(closest)
    if (dist < minDist) {
      minDist = dist
      nearest = seg
    }
  }
  return nearest
}

export function getLaneOffset(
  segment: RoadSegment,
  laneIndex: number,
  totalLanes: number = 2
): number {
  const step = segment.width / totalLanes
  const halfWidth = segment.width / 2
  return -halfWidth + step * laneIndex + step / 2
}
