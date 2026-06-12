import * as THREE from 'three'
import gsap from 'gsap'

interface Ripple {
  mesh: THREE.Mesh
  origin: THREE.Vector3
  startTime: number
  duration: number
  maxRadius: number
}

interface PulseData {
  id: number
  position: THREE.Vector3
  targetHeight: number
  startTime: number
  duration: number
  radius: number
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

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  setCellSize(x: number, z: number): void {
    this.cellSizeX = x
    this.cellSizeZ = z
  }

  triggerPulse(worldPosition: THREE.Vector3, intensity: number): void {
    const pulse: PulseData = {
      id: this.pulseIdCounter++,
      position: worldPosition.clone(),
      targetHeight: intensity * 0.3,
      startTime: performance.now(),
      duration: 150,
      radius: 2.5,
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
    gridD: number
  ): void {
    if (this.pulses.length === 0) return

    const vertexCountX = segW + 1
    const halfW = gridW / 2
    const halfD = gridD / 2

    const activePulses = this.pulses.filter(p => !p.completed)

    for (let i = activePulses.length - 1; i >= 0; i--) {
      const pulse = activePulses[i]

      for (let zi = 0; zi <= segD; zi++) {
        for (let xi = 0; xi <= segW; xi++) {
          const idx = zi * vertexCountX + xi
          const posIdx = idx * 3

          const vx = (xi / segW - 0.5) * gridW
          const vz = (zi / segD - 0.5) * gridD

          const dx = vx - pulse.position.x
          const dz = vz - pulse.position.z
          const dist = Math.sqrt(dx * dx + dz * dz)

          if (dist < pulse.radius) {
            const falloff = 1 - dist / pulse.radius
            const heightOffset = pulse.targetHeight * falloff * falloff
            positions[posIdx + 1] += heightOffset
          }
        }
      }
    }

    this.pulses = this.pulses.filter(p => !p.completed)
  }

  addRipple(origin: THREE.Vector3): void {
    const ripple = this.createRipple()
    ripple.origin.copy(origin)
    ripple.startTime = performance.now()
    ripple.duration = 400
    ripple.maxRadius = 4
    ripple.mesh.position.copy(origin)
    ripple.mesh.position.y += 0.05
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

  private createRipple(): Ripple {
    if (this.ripplePool.length > 0) {
      const r = this.ripplePool.pop()!
      const mat = r.mesh.material as THREE.MeshBasicMaterial
      mat.opacity = 0.8
      r.mesh.scale.setScalar(0)
      r.mesh.visible = true
      return r
    }

    const ringGeometry = new THREE.RingGeometry(0.95, 1, 48)
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
      origin: new THREE.Vector3(),
      startTime: 0,
      duration: 400,
      maxRadius: 4,
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

  update(_delta: number): void {
    // 波纹动画由 gsap 驱动，此处无需手动更新
    // 预留接口用于未来添加更多基于帧的特效
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
