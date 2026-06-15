import * as THREE from 'three'
import gsap from 'gsap'

interface Ripple {
  mesh: THREE.Mesh
  uFrac: number
  vFrac: number
  startTime: number
  duration: number
  maxRadius: number
}

interface PulseData {
  id: number
  uFrac: number
  vFrac: number
  targetHeight: number
  startTime: number
  duration: number
  radiusWorld: number
  completed: boolean
}

export class EffectsManager {
  private scene: THREE.Scene
  private ripples: Ripple[] = []
  private pulses: PulseData[] = []
  private ripplePool: Ripple[] = []
  private pulseIdCounter: number = 0
  private cellSizeX: number = 0.45
  private cellSizeZ: number = 0.9
  private gridW: number = 20
  private gridD: number = 40

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  setCellSize(x: number, z: number): void {
    this.cellSizeX = x
    this.cellSizeZ = z
  }

  setGridSize(width: number, depth: number): void {
    this.gridW = width
    this.gridD = depth
  }

  triggerPulse(uFrac: number, vFrac: number, intensity: number): void {
    const radiusWorld = this.cellSizeZ * 3
    const pulse: PulseData = {
      id: this.pulseIdCounter++,
      uFrac,
      vFrac,
      targetHeight: intensity * 0.3,
      startTime: performance.now(),
      duration: 150,
      radiusWorld,
      completed: false,
    }
    this.pulses.push(pulse)

    gsap.to(pulse, {
      targetHeight: 0,
      duration: pulse.duration / 1000,
      ease: 'power2.out',
      onComplete: () => {
        pulse.completed = true
      },
    })
  }

  applyPulsesToGeometry(
    positions: Float32Array,
    segW: number,
    segD: number,
    gridW: number,
    gridD: number,
    flowOffset: number
  ): void {
    if (this.pulses.length === 0) return

    const vertexCountX = segW + 1

    const activePulses = this.pulses.filter(p => !p.completed)

    for (let pi = activePulses.length - 1; pi >= 0; pi--) {
      const pulse = activePulses[pi]

      const flowedVFrac = (pulse.vFrac + flowOffset) % 1
      const pulseWorldX = (pulse.uFrac - 0.5) * gridW
      const pulseWorldZ = (flowedVFrac - 0.5) * gridD
      const radiusSq = pulse.radiusWorld * pulse.radiusWorld

      for (let zi = 0; zi <= segD; zi++) {
        const v = zi / segD
        const vz = (v - 0.5) * gridD
        const dz = vz - pulseWorldZ
        const dzSq = dz * dz
        if (dzSq > radiusSq) continue

        for (let xi = 0; xi <= segW; xi++) {
          const u = xi / segW
          const vx = (u - 0.5) * gridW
          const dx = vx - pulseWorldX
          const dxSq = dx * dx
          const distSq = dxSq + dzSq

          if (distSq < radiusSq) {
            const dist = Math.sqrt(distSq)
            const falloff = 1 - dist / pulse.radiusWorld
            const heightOffset = pulse.targetHeight * falloff * falloff
            const idx = zi * vertexCountX + xi
            const posIdx = idx * 3
            positions[posIdx + 1] += heightOffset
          }
        }
      }
    }

    this.pulses = this.pulses.filter(p => !p.completed)
  }

  addRipple(uFrac: number, vFrac: number): void {
    const ripple = this.createRipple()
    ripple.uFrac = uFrac
    ripple.vFrac = vFrac
    ripple.startTime = performance.now()
    ripple.duration = 400

    const maxRadius = this.cellSizeZ * 5
    ripple.maxRadius = maxRadius

    this.updateRippleWorldPosition(ripple, 0)
    ripple.mesh.scale.setScalar(0)
    ripple.mesh.visible = true

    this.ripples.push(ripple)

    const mesh = ripple.mesh
    const material = mesh.material as THREE.MeshBasicMaterial

    gsap.to(mesh.scale, {
      x: ripple.maxRadius,
      z: ripple.maxRadius,
      duration: ripple.duration / 1000,
      ease: 'power1.out',
    })

    gsap.to(material, {
      opacity: 0,
      duration: ripple.duration / 1000,
      ease: 'power2.in',
      onComplete: () => {
        this.recycleRipple(ripple)
      },
    })
  }

  updateRipples(flowOffset: number): void {
    for (const ripple of this.ripples) {
      const elapsed = performance.now() - ripple.startTime
      const t = Math.min(1, elapsed / ripple.duration)
      this.updateRippleWorldPosition(ripple, t, flowOffset)
    }
  }

  private updateRippleWorldPosition(
    ripple: Ripple,
    _t: number,
    flowOffset: number = 0
  ): void {
    const flowedVFrac = (ripple.vFrac + flowOffset) % 1
    const worldX = (ripple.uFrac - 0.5) * this.gridW
    const worldZ = (flowedVFrac - 0.5) * this.gridD
    ripple.mesh.position.set(worldX, 0.05, worldZ)
  }

  private computeRippleSegments(): number {
    const minCellSize = Math.min(this.cellSizeX, this.cellSizeZ)
    const baseSegments = Math.ceil((2 * Math.PI) / (minCellSize / 3))
    return Math.max(32, Math.min(96, baseSegments))
  }

  private createRipple(): Ripple {
    if (this.ripplePool.length > 0) {
      const r = this.ripplePool.pop()!
      const mat = r.mesh.material as THREE.MeshBasicMaterial
      mat.opacity = 0.8
      r.mesh.scale.setScalar(0)
      r.mesh.visible = true
      return r
    }

    const thetaSegments = this.computeRippleSegments()
    const innerRadius = 0.95
    const outerRadius = 1
    const ringGeometry = new THREE.RingGeometry(
      innerRadius,
      outerRadius,
      thetaSegments
    )
    ringGeometry.rotateX(-Math.PI / 2)

    const material = new THREE.MeshBasicMaterial({
      color: 0x8B5CF6,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    const mesh = new THREE.Mesh(ringGeometry, material)
    mesh.visible = false
    this.scene.add(mesh)

    return {
      mesh,
      uFrac: 0.5,
      vFrac: 0.5,
      startTime: 0,
      duration: 400,
      maxRadius: this.cellSizeZ * 5,
    }
  }

  private recycleRipple(ripple: Ripple): void {
    ripple.mesh.visible = false
    const idx = this.ripples.indexOf(ripple)
    if (idx > -1) {
      this.ripples.splice(idx, 1)
    }
    if (this.ripplePool.length < 20) {
      this.ripplePool.push(ripple)
    }
  }

  update(delta: number, flowOffset: number = 0): void {
    this.updateRipples(flowOffset)
    void delta
  }

  getActivePulseCount(): number {
    return this.pulses.length
  }

  getActiveRippleCount(): number {
    return this.ripples.length
  }

  dispose(): void {
    for (const ripple of this.ripples) {
      this.scene.remove(ripple.mesh)
      ripple.mesh.geometry.dispose()
      ;(ripple.mesh.material as THREE.Material).dispose()
    }
    for (const ripple of this.ripplePool) {
      this.scene.remove(ripple.mesh)
      ripple.mesh.geometry.dispose()
      ;(ripple.mesh.material as THREE.Material).dispose()
    }
    this.ripples.length = 0
    this.ripplePool.length = 0
    this.pulses.length = 0
  }
}
