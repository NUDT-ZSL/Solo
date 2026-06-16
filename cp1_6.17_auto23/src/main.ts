import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { loadStarsData, createStarsSystem, StarsSystem } from './stars'
import { loadConstellationData, createConstellationSystem, ConstellationSystem, ConstellationData } from './constellations'
import { createUIManager, UIManager } from './ui'

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

  constructor() {
    this.container = document.getElementById('app')!
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#0A0A1E')

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

  private setupEventListeners() {
    window.addEventListener('resize', this.onWindowResize.bind(this))

    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this))
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this))
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this))
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  private onMouseDown(e: MouseEvent) {
    if (e.button === 0) {
      this.isDragging = false
      this.mouseDownPos = { x: e.clientX, y: e.clientY }
    }
  }

  private onMouseMove(e: MouseEvent) {
    if (e.button === 0) {
      const dx = Math.abs(e.clientX - this.mouseDownPos.x)
      const dy = Math.abs(e.clientY - this.mouseDownPos.y)
      if (dx > 3 || dy > 3) {
        this.isDragging = true
      }
    }
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button !== 0) return
    const dx = Math.abs(e.clientX - this.mouseDownPos.x)
    const dy = Math.abs(e.clientY - this.mouseDownPos.y)
    if (dx > 3 || dy > 3) return
    this.handleClick(e)
  }

  private handleClick(e: MouseEvent) {
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

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  public async init() {
    const [starsData, constellationData] = await Promise.all([
      loadStarsData(),
      loadConstellationData()
    ])

    this.starsSystem = createStarsSystem(starsData)
    this.scene.add(this.starsSystem.points)

    this.constellationSystem = createConstellationSystem(constellationData, starsData)
    this.scene.add(this.constellationSystem.group)

    this.animate()
  }

  private animate() {
    requestAnimationFrame(this.animate.bind(this))

    const delta = this.clock.getDelta()
    const cameraDistance = this.camera.position.length()

    this.controls.update()
    this.starsSystem.update(delta, cameraDistance)
    this.constellationSystem.update(delta)
    this.renderer.render(this.scene, this.camera)
  }
}

const app = new App()
app.init().catch(err => {
  console.error('Failed to initialize app:', err)
})
