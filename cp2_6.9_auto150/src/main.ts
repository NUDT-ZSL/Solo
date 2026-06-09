import * as THREE from 'three'
import { ConstellationManager } from './constellation'
import { ThemeManager } from './theme'

class App {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.OrthographicCamera
  private renderer: THREE.WebGLRenderer
  private themeManager: ThemeManager
  private constellationManager: ConstellationManager
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private worldPlane: THREE.Plane
  private clock: THREE.Clock
  private isRightDragging: boolean = false
  private lastRightMousePos: { x: number; y: number } = { x: 0, y: 0 }
  private cameraOffset: THREE.Vector2 = new THREE.Vector2(0, 0)
  private cameraZoom: number = 1
  private readonly MIN_ZOOM: number = 0.5
  private readonly MAX_ZOOM: number = 3
  private themeLabel: HTMLElement | null

  constructor() {
    this.container = document.getElementById('canvas-container')!
    this.themeLabel = document.getElementById('theme-label')

    this.scene = new THREE.Scene()

    const aspect = window.innerWidth / window.innerHeight
    const viewSize = 600
    this.camera = new THREE.OrthographicCamera(
      -aspect * viewSize,
      aspect * viewSize,
      viewSize,
      -viewSize,
      -1000,
      1000
    )
    this.camera.position.set(0, 0, 500)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(0x000000, 0)
    this.container.appendChild(this.renderer.domElement)

    this.themeManager = new ThemeManager()
    this.constellationManager = new ConstellationManager(this.scene, this.themeManager)

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.worldPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    this.clock = new THREE.Clock()

    this.updateThemeLabel()
    this.setupEventListeners()
    this.animate()
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this))

    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this))
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this))
    window.addEventListener('mouseup', this.onMouseUp.bind(this))

    this.renderer.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false })

    window.addEventListener('keydown', this.onKeyDown.bind(this))

    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  private onWindowResize(): void {
    const aspect = window.innerWidth / window.innerHeight
    const viewSize = 600 / this.cameraZoom
    this.camera.left = -aspect * viewSize
    this.camera.right = aspect * viewSize
    this.camera.top = viewSize
    this.camera.bottom = -viewSize
    this.camera.position.x = this.cameraOffset.x
    this.camera.position.y = this.cameraOffset.y
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private updateCamera(): void {
    const aspect = window.innerWidth / window.innerHeight
    const viewSize = 600 / this.cameraZoom
    this.camera.left = -aspect * viewSize
    this.camera.right = aspect * viewSize
    this.camera.top = viewSize
    this.camera.bottom = -viewSize
    this.camera.position.x = this.cameraOffset.x
    this.camera.position.y = this.cameraOffset.y
    this.camera.updateProjectionMatrix()
  }

  private getWorldPosition(clientX: number, clientY: number): THREE.Vector3 {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const target = new THREE.Vector3()
    this.raycaster.ray.intersectPlane(this.worldPlane, target)
    return target
  }

  private onMouseDown(e: MouseEvent): void {
    const worldPos = this.getWorldPosition(e.clientX, e.clientY)

    if (e.button === 0) {
      this.constellationManager.startDrag(worldPos)
    } else if (e.button === 2) {
      this.isRightDragging = true
      this.lastRightMousePos = { x: e.clientX, y: e.clientY }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const worldPos = this.getWorldPosition(e.clientX, e.clientY)

    if (this.isRightDragging) {
      const dx = (e.clientX - this.lastRightMousePos.x) / this.cameraZoom
      const dy = (e.clientY - this.lastRightMousePos.y) / this.cameraZoom

      this.cameraOffset.x -= dx
      this.cameraOffset.y += dy
      this.updateCamera()

      this.lastRightMousePos = { x: e.clientX, y: e.clientY }
    } else {
      this.constellationManager.updateDrag(worldPos)
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      this.constellationManager.endDrag()
    } else if (e.button === 2) {
      this.isRightDragging = false
    }
  }

  private onWheel(e: WheelEvent): void {
    if (!e.ctrlKey) return
    e.preventDefault()

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.cameraZoom * zoomFactor))
    this.cameraZoom = newZoom
    this.updateCamera()
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === '1' || e.key === '2' || e.key === '3') {
      this.themeManager.switchTheme(e.key)
      this.updateThemeLabel()
    } else if (e.key === ' ') {
      e.preventDefault()
      this.constellationManager.toggleFlow()
    }
  }

  private updateThemeLabel(): void {
    if (this.themeLabel) {
      this.themeLabel.textContent = this.themeManager.getCurrentTheme().name
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this))
    const delta = this.clock.getDelta()
    this.constellationManager.update(delta)
    this.renderer.render(this.scene, this.camera)
  }
}

new App()
