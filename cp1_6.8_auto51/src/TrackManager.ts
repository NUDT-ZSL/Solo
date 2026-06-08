import * as THREE from 'three'

export interface ForkPoint {
  position: THREE.Vector3
  normal: THREE.Vector3
  curvature: number
  flow: number
  trackIndex: number
  t: number
}

export interface Track {
  curve: THREE.CatmullRomCurve3
  forkPoints: ForkPoint[]
  sampleTable: THREE.Vector3[]
}

export class TrackManager {
  tracks: Track[] = []
  allForkPoints: ForkPoint[] = []
  private sampleResolution = 2000

  constructor() {
    this.generateTracks()
  }

  private generateTracks() {
    const mainPoints = this.generateSpiralPoints(8, 12, 2.5, 0.8, 500)
    const mainCurve = new THREE.CatmullRomCurve3(mainPoints, false, 'catmullrom', 0.5)
    const mainSampleTable = this.buildSampleTable(mainCurve)
    const mainTrack: Track = {
      curve: mainCurve,
      forkPoints: [],
      sampleTable: mainSampleTable,
    }

    const forkTs = [0.18, 0.38, 0.58, 0.78]
    const subTracks: Track[] = []

    for (const ft of forkTs) {
      const pos = mainCurve.getPointAt(ft)
      const tangent = mainCurve.getTangentAt(ft)
      const normal = new THREE.Vector3()
        .crossVectors(tangent, new THREE.Vector3(0, 1, 0))
        .normalize()
      if (normal.lengthSq() < 0.001) {
        normal.crossVectors(tangent, new THREE.Vector3(1, 0, 0)).normalize()
      }

      const fork: ForkPoint = {
        position: pos.clone(),
        normal: normal.clone(),
        curvature: +(0.3 + Math.random() * 0.5).toFixed(3),
        flow: +(50 + Math.random() * 150).toFixed(1) as unknown as number,
        trackIndex: 0,
        t: ft,
      }
      mainTrack.forkPoints.push(fork)
      this.allForkPoints.push(fork)

      const subPoints = this.generateBranchPoints(pos, tangent, normal, 8, 40)
      const subCurve = new THREE.CatmullRomCurve3(subPoints, false, 'catmullrom', 0.5)
      const subSampleTable = this.buildSampleTable(subCurve)
      const subTrack: Track = {
        curve: subCurve,
        forkPoints: [],
        sampleTable: subSampleTable,
      }

      if (Math.random() > 0.35) {
        const subT = 0.45 + Math.random() * 0.35
        const subPos = subCurve.getPointAt(subT)
        const subTangent = subCurve.getTangentAt(subT)
        const subNormal = new THREE.Vector3()
          .crossVectors(subTangent, new THREE.Vector3(0, 1, 0))
          .normalize()
        if (subNormal.lengthSq() < 0.001) {
          subNormal.crossVectors(subTangent, new THREE.Vector3(1, 0, 0)).normalize()
        }

        const subFork: ForkPoint = {
          position: subPos.clone(),
          normal: subNormal.clone(),
          curvature: +(0.2 + Math.random() * 0.6).toFixed(3),
          flow: +(20 + Math.random() * 80).toFixed(1) as unknown as number,
          trackIndex: subTracks.length + 1,
          t: subT,
        }
        subTrack.forkPoints.push(subFork)
        this.allForkPoints.push(subFork)
      }

      subTracks.push(subTrack)
    }

    this.tracks = [mainTrack, ...subTracks]
  }

  private generateSpiralPoints(
    turns: number,
    radius: number,
    amplitude: number,
    verticalSpacing: number,
    segments: number,
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = []
    const totalAngle = turns * Math.PI * 2

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const angle = t * totalAngle
      const r = radius * (1 + 0.3 * Math.sin(angle * 0.5))
      const x = r * Math.cos(angle)
      const y =
        amplitude * Math.sin(angle * 2) +
        t * verticalSpacing * turns -
        (verticalSpacing * turns) / 2
      const z = r * Math.sin(angle)
      points.push(new THREE.Vector3(x, y, z))
    }

    return points
  }

  private generateBranchPoints(
    origin: THREE.Vector3,
    tangent: THREE.Vector3,
    normal: THREE.Vector3,
    length: number,
    segments: number,
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = []
    const binormal = new THREE.Vector3()
      .crossVectors(tangent, normal)
      .normalize()
    const branchDir = normal
      .clone()
      .add(binormal.clone().multiplyScalar(0.6))
      .normalize()

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const offset = branchDir.clone().multiplyScalar(t * length)
      const forward = tangent.clone().multiplyScalar(t * length * 0.9)
      const lift = new THREE.Vector3(0, Math.sin(t * Math.PI) * 2.0, 0)
      const point = origin.clone().add(offset).add(forward).add(lift)
      points.push(point)
    }

    return points
  }

  private buildSampleTable(curve: THREE.CatmullRomCurve3): THREE.Vector3[] {
    const table: THREE.Vector3[] = []
    for (let i = 0; i < this.sampleResolution; i++) {
      const t = i / (this.sampleResolution - 1)
      table.push(curve.getPointAt(t))
    }
    return table
  }

  getPointFromTable(trackIndex: number, t: number): THREE.Vector3 {
    const track = this.tracks[trackIndex]
    if (!track) return new THREE.Vector3()
    const clamped = Math.max(0, Math.min(0.9999, t))
    const idx = clamped * (track.sampleTable.length - 1)
    const i0 = Math.floor(idx)
    const i1 = Math.min(i0 + 1, track.sampleTable.length - 1)
    const frac = idx - i0
    const p0 = track.sampleTable[i0]
    const p1 = track.sampleTable[i1]
    return new THREE.Vector3(
      p0.x + (p1.x - p0.x) * frac,
      p0.y + (p1.y - p0.y) * frac,
      p0.z + (p1.z - p0.z) * frac,
    )
  }

  getTrackCount(): number {
    return this.tracks.length
  }
}
