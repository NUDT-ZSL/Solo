import * as THREE from 'three'
import { NeuralNetwork } from './network'
import { InteractionManager } from './interaction'
import { Neuron } from './neuron'

class NeuronSymphonyApp {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private container: HTMLElement

  private network!: NeuralNetwork
  private interaction!: InteractionManager

  private lastFrameTime: number = 0
  private animationFrameId: number | null = null
  private clock: THREE.Clock

  private readonly NEAR = 0.1
  private readonly FAR = 200
  private readonly FOV = 60

  constructor(containerId: string) {
    this.clock = new THREE.Clock()
    const container = document.getElementById(containerId)
    if (!container) {
      throw new Error(`Container #${containerId} not found`)
    }
    this.container = container

    this.scene = this.createScene()
    this.camera = this.createCamera()
    this.renderer = this.createRenderer()

    this.container.appendChild(this.renderer.domElement)

    this.init()
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    scene.fog = new THREE.FogExp2(0x223366, 0.02)
    return scene
  }

  private createCamera(): THREE.PerspectiveCamera {
    const width = this.container.clientWidth || window.innerWidth
    const height = this.container.clientHeight || window.innerHeight

    const camera = new THREE.PerspectiveCamera(
      this.FOV,
      width / height,
      this.NEAR,
      this.FAR
    )
    camera.position.set(18, 12, 18)
    camera.lookAt(0, 0, 0)
    return camera
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    })

    const width = this.container.clientWidth || window.innerWidth
    const height = this.container.clientHeight || window.innerHeight

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2

    return renderer
  }

  private init(): void {
    this.network = new NeuralNetwork(this.scene, {
      neuronCount: 800,
      sphereRadius: 10,
      minNeuronDistance: 0.5,
      connectionDistanceThreshold: 2
    })

    this.interaction = new InteractionManager(
      this.camera,
      this.renderer,
      this.network,
      this.container,
      28
    )

    this.interaction.onNeuronClick((neuron: Neuron) => {
      this.network.triggerElectricalStorm(neuron)
    })

    this.start()
  }

  public start(): void {
    this.lastFrameTime = performance.now()
    this.clock.start()
    this.animate()
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate)

    const currentTime = performance.now()
    const deltaTime = Math.min(0.05, this.clock.getDelta())

    this.network.update(currentTime, deltaTime)
    this.interaction.update(currentTime, deltaTime)

    this.renderer.render(this.scene, this.camera)
  }

  public dispose(): void {
    this.stop()

    this.interaction.dispose()
    this.network.dispose()

    this.renderer.dispose()
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }
  }
}

let app: NeuronSymphonyApp | null = null

function bootstrap(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady)
  } else {
    onReady()
  }
}

function onReady(): void {
  try {
    app = new NeuronSymphonyApp('app')
    console.log('[NeuronSymphony] App initialized successfully')
  } catch (e) {
    console.error('[NeuronSymphony] Failed to initialize:', e)
    const container = document.getElementById('app')
    if (container) {
      container.innerHTML =
        '<div style="color:#ff6666;padding:20px;font-family:monospace;">' +
        '初始化失败: ' + (e as Error).message + '</div>'
    }
  }
}

bootstrap()

export {}
