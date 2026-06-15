import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Galaxy } from './Galaxy'
import { setupControls, setupFPSCounter } from './controls'

class App {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private galaxy: Galaxy
  private updateFPS: (fps: number) => void
  private frameCount: number = 0
  private lastFpsTime: number = 0
  private animationId: number = 0

  constructor() {
    this.container = document.getElementById('app')!

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x000008)

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      3000
    )
    this.camera.position.set(0, 120, 260)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.minDistance = 5
    this.controls.maxDistance = 500
    this.controls.enablePan = true
    this.controls.target.set(0, 0, 0)

    this.galaxy = new Galaxy()
    this.scene.add(this.galaxy.group)

    setupControls(this.galaxy)
    this.updateFPS = setupFPSCounter()

    window.addEventListener('resize', this.onResize.bind(this))

    this.start()
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.galaxy.handleResize()
  }

  private start(): void {
    const animate = (): void => {
      this.animationId = requestAnimationFrame(animate)

      const now = performance.now()
      this.frameCount++
      if (now - this.lastFpsTime >= 1000) {
        this.updateFPS((this.frameCount * 1000) / (now - this.lastFpsTime))
        this.frameCount = 0
        this.lastFpsTime = now
      }

      this.galaxy.update()
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    }

    animate()
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId)
    window.removeEventListener('resize', this.onResize.bind(this))
    this.controls.dispose()
    this.galaxy.dispose()
    this.renderer.dispose()
    this.scene.clear()
  }
}

new App()
