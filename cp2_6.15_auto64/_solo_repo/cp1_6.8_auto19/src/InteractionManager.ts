import * as THREE from 'three'
import type { ObstacleData } from './SoundWave'
import type { ParticleSystem } from './ParticleSystem'
import { useStore } from './store'

const NEON_PINK = new THREE.Color(0xff2d95)
const NEON_BLUE = new THREE.Color(0x00d4ff)
const NEON_PURPLE = new THREE.Color(0xa855f7)
const NEON_COLORS = [NEON_PINK, NEON_BLUE, NEON_PURPLE]

interface ShockwaveRing {
  mesh: THREE.Mesh
  age: number
  maxAge: number
  alive: boolean
}

export class InteractionManager {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private obstacles: ObstacleData[]
  private particleSystem: ParticleSystem
  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2()
  private shockwaves: ShockwaveRing[] = []
  private shockwavePool: ShockwaveRing[] = []
  private clickHandlers: (() => void)[] = []

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    obstacles: ObstacleData[],
    particleSystem: ParticleSystem
  ) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.obstacles = obstacles
    this.particleSystem = particleSystem

    this.onClick = this.onClick.bind(this)
    this.renderer.domElement.addEventListener('click', this.onClick)
  }

  private onClick(event: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)

    const meshes = this.obstacles.map((o) => o.mesh)
    const intersects = this.raycaster.intersectObjects(meshes, false)

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh
      const obstacle = this.obstacles.find((o) => o.mesh === hitMesh)
      if (obstacle) {
        this.triggerResonance(obstacle)
      }
    } else {
      useStore.getState().setSelectedObstacle(null)
    }
  }

  triggerVibration(obstacle: ObstacleData) {
    obstacle.isVibrating = true
    obstacle.vibrationTime = 0
    const idx = this.obstacles.indexOf(obstacle)
    const color = NEON_COLORS[idx % NEON_COLORS.length]
    ;(obstacle.mesh.material as THREE.MeshStandardMaterial).emissive.copy(color)
    ;(obstacle.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5
  }

  triggerResonance(obstacle: ObstacleData) {
    obstacle.scaleTarget = 1.8

    const color = NEON_COLORS[Math.floor(Math.random() * 3)]
    this.particleSystem.emitBurst(obstacle.position, color, 80)
    this.createShockwave(obstacle.position, color)

    const store = useStore.getState()
    store.setSelectedObstacle({
      id: obstacle.id,
      frequency: obstacle.frequency,
      wavelength: obstacle.wavelength,
      reflections: obstacle.reflections,
      type: obstacle.type,
    })
  }

  private createShockwave(position: THREE.Vector3, color: THREE.Color) {
    let sw = this.shockwavePool.pop()
    if (!sw) {
      const geometry = new THREE.TorusGeometry(1, 0.04, 8, 64)
      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.rotation.x = Math.PI / 2
      sw = { mesh, age: 0, maxAge: 1.5, alive: false }
    }

    sw.alive = true
    sw.age = 0
    sw.maxAge = 1.5
    ;(sw.mesh.material as THREE.MeshBasicMaterial).color.copy(color)
    ;(sw.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9
    sw.mesh.scale.setScalar(0.1)
    sw.mesh.position.copy(position)

    this.scene.add(sw.mesh)
    this.shockwaves.push(sw)
  }

  update(delta: number) {
    for (const obstacle of this.obstacles) {
      if (obstacle.isVibrating) {
        obstacle.vibrationTime += delta
        const intensity = Math.max(0, 1 - obstacle.vibrationTime * 2)
        const shakeX = (Math.random() - 0.5) * 0.08 * intensity
        const shakeY = (Math.random() - 0.5) * 0.08 * intensity
        const shakeZ = (Math.random() - 0.5) * 0.08 * intensity
        obstacle.mesh.position.set(
          obstacle.position.x + shakeX,
          obstacle.position.y + shakeY,
          obstacle.position.z + shakeZ
        )

        const mat = obstacle.mesh.material as THREE.MeshStandardMaterial
        mat.emissiveIntensity = 1.5 * intensity

        if (obstacle.vibrationTime > 0.5) {
          obstacle.isVibrating = false
          obstacle.mesh.position.copy(obstacle.position)
          mat.emissiveIntensity = 0.3
        }
      }

      if (obstacle.scaleTarget !== 1) {
        const currentScale = obstacle.mesh.scale.x
        const newScale = THREE.MathUtils.lerp(currentScale, obstacle.scaleTarget, delta * 6)
        obstacle.mesh.scale.setScalar(newScale)
        if (Math.abs(newScale - obstacle.scaleTarget) < 0.05) {
          obstacle.scaleTarget = obstacle.scaleTarget > 1.3 ? 1 : 1.8
          if (obstacle.scaleTarget === 1 && Math.abs(newScale - 1) < 0.1) {
            obstacle.scaleTarget = 1
            obstacle.mesh.scale.setScalar(1)
          }
        }
      }

      obstacle.mesh.rotation.y += delta * 0.3
      obstacle.mesh.rotation.x += delta * 0.15
      obstacle.mesh.position.y = obstacle.position.y + Math.sin(Date.now() * 0.001 + obstacle.position.x) * 0.15
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i]
      if (!sw.alive) continue

      sw.age += delta
      const progress = sw.age / sw.maxAge
      const scale = progress * 8
      sw.mesh.scale.setScalar(Math.max(0.1, scale))
      ;(sw.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - progress)

      this.particleSystem.pushParticlesAway(sw.mesh.position, 3 * (1 - progress), scale)

      if (sw.age >= sw.maxAge) {
        sw.alive = false
        this.scene.remove(sw.mesh)
        this.shockwaves.splice(i, 1)
        this.shockwavePool.push(sw)
      }
    }
  }

  dispose() {
    this.renderer.domElement.removeEventListener('click', this.onClick)
    for (const sw of this.shockwaves) {
      this.scene.remove(sw.mesh)
      ;(sw.mesh.geometry as THREE.BufferGeometry).dispose()
      ;(sw.mesh.material as THREE.Material).dispose()
    }
    for (const sw of this.shockwavePool) {
      ;(sw.mesh.geometry as THREE.BufferGeometry).dispose()
      ;(sw.mesh.material as THREE.Material).dispose()
    }
  }
}
