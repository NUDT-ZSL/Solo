import * as THREE from 'three'
import { useWeatherStore, WeatherMode } from './store'

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  active: boolean
}

interface Hill {
  position: THREE.Vector2
  height: number
  radius: number
}

export class SceneManager {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private terrain!: THREE.Mesh
  private terrainGeometry!: THREE.PlaneGeometry
  private gridHelper!: THREE.GridHelper
  private hills: Hill[] = []
  private particles: Particle[] = []
  private particleMesh!: THREE.Points
  private particleGeometry!: THREE.BufferGeometry
  private particleMaterial!: THREE.PointsMaterial
  private terrainDeposition: Float32Array
  private snowCoverage: Float32Array
  private animationId: number = 0
  private lastTime: number = 0
  private emitAccumulator: number = 0
  private fpsAccumulator: number = 0
  private fpsFrames: number = 0
  private isRightMouseDown: boolean = false
  private spherical: { radius: number; theta: number; phi: number }
  private target: THREE.Vector3
  private unsubscribe: (() => void) | null = null
  private currentWeather: WeatherMode = 'sunny'
  private gridSize: number = 20
  private gridDivisions: number = 40
  private maxParticles: number = 5000

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb)

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    this.target = new THREE.Vector3(0, 0, 0)
    this.spherical = { radius: 25, theta: Math.PI / 4, phi: Math.PI / 3 }
    this.updateCameraPosition()

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.terrainDeposition = new Float32Array((this.gridDivisions + 1) * (this.gridDivisions + 1))
    this.snowCoverage = new Float32Array((this.gridDivisions + 1) * (this.gridDivisions + 1))

    this.initTerrain()
    this.initHills()
    this.initParticles()
    this.initLights()
    this.initEventListeners()

    this.subscribeStore()
    this.lastTime = performance.now()
    this.animate()
  }

  private subscribeStore() {
    this.unsubscribe = useWeatherStore.subscribe(
      (state) => ({ weather: state.weather, resetSignal: state.resetSignal }),
      (state) => {
        if (state.weather !== this.currentWeather) {
          this.currentWeather = state.weather
          this.updateBackgroundColor()
        }
      }
    )
    const state = useWeatherStore.getState()
    this.currentWeather = state.weather
  }

  private updateBackgroundColor() {
    const colors: Record<WeatherMode, number> = {
      sunny: 0x87ceeb,
      rainy: 0xb0bec5,
      snowy: 0xeceff1,
    }
    const targetColor = new THREE.Color(colors[this.currentWeather])
    const startColor = this.scene.background as THREE.Color
    const startTime = performance.now()
    const duration = 1000

    const animateBg = () => {
      const elapsed = performance.now() - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      const newColor = startColor.clone().lerp(targetColor, eased)
      this.scene.background = newColor
      if (t < 1) requestAnimationFrame(animateBg)
    }
    animateBg()
  }

  private initTerrain() {
    this.terrainGeometry = new THREE.PlaneGeometry(
      this.gridSize,
      this.gridSize,
      this.gridDivisions,
      this.gridDivisions
    )
    this.terrainGeometry.rotateX(-Math.PI / 2)

    const colors = new Float32Array(this.terrainGeometry.attributes.position.count * 3)
    const color = new THREE.Color(0x4caf50)
    for (let i = 0; i < this.terrainGeometry.attributes.position.count; i++) {
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
    this.terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.8,
      metalness: 0.1,
    })

    this.terrain = new THREE.Mesh(this.terrainGeometry, material)
    this.terrain.receiveShadow = true
    this.scene.add(this.terrain)

    this.gridHelper = new THREE.GridHelper(
      this.gridSize,
      this.gridDivisions,
      0xc0c0c0,
      0xc0c0c0
    )
    ;(this.gridHelper.material as THREE.Material).opacity = 0.6
    ;(this.gridHelper.material as THREE.Material).transparent = true
    this.gridHelper.position.y = 0.01
    this.scene.add(this.gridHelper)
  }

  private initHills() {
    const hillCount = 20
    for (let i = 0; i < hillCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = 2 + Math.random() * 7
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist
      const height = 0.5 + Math.random() * 1.5
      const radius = 1 + Math.random() * 1.5
      this.hills.push({ position: new THREE.Vector2(x, z), height, radius })
    }

    const positions = this.terrainGeometry.attributes.position
    const colors = this.terrainGeometry.attributes.color as THREE.BufferAttribute
    const bottomColor = new THREE.Color(0x8bc34a)
    const topColor = new THREE.Color(0x4caf50)

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const z = positions.getZ(i)
      let y = 0

      for (const hill of this.hills) {
        const dx = x - hill.position.x
        const dz = z - hill.position.y
        const dist = Math.sqrt(dx * dx + dz * dz)
        if (dist < hill.radius) {
          const factor = 1 - dist / hill.radius
          y += hill.height * factor * factor
        }
      }

      positions.setY(i, y)
      const heightFactor = Math.min(y / 2, 1)
      const hillColor = bottomColor.clone().lerp(topColor, heightFactor)
      colors.setXYZ(i, hillColor.r, hillColor.g, hillColor.b)
    }

    positions.needsUpdate = true
    colors.needsUpdate = true
    this.terrainGeometry.computeVertexNormals()
  }

  private initParticles() {
    this.particleGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(this.maxParticles * 3)
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    this.particleMaterial = new THREE.PointsMaterial({
      color: 0x4fc3f7,
      size: 0.15,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    this.particleMesh = new THREE.Points(this.particleGeometry, this.particleMaterial)
    this.scene.add(this.particleMesh)

    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        position: new THREE.Vector3(0, -100, 0),
        velocity: new THREE.Vector3(),
        active: false,
      })
    }
  }

  private initLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 20, 10)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.set(2048, 2048)
    directionalLight.shadow.camera.left = -15
    directionalLight.shadow.camera.right = 15
    directionalLight.shadow.camera.top = 15
    directionalLight.shadow.camera.bottom = -15
    this.scene.add(directionalLight)
  }

  private initEventListeners() {
    const canvas = this.renderer.domElement

    canvas.addEventListener('contextmenu', (e) => e.preventDefault())

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        this.isRightMouseDown = true
      }
    })

    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.isRightMouseDown = false
      }
    })

    canvas.addEventListener('mouseleave', () => {
      this.isRightMouseDown = false
    })

    canvas.addEventListener('mousemove', (e) => {
      if (this.isRightMouseDown) {
        this.spherical.theta -= e.movementX * 0.005
        this.spherical.phi = Math.max(
          0.1,
          Math.min(Math.PI / 2 - 0.05, this.spherical.phi - e.movementY * 0.005)
        )
        this.updateCameraPosition()
      }
    })

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault()
      this.spherical.radius = Math.max(8, Math.min(60, this.spherical.radius + e.deltaY * 0.02))
      this.updateCameraPosition()
    })

    window.addEventListener('resize', this.onResize)
  }

  private onResize = () => {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
  }

  private updateCameraPosition() {
    const { radius, theta, phi } = this.spherical
    this.camera.position.x = this.target.x + radius * Math.sin(phi) * Math.cos(theta)
    this.camera.position.y = this.target.y + radius * Math.cos(phi)
    this.camera.position.z = this.target.z + radius * Math.sin(phi) * Math.sin(theta)
    this.camera.lookAt(this.target)
  }

  private emitParticles(dt: number) {
    if (this.currentWeather === 'sunny') return

    const emitRate = this.currentWeather === 'rainy' ? 200 : 150
    this.emitAccumulator += emitRate * dt

    const color = this.currentWeather === 'rainy' ? new THREE.Color(0x4fc3f7) : new THREE.Color(0xffffff)
    const opacity = this.currentWeather === 'rainy' ? 0.7 : 0.9
    const size = this.currentWeather === 'rainy' ? 0.15 : 0.2
    this.particleMaterial.color.copy(color)
    this.particleMaterial.opacity = opacity
    this.particleMaterial.size = size

    while (this.emitAccumulator >= 1) {
      this.emitAccumulator -= 1
      const particle = this.particles.find((p) => !p.active)
      if (!particle) break

      const x = (Math.random() - 0.5) * this.gridSize
      const z = (Math.random() - 0.5) * this.gridSize
      particle.position.set(x, 15, z)
      const speed = this.currentWeather === 'rainy' ? 8 : 4
      particle.velocity.set(
        (Math.random() - 0.5) * 0.5,
        -speed,
        (Math.random() - 0.5) * 0.5
      )
      particle.active = true
    }
  }

  private updateParticles(dt: number) {
    const positions = this.particleGeometry.attributes.position as THREE.BufferAttribute
    let activeCount = 0

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i]
      if (!particle.active) {
        positions.setXYZ(i, 0, -100, 0)
        continue
      }

      activeCount++
      particle.position.addScaledVector(particle.velocity, dt)

      const terrainHeight = this.getTerrainHeight(particle.position.x, particle.position.z)

      if (particle.position.y <= terrainHeight) {
        this.depositParticle(particle.position.x, particle.position.z)
        particle.active = false
        positions.setXYZ(i, 0, -100, 0)
      } else {
        positions.setXYZ(i, particle.position.x, particle.position.y, particle.position.z)
      }
    }

    positions.needsUpdate = true
    useWeatherStore.getState().setParticleCount(activeCount)
  }

  private getTerrainHeight(x: number, z: number): number {
    let y = 0
    for (const hill of this.hills) {
      const dx = x - hill.position.x
      const dz = z - hill.position.y
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < hill.radius) {
        const factor = 1 - dist / hill.radius
        y += hill.height * factor * factor
      }
    }
    return y
  }

  private depositParticle(x: number, z: number) {
    const halfGrid = this.gridSize / 2
    const gx = Math.floor(((x + halfGrid) / this.gridSize) * this.gridDivisions)
    const gz = Math.floor(((z + halfGrid) / this.gridSize) * this.gridDivisions)

    if (gx >= 0 && gx <= this.gridDivisions && gz >= 0 && gz <= this.gridDivisions) {
      const idx = gz * (this.gridDivisions + 1) + gx

      if (this.currentWeather === 'rainy') {
        let lowestHeight = this.getTerrainHeight(x, z)
        let lowestIdx = idx

        for (let dz = -1; dz <= 1; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ngx = gx + dx
            const ngz = gz + dz
            if (ngx >= 0 && ngx <= this.gridDivisions && ngz >= 0 && ngz <= this.gridDivisions) {
              const wx = (ngx / this.gridDivisions) * this.gridSize - halfGrid
              const wz = (ngz / this.gridDivisions) * this.gridSize - halfGrid
              const h = this.getTerrainHeight(wx, wz)
              if (h < lowestHeight) {
                lowestHeight = h
                lowestIdx = ngz * (this.gridDivisions + 1) + ngx
              }
            }
          }
        }
        this.terrainDeposition[lowestIdx] = Math.min(this.terrainDeposition[lowestIdx] + 0.02, 0.3)
      } else if (this.currentWeather === 'snowy') {
        for (let dz = -2; dz <= 2; dz++) {
          for (let dx = -2; dx <= 2; dx++) {
            const ngx = gx + dx
            const ngz = gz + dz
            if (ngx >= 0 && ngx <= this.gridDivisions && ngz >= 0 && ngz <= this.gridDivisions) {
              const dist = Math.sqrt(dx * dx + dz * dz)
              if (dist <= 2) {
                const nidx = ngz * (this.gridDivisions + 1) + ngx
                const weight = 1 - dist / 2.5
                this.snowCoverage[nidx] = Math.min(this.snowCoverage[nidx] + weight * 0.015, 1)
              }
            }
          }
        }
      }
    }
  }

  private updateTerrainColors() {
    const colors = this.terrainGeometry.attributes.color as THREE.BufferAttribute
    const bottomColor = new THREE.Color(0x8bc34a)
    const topColor = new THREE.Color(0x4caf50)
    const rainColor = new THREE.Color(0x1565c0)
    const snowColor = new THREE.Color(0xfafafa)
    const positions = this.terrainGeometry.attributes.position
    let coveredVerts = 0
    const totalVerts = colors.count

    for (let i = 0; i < colors.count; i++) {
      const y = positions.getY(i)
      const heightFactor = Math.min(y / 2, 1)
      let baseColor = bottomColor.clone().lerp(topColor, heightFactor)
      const deposition = this.terrainDeposition[i]
      const snow = this.snowCoverage[i]

      if (deposition > 0) {
        const t = Math.min(deposition / 0.3, 1)
        baseColor.lerp(rainColor, t * 0.85)
      }

      if (snow > 0.01) {
        const eased = snow < 0.5 ? 2 * snow * snow : 1 - Math.pow(-2 * snow + 2, 2) / 2
        baseColor.lerp(snowColor, eased)
      }

      if (deposition > 0.01 || snow > 0.01) coveredVerts++

      colors.setXYZ(i, baseColor.r, baseColor.g, baseColor.b)
    }

    colors.needsUpdate = true
    useWeatherStore.getState().setCoverageRatio(coveredVerts / totalVerts)
  }

  private resetScene() {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false
    }
    this.terrainDeposition.fill(0)
    this.snowCoverage.fill(0)
    this.emitAccumulator = 0
    useWeatherStore.getState().setParticleCount(0)
    useWeatherStore.getState().setCoverageRatio(0)

    const colors = this.terrainGeometry.attributes.color as THREE.BufferAttribute
    const positions = this.terrainGeometry.attributes.position
    const bottomColor = new THREE.Color(0x8bc34a)
    const topColor = new THREE.Color(0x4caf50)

    for (let i = 0; i < colors.count; i++) {
      const y = positions.getY(i)
      const heightFactor = Math.min(y / 2, 1)
      const hillColor = bottomColor.clone().lerp(topColor, heightFactor)
      colors.setXYZ(i, hillColor.r, hillColor.g, hillColor.b)
    }
    colors.needsUpdate = true
  }

  private lastResetSignal = 0

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate)

    const now = performance.now()
    const dt = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now

    this.fpsAccumulator += dt
    this.fpsFrames++
    if (this.fpsAccumulator >= 0.5) {
      const fps = this.fpsFrames / this.fpsAccumulator
      useWeatherStore.getState().setFps(Math.round(fps))
      this.fpsAccumulator = 0
      this.fpsFrames = 0
    }

    const state = useWeatherStore.getState()
    if (state.resetSignal !== this.lastResetSignal) {
      this.lastResetSignal = state.resetSignal
      this.resetScene()
    }

    this.emitParticles(dt)
    this.updateParticles(dt)
    this.updateTerrainColors()

    this.renderer.render(this.scene, this.camera)
  }

  public dispose() {
    cancelAnimationFrame(this.animationId)
    window.removeEventListener('resize', this.onResize)
    this.unsubscribe?.()
    this.renderer.dispose()
    this.terrainGeometry.dispose()
    ;(this.terrain.material as THREE.Material).dispose()
    this.particleGeometry.dispose()
    this.particleMaterial.dispose()
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
