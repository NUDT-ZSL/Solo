import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ParticleSystem, ParticleMode } from './ParticleSystem'

interface BackgroundColor {
  spiral: THREE.Color
  sphere: THREE.Color
  explosion: THREE.Color
  random: THREE.Color
}

export class InteractionController {
  private camera: THREE.Camera
  private renderer: THREE.WebGLRenderer
  private particleSystem: ParticleSystem
  private controls: OrbitControls
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private hoveredParticleIndex: number | null = null
  private selectedParticleIndex: number | null = null
  private infoPanel: HTMLElement
  private fpsCounter: HTMLElement
  private particleCounter: HTMLElement
  private modeButtons: NodeListOf<HTMLElement>
  private frameCount = 0
  private lastFpsUpdate = 0
  private currentFps = 60
  private currentBackgroundColor: THREE.Color
  private targetBackgroundColor: THREE.Color
  private backgroundColors: BackgroundColor = {
    spiral: new THREE.Color(0x0a0a1a),
    sphere: new THREE.Color(0x1a0a2e),
    explosion: new THREE.Color(0x2e0a1a),
    random: new THREE.Color(0x0a1a2e)
  }
  private lastMouseMove = 0
  private mouseMoveThrottle = 16

  constructor(
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    particleSystem: ParticleSystem,
    scene: THREE.Scene
  ) {
    this.camera = camera
    this.renderer = renderer
    this.particleSystem = particleSystem

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.95
    this.controls.minDistance = 10
    this.controls.maxDistance = 100
    this.controls.enablePan = false
    this.controls.rotateSpeed = 0.5
    this.controls.zoomSpeed = 0.8

    this.raycaster = new THREE.Raycaster()
    this.raycaster.params.Points.threshold = 2

    this.mouse = new THREE.Vector2()

    this.currentBackgroundColor = this.backgroundColors.spiral.clone()
    this.targetBackgroundColor = this.backgroundColors.spiral.clone()
    scene.background = this.currentBackgroundColor

    const infoPanel = document.getElementById('info-panel')
    const fpsCounter = document.getElementById('fps-counter')
    const particleCounter = document.getElementById('particle-counter')

    if (!infoPanel || !fpsCounter || !particleCounter) {
      throw new Error('Required UI elements not found')
    }

    this.infoPanel = infoPanel
    this.fpsCounter = fpsCounter
    this.particleCounter = particleCounter

    this.modeButtons = document.querySelectorAll('.mode-btn')

    this.particleCounter.textContent = `粒子: ${this.particleSystem.getCount()}`

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove.bind(this))
    this.renderer.domElement.addEventListener('click', this.handleClick.bind(this))
    window.addEventListener('resize', this.handleResize.bind(this))
    document.addEventListener('click', this.handleDocumentClick.bind(this))

    this.modeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation()
        const mode = button.getAttribute('data-mode') as ParticleMode
        this.switchMode(mode)
      })
    })
  }

  private handleMouseMove(e: MouseEvent): void {
    const now = performance.now()
    if (now - this.lastMouseMove < this.mouseMoveThrottle) return
    this.lastMouseMove = now

    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    this.checkHover()
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObject(this.particleSystem.getPoints())

    if (intersects.length > 0) {
      const index = intersects[0].index
      if (index !== undefined && index !== this.hoveredParticleIndex) {
        if (this.hoveredParticleIndex !== null) {
          this.particleSystem.resetHighlight()
        }
        this.hoveredParticleIndex = index
        this.particleSystem.highlightParticle(index)

        const point = intersects[0].point
        this.particleSystem.setRepelCenter(point)

        document.body.style.cursor = 'pointer'
      }
    } else {
      if (this.hoveredParticleIndex !== null) {
        this.particleSystem.resetHighlight()
        this.particleSystem.setRepelCenter(null)
        this.hoveredParticleIndex = null
        document.body.style.cursor = 'grab'
      }
    }
  }

  private handleClick(e: MouseEvent): void {
    if (this.controls.getState() !== undefined) return

    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObject(this.particleSystem.getPoints())

    if (intersects.length > 0) {
      const index = intersects[0].index
      if (index !== undefined) {
        this.selectParticle(index)
        e.stopPropagation()
      }
    }
  }

  private handleDocumentClick(): void {
    if (this.selectedParticleIndex !== null) {
      this.hideInfoPanel()
    }
  }

  private selectParticle(index: number): void {
    this.selectedParticleIndex = index
    const data = this.particleSystem.getParticleData(index)

    if (data) {
      this.showInfoPanel(data)
    }
  }

  private showInfoPanel(data: { id: number; position: THREE.Vector3; velocity: THREE.Vector3 }): void {
    const idElement = document.getElementById('info-id')
    const positionElement = document.getElementById('info-position')
    const velocityElement = document.getElementById('info-velocity')

    if (idElement && positionElement && velocityElement) {
      idElement.textContent = `#${data.id.toString().padStart(4, '0')}`
      positionElement.textContent = `(${data.position.x.toFixed(2)}, ${data.position.y.toFixed(2)}, ${data.position.z.toFixed(2)})`
      velocityElement.textContent = data.velocity.length().toFixed(4)
    }

    this.infoPanel.classList.remove('hidden', 'slide-out')
  }

  private hideInfoPanel(): void {
    this.infoPanel.classList.add('slide-out')
    setTimeout(() => {
      this.infoPanel.classList.add('hidden')
      this.infoPanel.classList.remove('slide-out')
    }, 300)
    this.selectedParticleIndex = null
  }

  private switchMode(mode: ParticleMode): void {
    this.particleSystem.switchMode(mode)
    this.targetBackgroundColor = this.backgroundColors[mode].clone()

    this.modeButtons.forEach(button => {
      const buttonMode = button.getAttribute('data-mode')
      if (buttonMode === mode) {
        button.classList.add('active')
      } else {
        button.classList.remove('active')
      }
    })
  }

  private handleResize(): void {
    this.resize()
  }

  resize(): void {
    const container = this.renderer.domElement.parentElement
    if (container) {
      const width = container.clientWidth
      const height = container.clientHeight
      ;(this.camera as THREE.PerspectiveCamera).aspect = width / height
      ;(this.camera as THREE.PerspectiveCamera).updateProjectionMatrix()
      this.renderer.setSize(width, height)
    }
  }

  update(delta: number, scene: THREE.Scene): void {
    this.controls.update()
    this.updateFPS()
    this.updateBackgroundColor(scene, delta)

    if (this.hoveredParticleIndex !== null) {
      const data = this.particleSystem.getParticleData(this.hoveredParticleIndex)
      if (data) {
        this.particleSystem.setRepelCenter(data.position)
      }
    }
  }

  private updateFPS(): void {
    this.frameCount++
    const now = performance.now()

    if (now - this.lastFpsUpdate >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate))
      this.fpsCounter.textContent = `FPS: ${this.currentFps}`

      if (this.currentFps < 30) {
        this.fpsCounter.classList.add('low-fps')
      } else {
        this.fpsCounter.classList.remove('low-fps')
      }

      this.frameCount = 0
      this.lastFpsUpdate = now
    }
  }

  private updateBackgroundColor(scene: THREE.Scene, delta: number): void {
    const colorSpeed = 2
    this.currentBackgroundColor.lerp(this.targetBackgroundColor, delta * colorSpeed)
    scene.background = this.currentBackgroundColor.clone()
  }

  getCameraDistance(): number {
    return this.camera.position.length()
  }

  dispose(): void {
    this.controls.dispose()
    this.renderer.domElement.removeEventListener('mousemove', this.handleMouseMove.bind(this))
    this.renderer.domElement.removeEventListener('click', this.handleClick.bind(this))
    window.removeEventListener('resize', this.handleResize.bind(this))
    document.removeEventListener('click', this.handleDocumentClick.bind(this))
  }
}
