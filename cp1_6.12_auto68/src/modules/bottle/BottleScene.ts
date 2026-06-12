import * as THREE from 'three'

interface ParticleData {
  baseY: number
  speed: number
  rotationSpeed: number
  phase: number
  radius: number
  colorIndex: number
}

export interface BottleSceneHandle {
  updateColor: (r: number, g: number, b: number) => void
  updateParticles: (colors: { color: string; ratio: number }[]) => void
  dispose: () => void
}

export class BottleScene {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private bottleBody!: THREE.Mesh
  private bottleLiquid!: THREE.Mesh
  private bottleCap!: THREE.Mesh
  private particles!: THREE.Points
  private particleData: ParticleData[] = []
  private targetColor = new THREE.Color(0.3, 0.3, 0.6)
  private currentColor = new THREE.Color(0.3, 0.3, 0.6)
  private animationId: number = 0
  private isRunning = true
  private particleColors: THREE.Color[] = []

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })

    this.init()
  }

  private init() {
    const width = this.container.clientWidth
    const height = this.container.clientHeight

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(width, height)
    this.renderer.setClearColor(0x000000, 0)
    this.container.appendChild(this.renderer.domElement)

    this.camera.position.set(0, 0.5, 5)
    this.camera.lookAt(0, 0.2, 0)

    this.setupLights()
    this.createBottle()
    this.createParticles()
    this.setupResize()
    this.animate()
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambient)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(3, 5, 3)
    this.scene.add(dirLight)

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3)
    fillLight.position.set(-3, 2, -3)
    this.scene.add(fillLight)
  }

  private createBottle() {
    const bodyGeometry = new THREE.CylinderGeometry(0.6, 0.5, 1.6, 48, 1, false)
    const positions = bodyGeometry.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i)
      const t