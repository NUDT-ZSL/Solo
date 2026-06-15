import * as THREE from 'three'

const NEON_PINK = new THREE.Color(0xff2d95)
const NEON_BLUE = new THREE.Color(0x00d4ff)
const NEON_PURPLE = new THREE.Color(0xa855f7)
const NEON_COLORS = [NEON_PINK, NEON_BLUE, NEON_PURPLE]

export interface ObstacleData {
  id: string
  mesh: THREE.Mesh
  position: THREE.Vector3
  type: 'cube' | 'sphere' | 'torus'
  frequency: number
  wavelength: number
  reflections: number
  isVibrating: boolean
  vibrationTime: number
  baseScale: number
  scaleTarget: number
}

interface WaveRing {
  mesh: THREE.Mesh
  radius: number
  maxRadius: number
  speed: number
  opacity: number
  alive: boolean
  origin: THREE.Vector3
  isReflection: boolean
  checkedObstacles: Set<string>
  age: number
}

export class SoundWave {
  private scene: THREE.Scene
  private waves: WaveRing[] = []
  private wavePool: WaveRing[] = []
  private emitTimer = 0
  private emitInterval = 1.2
  private colorIndex = 0
  private obstacles: ObstacleData[]
  private onCollision: (obstacleId: string) => void
  private _waveSpeed = 1.0
  private _reflectionIntensity = 0.5
  private maxWaves = 30

  constructor(
    scene: THREE.Scene,
    obstacles: ObstacleData[],
    onCollision: (obstacleId: string) => void
  ) {
    this.scene = scene
    this.obstacles = obstacles
    this.onCollision = onCollision
  }

  private createRingMesh(): THREE.Mesh {
    const geometry = new THREE.TorusGeometry(1, 0.012, 8, 128)
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = Math.PI / 2
    return mesh
  }

  private createWave(origin: THREE.Vector3, isReflection: boolean): WaveRing {
    let wave = this.wavePool.pop()
    if (!wave) {
      const mesh = this.createRingMesh()
      wave = {
        mesh,
        radius: 0,
        maxRadius: 30,
        speed: 1,
        opacity: 0.8,
        alive: false,
        origin: new THREE.Vector3(),
        isReflection: false,
        checkedObstacles: new Set(),
        age: 0,
      }
    }

    wave.origin.copy(origin)
    wave.radius = 0.15
    wave.maxRadius = isReflection ? 12 : 28
    wave.speed = this._waveSpeed * (isReflection ? 0.6 : 1.0)
    wave.opacity = isReflection ? 0.5 : 0.75
    wave.isReflection = isReflection
    wave.alive = true
    wave.checkedObstacles.clear()
    wave.age = 0

    const color = NEON_COLORS[this.colorIndex % NEON_COLORS.length]
    ;(wave.mesh.material as THREE.MeshBasicMaterial).color.copy(color)
    ;(wave.mesh.material as THREE.MeshBasicMaterial).opacity = wave.opacity
    wave.mesh.scale.setScalar(0.15)
    wave.mesh.position.copy(origin)

    if (!isReflection) this.colorIndex++

    this.scene.add(wave.mesh)
    this.waves.push(wave)
    return wave
  }

  emitWave() {
    if (this.waves.filter((w) => !w.isReflection).length >= this.maxWaves) return
    this.createWave(new THREE.Vector3(0, 0, 0), false)
  }

  emitReflectionWave(position: THREE.Vector3) {
    if (this.waves.filter((w) => w.isReflection).length >= 10) return
    this.createWave(position, true)
  }

  update(delta: number) {
    this.emitTimer += delta
    const interval = this.emitInterval / Math.max(0.1, this._waveSpeed)
    if (this.emitTimer >= interval) {
      this.emitTimer = 0
      this.emitWave()
    }

    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves[i]
      if (!wave.alive) continue

      wave.age += delta
      wave.radius += wave.speed * delta * 6
      wave.mesh.scale.setScalar(wave.radius)

      const fadeRatio = wave.radius / wave.maxRadius
      const baseOpacity = wave.isReflection ? 0.5 : 0.75
      wave.opacity = baseOpacity * (1 - fadeRatio * fadeRatio)
      ;(wave.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, wave.opacity)

      for (const obstacle of this.obstacles) {
        if (wave.checkedObstacles.has(obstacle.id)) continue
        const dist = wave.origin.distanceTo(obstacle.position)
        const threshold = 0.8
        if (wave.radius >= dist - threshold && wave.radius <= dist + threshold) {
          wave.checkedObstacles.add(obstacle.id)
          this.onCollision(obstacle.id)
          if (!wave.isReflection && this._reflectionIntensity > 0.1) {
            this.emitReflectionWave(obstacle.position.clone())
          }
        }
      }

      if (wave.radius >= wave.maxRadius || wave.opacity <= 0.01) {
        wave.alive = false
        this.scene.remove(wave.mesh)
        this.waves.splice(i, 1)
        this.wavePool.push(wave)
      }
    }
  }

  setWaveSpeed(speed: number) {
    this._waveSpeed = speed
  }

  setReflectionIntensity(intensity: number) {
    this._reflectionIntensity = intensity
  }

  getActiveWaves(): WaveRing[] {
    return this.waves.filter((w) => w.alive)
  }

  dispose() {
    for (const wave of this.waves) {
      this.scene.remove(wave.mesh)
      ;(wave.mesh.geometry as THREE.BufferGeometry).dispose()
      ;(wave.mesh.material as THREE.Material).dispose()
    }
    this.waves = []
    for (const wave of this.wavePool) {
      ;(wave.mesh.geometry as THREE.BufferGeometry).dispose()
      ;(wave.mesh.material as THREE.Material).dispose()
    }
    this.wavePool = []
  }
}
