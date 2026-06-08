import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { FragmentSystem } from './Fragments'
import { ParticleSystem } from './ParticleSystem'

export class Engine {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private composer: EffectComposer
  private bloomPass: UnrealBloomPass
  private fragmentSystem: FragmentSystem
  private particleSystem: ParticleSystem
  private clock: THREE.Clock
  private animationId: number = 0
  private container: HTMLElement
  private fpsFrames: number = 0
  private fpsTime: number = 0
  private fpsDisplay: HTMLElement | null = null
  private pointLight: THREE.PointLight

  constructor(container: HTMLElement) {
    this.container = container
    this.clock = new THREE.Clock()

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#0d1117')
    this.scene.fog = new THREE.FogExp2('#0d1117', 0.015)

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    )
    this.camera.position.set(0, 2, 12)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 5
    this.controls.maxDistance = 30
    this.controls.target.set(0, 0, 0)

    this.setupLighting()

    this.fragmentSystem = new FragmentSystem(this.scene, this.camera, container)
    this.particleSystem = new ParticleSystem(this.scene)

    this.composer = new EffectComposer(this.renderer)
    const renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(renderPass)

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      1.2,
      0.4,
      0.2
    )
    this.composer.addPass(this.bloomPass)

    this.createFPSDisplay()
    this.setupResize()

    this.animate()
  }

  private setupLighting() {
    const ambientLight = new THREE.AmbientLight('#334466', 0.8)
    this.scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight('#ffeedd', 1.2)
    dirLight.position.set(5, 8, 5)
    this.scene.add(dirLight)

    const dirLight2 = new THREE.DirectionalLight('#aaccff', 0.5)
    dirLight2.position.set(-5, -3, -5)
    this.scene.add(dirLight2)

    this.pointLight = new THREE.PointLight('#ffffff', 1.5, 20)
    this.pointLight.position.set(0, 0, 8)
    this.scene.add(this.pointLight)
  }

  private createFPSDisplay() {
    this.fpsDisplay = document.createElement('div')
    this.fpsDisplay.style.cssText = `
      position: fixed; top: 12px; left: 12px;
      color: rgba(255,255,255,0.4); font-size: 11px;
      font-family: monospace; pointer-events: none; z-index: 100;
    `
    document.body.appendChild(this.fpsDisplay)
  }

  private setupResize() {
    const onResize = () => {
      const w = this.container.clientWidth
      const h = this.container.clientHeight
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(w, h)
      this.composer.setSize(w, h)
      this.bloomPass.resolution.set(w, h)
    }
    window.addEventListener('resize', onResize)
  }

  public resetCamera() {
    this.camera.position.set(0, 2, 12)
    this.controls.target.set(0, 0, 0)
    this.controls.update()
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate())

    const deltaTime = Math.min(this.clock.getDelta(), 0.1)
    const elapsedTime = this.clock.getElapsedTime()

    this.controls.update()

    this.pointLight.position.x = Math.sin(elapsedTime * 0.5) * 6
    this.pointLight.position.y = Math.cos(elapsedTime * 0.3) * 3

    this.fragmentSystem.update(elapsedTime, deltaTime)
    this.particleSystem.update(elapsedTime, deltaTime)

    this.composer.render()

    this.fpsFrames++
    this.fpsTime += deltaTime
    if (this.fpsTime >= 1.0) {
      if (this.fpsDisplay) {
        this.fpsDisplay.textContent = `${this.fpsFrames} FPS`
      }
      this.fpsFrames = 0
      this.fpsTime = 0
    }
  }

  public dispose() {
    cancelAnimationFrame(this.animationId)
    this.fragmentSystem.dispose()
    this.particleSystem.dispose()
    this.renderer.dispose()
    this.controls.dispose()
    if (this.fpsDisplay) {
      document.body.removeChild(this.fpsDisplay)
    }
    this.container.removeChild(this.renderer.domElement)
  }
}
