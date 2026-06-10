import * as THREE from 'three'
import { ParticleSystem, GardenState } from './particleSystem'
import { GardenGenerator } from './gardenGenerator'
import { InteractionController } from './interaction'
import { UIManager } from './ui'

class MemoryGardenApp {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private particleSystem: ParticleSystem
  private gardenGenerator: GardenGenerator
  private interactionController: InteractionController
  private uiManager: UIManager
  private clock: THREE.Clock
  private animationId: number = 0
  private frameCount: number = 0
  private lastFpsUpdate: number = 0

  constructor(containerId: string) {
    const container = document.getElementById(containerId)
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`)
    }
    this.container = container
    this.clock = new THREE.Clock()

    this.scene = this.createScene()
    this.camera = this.createCamera()
    this.renderer = this.createRenderer()
    this.particleSystem = new ParticleSystem(this.scene, 5000)
    this.gardenGenerator = new GardenGenerator(this.particleSystem)
    this.interactionController = new InteractionController(
      this.camera,
      this.renderer,
      this.particleSystem
    )
    this.uiManager = new UIManager(this.container, {
      onGenerate: this.handleGenerate.bind(this),
      onFreeze: this.handleFreeze.bind(this),
      onReset: this.handleReset.bind(this)
    })

    this.setupLighting()
    this.setupResizeListener()
    this.initDefaultGarden()
    this.start()
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene()
    return scene
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.set(0, 15, 30)
    camera.lookAt(0, 2, 0)
    return camera
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    this.container.appendChild(renderer.domElement)
    return renderer
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(ambientLight)
  }

  private setupResizeListener(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })
  }

  private initDefaultGarden(): void {
    this.gardenGenerator.generateDefault()
  }

  private handleGenerate(text: string): void {
    this.gardenGenerator.generate(text)
    this.uiManager.updateEmotionLabel(this.gardenGenerator.getCurrentEmotion())
  }

  private handleFreeze(): GardenState | null {
    return this.particleSystem.getState()
  }

  private handleReset(): void {
    this.particleSystem.startDissolve()
    setTimeout(() => {
      if (this.particleSystem.isDissolving()) {
        this.gardenGenerator.generateDefault()
      }
    }, 1600)
  }

  private start(): void {
    this.animate()
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate)
    const delta = Math.min(this.clock.getDelta(), 0.1)

    this.particleSystem.update(delta)
    this.interactionController.update(delta)

    this.renderer.render(this.scene, this.camera)

    this.frameCount++
    const now = performance.now()
    if (now - this.lastFpsUpdate >= 1000) {
      this.lastFpsUpdate = now
      this.frameCount = 0
    }
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId)
    this.particleSystem.dispose()
    this.interactionController.dispose()
    this.uiManager.dispose()
    this.renderer.dispose()
  }
}

let app: MemoryGardenApp | null = null

document.addEventListener('DOMContentLoaded', () => {
  app = new MemoryGardenApp('app')
})

export default MemoryGardenApp
