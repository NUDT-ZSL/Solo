import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Plant, GrowthSpeed, EnvironmentParams, GrowthStage } from './plant'
import { UIController, ViewPreset } from './ui'

const STAGE_NAMES: Record<GrowthStage, string> = {
  [GrowthStage.SEED]: '种子 · Seed',
  [GrowthStage.SPROUT]: '幼苗 · Sprout',
  [GrowthStage.BRANCHING]: '抽枝 · Branching',
  [GrowthStage.LEAFY]: '长叶 · Leafy',
  [GrowthStage.FLOWERING]: '开花结果 · Flowering',
}

class SceneManager {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private directionalLight: THREE.DirectionalLight
  private plant: Plant
  private ui: UIController
  private clock: THREE.Clock
  private speed: GrowthSpeed

  constructor() {
    this.container = document.getElementById('canvas-container')!
    this.clock = new THREE.Clock()
    this.speed = 'normal'

    this.scene = new THREE.Scene()
    this.scene.background = null

    const aspect = this.container.clientWidth / this.container.clientHeight
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100)
    this.camera.position.set(0, 3, 7)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.container.appendChild(this.renderer.domElement)

    const hemisphereLight = new THREE.HemisphereLight(0x8bc34a, 0x3e2723, 0.6)
    this.scene.add(hemisphereLight)

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
    this.directionalLight.position.set(5, 8, 5)
    this.scene.add(this.directionalLight)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 3
    this.controls.maxDistance = 12
    this.controls.minPolarAngle = Math.PI / 180 * 30
    this.controls.maxPolarAngle = Math.PI / 180 * 150
    this.controls.target.set(0, 1, 0)

    this.plant = new Plant()
    this.scene.add(this.plant.getMesh())

    this.ui = new UIController({
      onEnvironmentChange: (params: EnvironmentParams) => {
        this.plant.setEnvironment(params)
        this.directionalLight.intensity = 0.4 + params.light / 100 * 1.2
      },
      onSpeedChange: (speed: GrowthSpeed) => {
        this.speed = speed
      },
      onViewChange: (view: ViewPreset) => {
        this.setView(view)
      },
      onReset: () => {
        this.plant.reset()
      },
      onSnapshot: () => {
        UIController.takeSnapshot(this.renderer.domElement as HTMLCanvasElement)
      },
    })

    window.addEventListener('resize', this.onResize.bind(this))
    this.animate()
  }

  private setView(view: ViewPreset): void {
    switch (view) {
      case 'top':
        this.camera.position.set(0, 10, 0.01)
        this.controls.target.set(0, 0, 0)
        break
      case 'side':
        this.camera.position.set(8, 2, 0)
        this.controls.target.set(0, 1, 0)
        break
      case 'reset':
        this.camera.position.set(0, 3, 7)
        this.controls.target.set(0, 1, 0)
        break
    }
    this.controls.update()
  }

  private onResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this))

    const dt = this.clock.getDelta()
    this.plant.update(dt, this.speed)

    const stageName = STAGE_NAMES[this.plant.currentStage]
    this.ui.updateStage(this.plant.currentStage, stageName)

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }
}

new SceneManager()
