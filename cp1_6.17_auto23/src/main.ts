import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { loadStarsData, createStarsSystem, StarsSystem } from './stars'
import { loadConstellationData, createConstellationSystem, ConstellationSystem } from './constellations'
import { createUIManager, UIManager } from './ui'
import { StarSystemOptions } from './types'

interface AppConfig extends StarSystemOptions {
  backgroundColor?: number
}

const DEFAULT_CONFIG: AppConfig = {
  starCount: 3000,
  radiusMin: 200,
  radiusMax: 500,
  minMagnitude: 1,
  maxMagnitude: 6,
  backgroundColor: 0x0A0A1E
}

class App {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private starsSystem!: StarsSystem
  private constellationSystem!: ConstellationSystem
  private uiManager: UIManager
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private clock: THREE.Clock
  private isDragging: boolean = false
  private mouseDownPos: { x: number; y: number } = { x: 0, y: 0 }
  private config: AppConfig
  private animationFrameId: number | null = null

  constructor(containerId: string = 'app', config: Partial<AppConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    const container = document.getElementById(containerId)
    if (!container) {
      throw new Error(`Container #${containerId} not found`)
    }
    this.container = container

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(this.config.backgroundColor!)

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      2000
    )
    this.camera.position.set(0, 0, 400)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minPolarAngle = 0
    this.controls.maxPolarAngle = Math.PI / 2
    this.controls.minDistance = 100
    this.controls.maxDistance = 800
    this.controls.rotateSpeed = 0.5
    this.controls.zoomSpeed = 0.8
    this.controls.enablePan = false

    this.uiManager = createUIManager(this.container)

    this.raycaster = new THREE.Raycaster()
    this.raycaster.params.Line = { threshold: 5 }
    this.mouse = new THREE.Vector2()
    this.clock = new THREE.Clock()

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this))

    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this))
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this))
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this))
    this.renderer.domElement.addEventListener('contextmenu', (e: Event) => e.preventDefault())
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.isDragging = false
      this.mouseDownPos = { x: e.clientX, y: e.clientY }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (e.button === 0) {
      const dx = Math.abs(e.clientX - this.mouseDownPos.x)
      const dy = Math.abs(e.clientY - this.mouseDownPos.y)
      if (dx > 3 || dy > 3) {
        this.isDragging = true
      }
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button !== 0) return
    const dx = Math.abs(e.clientX - this.mouseDownPos.x)
    const dy = Math.abs(e.clientY - this.mouseDownPos.y)
    if (dx > 3 || dy > 3) return
    this.handleClick(e)
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.mouse, this.camera)

    const intersects = this.raycaster.intersectObjects(
      this.constellationSystem.raycastTargets,
      false
    )

    if (intersects.length > 0) {
      const hit = intersects[0]
      const line = hit.object as THREE.LineSegments
      const constellationData = this.constellationSystem.getConstellationByLine(line)
      if (constellationData) {
        this.constellationSystem.highlight(constellationData.id)
        this.uiManager.showConstellationInfo(constellationData)
      } else {
        this.constellationSystem.highlight(null)
        this.uiManager.hideConstellationInfo()
      }
    } else {
      this.constellationSystem.highlight(null)
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  public async init(): Promise<void> {
    try {
      const [starsData, constellationData] = await Promise.all([
        loadStarsData(this.config).catch((err: Error) => {
          console.error('Failed to load stars data:', err)
          throw err
        }),
        loadConstellationData().catch((err: Error) => {
          console.error('Failed to load constellation data:', err)
          throw err
        })
      ])

      this.starsSystem = createStarsSystem(starsData, this.config)
      this.scene.add(this.starsSystem.points)

      this.constellationSystem = createConstellationSystem(constellationData, starsData)
      this.scene.add(this.constellationSystem.group)

      this.animate()
    } catch (error) {
      console.error('Failed to initialize application:', error)
      this.showErrorMessage()
    }
  }

  private showErrorMessage(): void {
    const errorDiv = document.createElement('div')
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(200, 50, 50, 0.9);
      color: white;
      padding: 20px 40px;
      border-radius: 8px;
      font-family: sans-serif;
      font-size: 16px;
      z-index: 2000;
    `
    errorDiv.textContent = '应用初始化失败，请刷新页面重试'
    this.container.appendChild(errorDiv)
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate)

    const delta = Math.min(this.clock.getDelta(), 0.1)
    const cameraDistance = this.camera.position.length()

    this.controls.update()
    this.starsSystem.update(delta, cameraDistance)
    this.constellationSystem.update(delta)
    this.renderer.render(this.scene, this.camera)
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
    }
    this.uiManager.destroy()
    this.renderer.dispose()
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }
  }

  public getStarCount(): number {
    return this.starsSystem?.starCount ?? 0
  }
}

const app = new App('app', { starCount: 3000 })
app.init().catch((err: Error) => {
  console.error('Failed to start app:', err)
})

export default App
