import * as THREE from 'three'

const COLOR_STOPS = [
  new THREE.Color('#1E90FF'),
  new THREE.Color('#8B00FF'),
  new THREE.Color('#FF69B4')
]

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  const c = new THREE.Color()
  c.r = a.r + (b.r - a.r) * t
  c.g = a.g + (b.g - a.g) * t
  c.b = a.b + (b.b - a.b) * t
  return c
}

function getGradientColor(t: number, offset: number): THREE.Color {
  let normalized = (t + offset) % 1
  if (normalized < 0) normalized += 1
  const stops = COLOR_STOPS.length - 1
  const scaled = normalized * stops
  const idx = Math.floor(scaled)
  const frac = scaled - idx
  if (idx >= stops) return COLOR_STOPS[stops].clone()
  return lerpColor(COLOR_STOPS[idx], COLOR_STOPS[idx + 1], frac)
}

class PerlinNoise3D {
  private perm: number[]
  private gradP: { x: number; y: number; z: number }[]

  private static grad3 = [
    { x: 1, y: 1, z: 0 }, { x: -1, y: 1, z: 0 }, { x: 1, y: -1, z: 0 }, { x: -1, y: -1, z: 0 },
    { x: 1, y: 0, z: 1 }, { x: -1, y: 0, z: 1 }, { x: 1, y: 0, z: -1 }, { x: -1, y: 0, z: -1 },
    { x: 0, y: 1, z: 1 }, { x: 0, y: -1, z: 1 }, { x: 0, y: 1, z: -1 }, { x: 0, y: -1, z: -1 }
  ]

  constructor(seed: number = Math.random()) {
    const p = new Array(256)
    for (let i = 0; i < 256; i++) p[i] = i
    this.shuffle(p, seed)
    this.perm = new Array(512)
    this.gradP = new Array(512)
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255]
      this.gradP[i] = PerlinNoise3D.grad3[this.perm[i] % 12]
    }
  }

  private shuffle(p: number[], seed: number) {
    let s = seed
    const random = () => {
      s = (s * 16807) % 2147483647
      return (s - 1) / 2147483646
    }
    for (let i = p.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[p[i], p[j]] = [p[j], p[i]]
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  private dot(g: { x: number; y: number; z: number }, x: number, y: number, z: number): number {
    return g.x * x + g.y * y + g.z * z
  }

  noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const Z = Math.floor(z) & 255
    x -= Math.floor(x)
    y -= Math.floor(y)
    z -= Math.floor(z)
    const u = this.fade(x)
    const v = this.fade(y)
    const w = this.fade(z)
    const A = this.perm[X] + Y
    const AA = this.perm[A] + Z
    const AB = this.perm[A + 1] + Z
    const B = this.perm[X + 1] + Y
    const BA = this.perm[B] + Z
    const BB = this.perm[B + 1] + Z

    const lerp = (a: number, b: number, t: number) => a + t * (b - a)

    return lerp(
      lerp(
        lerp(this.dot(this.gradP[AA], x, y, z), this.dot(this.gradP[BA], x - 1, y, z), u),
        lerp(this.dot(this.gradP[AB], x, y - 1, z), this.dot(this.gradP[BB], x - 1, y - 1, z), u),
        v
      ),
      lerp(
        lerp(this.dot(this.gradP[AA + 1], x, y, z - 1), this.dot(this.gradP[BA + 1], x - 1, y, z - 1), u),
        lerp(this.dot(this.gradP[AB + 1], x, y - 1, z - 1), this.dot(this.gradP[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    )
  }
}

export interface FluidParams {
  magneticStrength: number
  viscosity: number
  particleSize: number
  colorOffset: number
  noiseStrength: number
}

export class FluidParticles {
  maxParticles: number
  count: number
  positions: Float32Array
  velocities: Float32Array
  colors: Float32Array
  sizes: Float32Array
  alphas: Float32Array

  private noise: PerlinNoise3D
  private time: number = 0
  private magneticField: THREE.Vector3
  private fieldTransitionTime: number = 0
  private fieldDuration: number = 2.5
  private spikePhase: number = 0
  private spikeCenters: { pos: THREE.Vector3; intensity: number }[] = []

  constructor(maxParticles: number = 6000, initialCount: number = 3000) {
    this.maxParticles = maxParticles
    this.count = initialCount
    this.positions = new Float32Array(maxParticles * 3)
    this.velocities = new Float32Array(maxParticles * 3)
    this.colors = new Float32Array(maxParticles * 3)
    this.sizes = new Float32Array(maxParticles)
    this.alphas = new Float32Array(maxParticles)
    this.noise = new PerlinNoise3D(42)
    this.magneticField = new THREE.Vector3(1, 0.5, 0.3).normalize()
    this.initParticles()
    this.generateSpikeCenters()
  }

  private initParticles() {
    for (let i = 0; i < this.count; i++) {
      this.initSingleParticle(i)
    }
  }

  private initSingleParticle(i: number) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = Math.pow(Math.random(), 1 / 3) * 0.8

    const x = r * Math.sin(phi) * Math.cos(theta)
    const y = r * Math.sin(phi) * Math.sin(theta)
    const z = r * Math.cos(phi)

    this.positions[i * 3] = x
    this.positions[i * 3 + 1] = y
    this.positions[i * 3 + 2] = z

    this.velocities[i * 3] = 0
    this.velocities[i * 3 + 1] = 0
    this.velocities[i * 3 + 2] = 0

    const colorT = Math.random()
    const color = getGradientColor(colorT, 0)
    this.colors[i * 3] = color.r
    this.colors[i * 3 + 1] = color.g
    this.colors[i * 3 + 2] = color.b

    this.sizes[i] = 0.05 + Math.random() * 0.1
    this.alphas[i] = 0.6 + Math.random() * 0.3
  }

  setCount(newCount: number) {
    const clamped = Math.max(1000, Math.min(this.maxParticles, newCount))
    if (clamped > this.count) {
      for (let i = this.count; i < clamped; i++) {
        this.initSingleParticle(i)
      }
    }
    this.count = clamped
  }

  private generateSpikeCenters() {
    const numSpikes = 5 + Math.floor(Math.random() * 4)
    this.spikeCenters = []
    for (let i = 0; i < numSpikes; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const pos = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      ).normalize()
      this.spikeCenters.push({ pos, intensity: 0.3 + Math.random() * 0.7 })
    }
  }

  get isCondensed(): boolean {
    return this.spikePhase > 0.3 && this.spikePhase < 0.85
  }

  update(delta: number, params: FluidParams) {
    this.time += delta
    this.fieldTransitionTime += delta

    if (this.fieldTransitionTime >= this.fieldDuration) {
      this.fieldTransitionTime = 0
      this.fieldDuration = 2 + Math.random()
      this.magneticField.set(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize()
      this.generateSpikeCenters()
    }

    const cycleT = this.fieldTransitionTime / this.fieldDuration
    this.spikePhase = Math.sin(cycleT * Math.PI)

    const viscosity = params.viscosity
    const magneticStrength = params.magneticStrength
    const noiseStrength = params.noiseStrength
    const colorOffset = params.colorOffset

    const drag = 1 - viscosity * 0.5
    const brownian = 0.0015
    const baseRadius = 0.7
    const springK = 0.025
    const extraCenterPull = (1 - this.spikePhase) * 0.008

    const MAX_UPDATE_MS = 4
    const startTime = performance.now()

    for (let i = 0; i < this.count; i++) {
      if (performance.now() - startTime > MAX_UPDATE_MS && i > 1000) break

      const i3 = i * 3
      let px = this.positions[i3]
      let py = this.positions[i3 + 1]
      let pz = this.positions[i3 + 2]
      let vx = this.velocities[i3]
      let vy = this.velocities[i3 + 1]
      let vz = this.velocities[i3 + 2]

      const distFromCenter = Math.sqrt(px * px + py * py + pz * pz) || 0.001
      const nx = px / distFromCenter
      const ny = py / distFromCenter
      const nz = pz / distFromCenter

      let fx = 0
      let fy = 0
      let fz = 0

      const targetRadius = baseRadius + this.spikePhase * 0.5
      const springForce = (targetRadius - distFromCenter) * springK
      fx += nx * springForce
      fy += ny * springForce
      fz += nz * springForce
      if (distFromCenter > baseRadius) {
        fx -= nx * extraCenterPull
        fy -= ny * extraCenterPull
        fz -= nz * extraCenterPull
      }

      const magDot = nx * this.magneticField.x + ny * this.magneticField.y + nz * this.magneticField.z
      const magForce = magneticStrength * 0.006 * this.spikePhase
      fx += this.magneticField.x * magForce * (0.5 + Math.max(0, magDot) * 0.5)
      fy += this.magneticField.y * magForce * (0.5 + Math.max(0, magDot) * 0.5)
      fz += this.magneticField.z * magForce * (0.5 + Math.max(0, magDot) * 0.5)

      for (const spike of this.spikeCenters) {
        const sp = spike.pos
        const dot = nx * sp.x + ny * sp.y + nz * sp.z
        const spikeInfluence = Math.max(0, dot) * spike.intensity * this.spikePhase
        const spikeForce = magneticStrength * 0.012 * spikeInfluence
        fx += sp.x * spikeForce
        fy += sp.y * spikeForce
        fz += sp.z * spikeForce
      }

      const boundary = 1.8 + this.spikePhase * 1.0
      if (distFromCenter > boundary) {
        const pullBack = (distFromCenter - boundary) * 0.08
        fx -= nx * pullBack
        fy -= ny * pullBack
        fz -= nz * pullBack
      } else if (distFromCenter < 0.15) {
        const pushOut = (0.15 - distFromCenter) * 0.03
        fx += nx * pushOut
        fy += ny * pushOut
        fz += nz * pushOut
      }

      if (noiseStrength > 0) {
        const noiseScale = 1.5
        const n1 = this.noise.noise(px * noiseScale + this.time * 0.3, py * noiseScale, pz * noiseScale)
        const n2 = this.noise.noise(px * noiseScale, py * noiseScale + this.time * 0.3, pz * noiseScale + 100)
        const n3 = this.noise.noise(px * noiseScale + 200, py * noiseScale, pz * noiseScale + this.time * 0.3)
        const nf = noiseStrength * 0.006
        fx += n1 * nf
        fy += n2 * nf
        fz += n3 * nf
      }

      fx += (Math.random() - 0.5) * brownian
      fy += (Math.random() - 0.5) * brownian
      fz += (Math.random() - 0.5) * brownian

      vx = (vx + fx) * drag
      vy = (vy + fy) * drag
      vz = (vz + fz) * drag

      const speed = Math.sqrt(vx * vx + vy * vy + vz * vz)
      const maxSpeed = 0.05
      if (speed > maxSpeed) {
        vx = (vx / speed) * maxSpeed
        vy = (vy / speed) * maxSpeed
        vz = (vz / speed) * maxSpeed
      }

      px += vx
      py += vy
      pz += vz

      const newDist = Math.sqrt(px * px + py * py + pz * pz)
      const hardLimit = 3.0
      if (newDist > hardLimit) {
        const scale = hardLimit / newDist * 0.9
        px *= scale
        py *= scale
        pz *= scale
        vx *= 0.1
        vy *= 0.1
        vz *= 0.1
      }

      this.positions[i3] = px
      this.positions[i3 + 1] = py
      this.positions[i3 + 2] = pz
      this.velocities[i3] = vx
      this.velocities[i3 + 1] = vy
      this.velocities[i3 + 2] = vz

      const colorT = (distFromCenter / 2 + 0.5) % 1
      const color = getGradientColor(colorT, colorOffset)
      this.colors[i3] = color.r
      this.colors[i3 + 1] = color.g
      this.colors[i3 + 2] = color.b

      this.sizes[i] = params.particleSize * (0.7 + Math.random() * 0.3)
    }
  }

  getPositionArray(): Float32Array {
    return this.positions
  }

  getColorArray(): Float32Array {
    return this.colors
  }

  getSizeArray(): Float32Array {
    return this.sizes
  }

  getAlphaArray(): Float32Array {
    return this.alphas
  }

  getBoundingRadius(): number {
    return 1.0 + this.spikePhase * 0.8 + 0.2
  }
}
