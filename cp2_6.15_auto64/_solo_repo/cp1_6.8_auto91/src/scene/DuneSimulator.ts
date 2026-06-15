import * as THREE from 'three'

const GRAD3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
]

function buildPermutationTable(seed: number): Uint8Array {
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  let s = seed
  for (let i = 255; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647
    const j = s % (i + 1)
    const tmp = p[i]
    p[i] = p[j]
    p[j] = tmp
  }
  const perm = new Uint8Array(512)
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
  return perm
}

function dot2(g: number[], x: number, y: number): number {
  return g[0] * x + g[1] * y
}

function noise2D(perm: Uint8Array, x: number, y: number): number {
  const F2 = 0.5 * (Math.sqrt(3) - 1)
  const G2 = (3 - Math.sqrt(3)) / 6
  const s = (x + y) * F2
  const i = Math.floor(x + s)
  const j = Math.floor(y + s)
  const t = (i + j) * G2
  const X0 = i - t
  const Y0 = j - t
  const x0 = x - X0
  const y0 = y - Y0
  let i1: number, j1: number
  if (x0 > y0) { i1 = 1; j1 = 0 } else { i1 = 0; j1 = 1 }
  const x1 = x0 - i1 + G2
  const y1 = y0 - j1 + G2
  const x2 = x0 - 1 + 2 * G2
  const y2 = y0 - 1 + 2 * G2
  const ii = i & 255
  const jj = j & 255
  const gi0 = perm[ii + perm[jj]] % 12
  const gi1 = perm[ii + i1 + perm[jj + j1]] % 12
  const gi2 = perm[ii + 1 + perm[jj + 1]] % 12
  let n0 = 0, n1 = 0, n2 = 0
  let t0 = 0.5 - x0 * x0 - y0 * y0
  if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * dot2(GRAD3[gi0], x0, y0) }
  let t1 = 0.5 - x1 * x1 - y1 * y1
  if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * dot2(GRAD3[gi1], x1, y1) }
  let t2 = 0.5 - x2 * x2 - y2 * y2
  if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * dot2(GRAD3[gi2], x2, y2) }
  return 70 * (n0 + n1 + n2)
}

function fbm(perm: Uint8Array, x: number, y: number, octaves: number = 4): number {
  let val = 0
  let amp = 1
  let freq = 1
  let maxVal = 0
  for (let i = 0; i < octaves; i++) {
    val += amp * noise2D(perm, x * freq, y * freq)
    maxVal += amp
    amp *= 0.5
    freq *= 2
  }
  return val / maxVal
}

export class DuneSimulator {
  mesh: THREE.Mesh
  wireframe: THREE.LineSegments
  geometry: THREE.PlaneGeometry
  private positions: Float32Array
  private perm: Uint8Array
  private seed: number
  private time: number = 0
  private basePositions: Float32Array
  private avalanchePoints: { idx: number; progress: number; intensity: number }[] = []

  constructor(seed: number, segments: number = 128) {
    this.seed = seed
    this.perm = buildPermutationTable(seed)
    this.geometry = new THREE.PlaneGeometry(20, 20, segments, segments)
    this.geometry.rotateX(-Math.PI / 2)
    const posAttr = this.geometry.getAttribute('position')
    this.positions = posAttr.array as Float32Array
    this.basePositions = new Float32Array(this.positions.length)
    this.applyNoiseHeights()

    const material = new THREE.MeshStandardMaterial({
      color: 0xC4A35A,
      roughness: 0.85,
      metalness: 0.05,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.Mesh(this.geometry, material)

    const wireGeo = new THREE.WireframeGeometry(this.geometry)
    const wireMat = new THREE.LineBasicMaterial({
      color: 0xE8A838,
      transparent: true,
      opacity: 0.15,
    })
    this.wireframe = new THREE.LineSegments(wireGeo, wireMat)
  }

  private applyNoiseHeights() {
    const count = this.positions.length / 3
    for (let i = 0; i < count; i++) {
      const x = this.positions[i * 3]
      const z = this.positions[i * 3 + 2]
      const h = fbm(this.perm, x * 0.15, z * 0.15, 5)
      this.basePositions[i * 3] = this.positions[i * 3]
      this.basePositions[i * 3 + 1] = h * 2.5
      this.basePositions[i * 3 + 2] = this.positions[i * 3 + 2]
      this.positions[i * 3 + 1] = this.basePositions[i * 3 + 1]
    }
    this.geometry.getAttribute('position').needsUpdate = true
    this.geometry.computeVertexNormals()
  }

  updateSeed(seed: number) {
    this.seed = seed
    this.perm = buildPermutationTable(seed)
    this.applyNoiseHeights()
    this.avalanchePoints = []
  }

  update(dt: number, windSpeed: number, windDirection: number, amplitude: number) {
    this.time += dt * windSpeed * 0.1
    const windRad = (windDirection * Math.PI) / 180
    const windX = Math.cos(windRad)
    const windZ = Math.sin(windRad)
    const count = this.positions.length / 3

    for (let i = 0; i < count; i++) {
      const bx = this.basePositions[i * 3]
      const bz = this.basePositions[i * 3 + 2]
      const by = this.basePositions[i * 3 + 1]
      const ripple = noise2D(this.perm, bx * 0.3 + this.time * windX, bz * 0.3 + this.time * windZ) * 0.4 * (windSpeed / 10) * amplitude
      const windDisplace = noise2D(this.perm, bx * 0.5 + this.time * 0.7 * windX + 100, bz * 0.5 + this.time * 0.7 * windZ + 100) * 0.3 * (windSpeed / 10) * amplitude
      this.positions[i * 3 + 1] = by * amplitude + ripple + windDisplace
    }

    for (let a = this.avalanchePoints.length - 1; a >= 0; a--) {
      const av = this.avalanchePoints[a]
      av.progress += dt * 3
      if (av.progress >= 1) {
        this.avalanchePoints.splice(a, 1)
        continue
      }
      const sink = Math.sin(av.progress * Math.PI) * av.intensity
      this.positions[av.idx * 3 + 1] -= sink * 0.3
    }

    this.geometry.getAttribute('position').needsUpdate = true
    this.geometry.computeVertexNormals()

    const wireGeo = new THREE.WireframeGeometry(this.geometry)
    this.wireframe.geometry.dispose()
    this.wireframe.geometry = wireGeo
  }

  triggerAvalanche(point: THREE.Vector3) {
    const count = this.positions.length / 3
    for (let i = 0; i < count; i++) {
      const vx = this.positions[i * 3]
      const vz = this.positions[i * 3 + 2]
      const dist = Math.sqrt((vx - point.x) ** 2 + (vz - point.z) ** 2)
      if (dist < 2) {
        this.avalanchePoints.push({
          idx: i,
          progress: 0,
          intensity: (1 - dist / 2) * 1.5,
        })
      }
    }
  }

  getSlopeAt(point: THREE.Vector3): number {
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(point.x, 20, point.z),
      new THREE.Vector3(0, -1, 0)
    )
    const hits = raycaster.intersectObject(this.mesh)
    if (hits.length > 0 && hits[0].face) {
      const normal = hits[0].face.normal
      const angle = Math.acos(Math.min(1, Math.abs(normal.y))) * (180 / Math.PI)
      return Math.round(angle * 10) / 10
    }
    return 0
  }

  dispose() {
    this.geometry.dispose()
    ;(this.mesh.material as THREE.Material).dispose()
    this.wireframe.geometry.dispose()
    ;(this.wireframe.material as THREE.Material).dispose()
  }
}
