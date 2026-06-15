import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LavaSystem } from './LavaSystem'
import { ParticleEmitter } from './ParticleEmitter'
import { RockLayer } from './RockLayer'
import { useLavaStore } from './store'

export class SceneManager {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  clock: THREE.Clock
  raycaster: THREE.Raycaster
  mouse: THREE.Vector2
  lavaSystem: LavaSystem
  particleEmitter: ParticleEmitter
  rockLayer: RockLayer
  animationId: number
  shakeIntensity: number
  shakeDecay: number
  onEruption: (() => void) | null

  constructor(container: HTMLElement) {
    this.clock = new THREE.Clock()
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.animationId = 0
    this.shakeIntensity = 0
    this.shakeDecay = 0.95
    this.onEruption = null

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(0x0a0000, 0.02)

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    this.camera.position.set(8, 12, 8)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.8
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 5
    this.controls.maxDistance = 30
    this.controls.maxPolarAngle = Math.PI / 2.1
    this.controls.target.set(0, 0, 0)

    this.setupLighting()
    this.setupBackground()

    this.particleEmitter = new ParticleEmitter()
    this.rockLayer = new RockLayer()
    this.lavaSystem = new LavaSystem(this.particleEmitter, this.rockLayer)

    this.scene.add(this.rockLayer.group)
    this.scene.add(this.lavaSystem.group)
    this.scene.add(this.particleEmitter.mesh)

    this.setupEvents(container)
    this.animate()
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0x330000, 0.5)
    this.scene.add(ambient)

    const dirLight = new THREE.DirectionalLight(0xff6633, 0.3)
    dirLight.position.set(5, 10, 5)
    this.scene.add(dirLight)

    const lavaLight1 = new THREE.PointLight(0xff4400, 3, 15)
    lavaLight1.position.set(0, 2, 0)
    this.scene.add(lavaLight1)

    const lavaLight2 = new THREE.PointLight(0xff2200, 2, 12)
    lavaLight2.position.set(-3, 1.5, -3)
    this.scene.add(lavaLight2)

    const lavaLight3 = new THREE.PointLight(0xff3300, 2, 12)
    lavaLight3.position.set(3, 1.5, 3)
    this.scene.add(lavaLight3)

    const hemiLight = new THREE.HemisphereLight(0x220000, 0x000000, 0.3)
    this.scene.add(hemiLight)
  }

  private setupBackground() {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, 512)
    gradient.addColorStop(0, '#0a0000')
    gradient.addColorStop(0.3, '#1a0500')
    gradient.addColorStop(0.6, '#2d0a00')
    gradient.addColorStop(0.85, '#4a1500')
    gradient.addColorStop(1.0, '#6b2000')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 2, 512)
    const texture = new THREE.CanvasTexture(canvas)
    texture.mapping = THREE.EquirectangularReflectionMapping
    this.scene.background = texture
  }

  private setupEvents(container: HTMLElement) {
    window.addEventListener('resize', () => this.handleResize())

    this.renderer.domElement.addEventListener('click', (event) => {
      const rect = this.renderer.domElement.getBoundingClientRect()
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      this.raycaster.setFromCamera(this.mouse, this.camera)
      const hit = this.lavaSystem.handleClick(this.raycaster)
      if (hit) {
        this.shakeIntensity = 0.5
      }
    })

    this.renderer.domElement.addEventListener('touchend', (event) => {
      if (event.changedTouches.length === 0) return
      const touch = event.changedTouches[0]
      const rect = this.renderer.domElement.getBoundingClientRect()
      this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1
      this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1
      this.raycaster.setFromCamera(this.mouse, this.camera)
      const hit = this.lavaSystem.handleClick(this.raycaster)
      if (hit) {
        this.shakeIntensity = 0.5
      }
    })
  }

  private handleResize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  triggerShake() {
    this.shakeIntensity = 0.5
  }

  reset() {
    this.lavaSystem.reset()
    this.particleEmitter.reset()
    this.rockLayer.reset()
    useLavaStore.getState().resetScene()
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate())
    const delta = Math.min(this.clock.getDelta(), 0.05)

    this.lavaSystem.update(delta)
    this.particleEmitter.update(delta)
    this.rockLayer.update(delta)

    if (this.shakeIntensity > 0.01) {
      const offsetX = (Math.random() - 0.5) * this.shakeIntensity * 0.3
      const offsetY = (Math.random() - 0.5) * this.shakeIntensity * 0.2
      this.camera.position.x += offsetX
      this.camera.position.y += offsetY
      this.shakeIntensity *= this.shakeDecay
    }

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    cancelAnimationFrame(this.animationId)
    this.renderer.dispose()
    this.controls.dispose()
  }
}
