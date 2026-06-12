import * as THREE from 'three'

const MAX_VERTICES = 3000
const GRID_SEGMENTS_W = 44
const GRID_SEGMENTS_D = 44
const GRID_SIZE_W = 20
const GRID_SIZE_D = 40

interface TerrainPulse {
  x: number
  z: number
  intensity: number
  startTime: number
  duration: number
}

export class TerrainGenerator {
  private mesh: THREE.Mesh | null = null
  private geometry: THREE.PlaneGeometry | null = null
  private basePositions: Float32Array | null = null
  private baseColors: Float32Array | null = null
  private pulses: TerrainPulse[] = []
  private gridW: number = GRID_SIZE_W
  private gridD: number = GRID_SIZE_D
  private segW: number = GRID_SEGMENTS_W
  private segD: number = GRID_SEGMENTS_D
  private flowOffset: number = 0

  constructor() {
    const vertexCount = (this.segW + 1) * (this.segD + 1)
    console.assert(
      vertexCount <= MAX_VERTICES,
      `Terrain vertex count ${vertexCount} exceeds MAX_VERTICES ${MAX_VERTICES}`
    )
  }

  buildTerrain(): THREE.Mesh {
    // 顶点数上限校验：segW+1 × segD+1 必须 <= MAX_VERTICES (3000)
    // 当前配置：45 × 45 = 2025 顶点，留有约 33% 余量用于特效计算
    // 若调整分段数请确保 (segW+1)*(segD+1) <= 3000
    const vertexCount = (this.segW + 1) * (this.segD + 1)
    if (vertexCount > MAX_VERTICES) {
      throw new Error(
        `Terrain vertex count ${vertexCount} exceeds maximum allowed ${MAX_VERTICES}`
      )
    }

    this.geometry = new THREE.PlaneGeometry(
      this.gridW,
      this.gridD,
      this.segW,
      this.segD
    )
    this.geometry.rotateX(-Math.PI / 2)

    const positionAttr = this.geometry.attributes.position
    const positions = positionAttr.array as Float32Array
    this.basePositions = new Float32Array(positions.length)
    this.basePositions.set(positions)

    const colors = new Float32Array(positions.length)
    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = 0.05
      colors[i + 1] = 0.05
      colors[i + 2] = 0.15
    }
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.baseColors = new Float32Array(colors.length)
    this.baseColors.set(colors)

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      flatShading: false,
      roughness: 0.7,
      metalness: 0.1,
    })

    this.mesh = new THREE.Mesh(this.geometry, material)
    this.mesh.receiveShadow = true
    this.mesh.castShadow = true

    return this.mesh
  }

  updateTerrain(frequencyData: Uint8Array, flowOffset: number): void {
    if (!this.geometry || !this.basePositions || !this.baseColors) return

    this.flowOffset = flowOffset

    const positionAttr = this.geometry.attributes.position
    const colorAttr = this.geometry.attributes.color
    const positions = positionAttr.array as Float32Array
    const colors = colorAttr.array as Float32Array

    const vertexCountX = this.segW + 1
    const vertexCountZ = this.segD + 1
    const halfW = this.gridW / 2
    const halfD = this.gridD / 2

    const specLen = frequencyData.length

    for (let zi = 0; zi < vertexCountZ; zi++) {
      for (let xi = 0; xi < vertexCountX; xi++) {
        const idx = zi * vertexCountX + xi
        const posIdx = idx * 3

        const u = xi / this.segW
        const v = zi / this.segD

        const flowV = (v + flowOffset) % 1
        const specIndex = Math.floor(flowV * (specLen - 1))

        const lowFreq = this.getBandEnergy(frequencyData, specIndex, 0, 0.15)
        const midFreq = this.getBandEnergy(frequencyData, specIndex, 0.15, 0.5)
        const highFreq = this.getBandEnergy(frequencyData, specIndex, 0.5, 1.0)

        const baseHeight =
          lowFreq * 2.5 + midFreq * 1.0 + highFreq * 0.4

        const noise = Math.sin(u * 8 + flowV * 12) * 0.05 +
          Math.cos(u * 15 + flowV * 9) * 0.03

        const height = baseHeight + noise

        const x = (u - 0.5) * this.gridW
        const z = (v - 0.5) * this.gridD

        positions[posIdx] = x
        positions[posIdx + 1] = height
        positions[posIdx + 2] = z

        const color = this.getTerrainColor(lowFreq, midFreq, highFreq)
        colors[posIdx] = color.r
        colors[posIdx + 1] = color.g
        colors[posIdx + 2] = color.b
      }
    }

    this.applyPulses(positions, colors)

    positionAttr.needsUpdate = true
    colorAttr.needsUpdate = true
    this.geometry.computeVertexNormals()
  }

  private getBandEnergy(
    frequencyData: Uint8Array,
    centerIdx: number,
    startRatio: number,
    endRatio: number
  ): number {
    const len = frequencyData.length
    const start = Math.floor(len * startRatio)
    const end = Math.floor(len * endRatio)
    const clampedCenter = Math.max(start, Math.min(end, centerIdx))

    let sum = 0
    let count = 0
    const radius = 2
    for (let i = clampedCenter - radius; i <= clampedCenter + radius; i++) {
      if (i >= start && i < end) {
        sum += frequencyData[i] / 255
        count++
      }
    }
    return count > 0 ? sum / count : 0
  }

  private getTerrainColor(
    low: number,
    mid: number,
    high: number
  ): { r: number; g: number; b: number } {
    let r = 0, g = 0, b = 0

    if (low > 0.01) {
      r += low * 1.0
      g += low * 0.3
      b += low * 0.1
    }

    if (mid > 0.01) {
      r += mid * 0.3
      g += mid * 0.9
      b += mid * 0.5
    }

    if (high > 0.01) {
      r += high * 0.4
      g += high * 0.5
      b += high * 1.0
    }

    const total = Math.max(low + mid + high, 0.01)
    r = Math.min(1, r / total * 0.85 + 0.05)
    g = Math.min(1, g / total * 0.85 + 0.05)
    b = Math.min(1, b / total * 0.85 + 0.1)

    const brightness = Math.max(low, mid, high) * 0.7 + 0.3
    r *= brightness
    g *= brightness
    b *= brightness

    return { r, g, b }
  }

  triggerPulse(worldX: number, worldZ: number, intensity: number): void {
    this.pulses.push({
      x: worldX,
      z: worldZ,
      intensity,
      startTime: performance.now(),
      duration: 150,
    })
  }

  private applyPulses(
    positions: Float32Array,
    _colors: Float32Array
  ): void {
    const now = performance.now()
    const vertexCountX = this.segW + 1

    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i]
      const elapsed = now - pulse.startTime

      if (elapsed > pulse.duration) {
        this.pulses.splice(i, 1)
        continue
      }

      const t = elapsed / pulse.duration
      const easeOut = 1 - Math.pow(1 - t, 3)
      const heightScale = (1 - easeOut) * pulse.intensity

      const pulseRadius = 2.5

      for (let zi = 0; zi <= this.segD; zi++) {
        for (let xi = 0; xi <= this.segW; xi++) {
          const idx = zi * vertexCountX + xi
          const posIdx = idx * 3

          const dx = positions[posIdx] - pulse.x
          const dz = positions[posIdx + 2] - pulse.z
          const dist = Math.sqrt(dx * dx + dz * dz)

          if (dist < pulseRadius) {
            const falloff = 1 - dist / pulseRadius
            const pulseHeight = heightScale * falloff * falloff
            positions[posIdx + 1] += pulseHeight
          }
        }
      }
    }
  }

  getPulsePositionAtZ(zFraction: number): { x: number; z: number } {
    const z = (zFraction - 0.5) * this.gridD
    return { x: 0, z }
  }

  getGridSize(): { width: number; depth: number } {
    return { width: this.gridW, depth: this.gridD }
  }

  getSegments(): { w: number; d: number } {
    return { w: this.segW, d: this.segD }
  }

  getCellSize(): { x: number; z: number } {
    return {
      x: this.gridW / this.segW,
      z: this.gridD / this.segD,
    }
  }

  dispose(): void {
    if (this.geometry) {
      this.geometry.dispose()
      this.geometry = null
    }
    if (this.mesh && this.mesh.material) {
      const mat = this.mesh.material as THREE.Material
      mat.dispose()
    }
    this.mesh = null
    this.pulses.length = 0
  }
}
