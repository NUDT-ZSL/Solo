import * as THREE from 'three'
import { FireworkSystem } from './FireworkSystem'

class App {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private fireworkSystem: FireworkSystem
  private container: HTMLElement
  private starField: THREE.Points | null = null

  private selectedColor: THREE.Color = new THREE.Color('#FF6B6B')
  private intensity: number = 5

  private isRightMouseDown: boolean = false
  private lastMouseX: number = 0
  private lastMouseY: number = 0
  private cameraAngleY: number = 0
  private cameraAngleX: number = 0
  private cameraDistance: number = 25

  private clock: THREE.Clock
  private fpsFrames: number = 0
  private fpsTime: number = 0
  private currentFps: number = 60

  private fireworkCountEl: HTMLElement | null = null
  private fpsCountEl: HTMLElement | null = null

  constructor() {
    this.container = document.getElementById('canvas-container')!
    this.clock = new THREE.Clock()

    this.scene = new THREE.Scene()
    this.scene.background = null

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.updateCameraPosition()

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(0x05051a, 1)
    this.container.appendChild(this.renderer.domElement)

    this.fireworkSystem = new FireworkSystem(this.scene)

    this.createStarField()
    this.setupEventListeners()
    this.setupUI()
    this.animate()
  }

  private createStarField(): void {
    const starCount = 500
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)
    const sizes = new Float32Array(starCount)

    for (let i = 0; i < starCount; i++) {
      const radius = 30 + Math.random() * 20
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      colors[i * 3] = 1
      colors[i * 3 + 1] = 1
      colors[i * 3 + 2] = 1

      sizes[i] = 0.1 + Math.random() * 0.4
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.starField = new THREE.Points(geometry, material)
    this.scene.add(this.starField)
  }

  private updateCameraPosition(): void {
    const maxAngleX = Math.PI / 4
    this.cameraAngleX = Math.max(-maxAngleX, Math.min(maxAngleX, this.cameraAngleX))

    const x = this.cameraDistance * Math.sin(this.cameraAngleY) * Math.cos(this.cameraAngleX)
    const y = this.cameraDistance * Math.sin(this.cameraAngleX)
    const z = this.cameraDistance * Math.cos(this.cameraAngleY) * Math.cos(this.cameraAngleX)

    this.camera.position.set(x, y, z)
    this.camera.lookAt(0, 0, 0)
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this))

    const canvas = this.renderer.domElement

    canvas.addEventListener('contextmenu', (e) => e.preventDefault())

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this))
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this))
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this))
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this))

    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false })

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this))
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this))
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this))
  }

  private setupUI(): void {
    this.fireworkCountEl = document.getElementById('firework-count')
    this.fpsCountEl = document.getElementById('fps-counter')

    const swatches = document.querySelectorAll('.color-swatch')
    swatches.forEach((swatch) => {
      swatch.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        const color = target.dataset.color
        if (color) {
          this.selectedColor = new THREE.Color(color)
          swatches.forEach((s) => s.classList.remove('active'))
          target.classList.add('active')

          const slider = document.getElementById('intensity-slider') as HTMLInputElement
          if (slider) {
            const thumb = slider.querySelector('::-webkit-slider-thumb') as HTMLElement
            if (thumb) {
              thumb.style.background = color
            }
          }
        }
      })
    })

    const intensitySlider = document.getElementById('intensity-slider') as HTMLInputElement
    const intensityValue = document.getElementById('intensity-value') as HTMLElement

    if (intensitySlider && intensityValue) {
      intensitySlider.addEventListener('input', () => {
        this.intensity = parseInt(intensitySlider.value, 10)
        intensityValue.textContent = intensitySlider.value
      })
    }
  }

  private onMouseDown(e: MouseEvent): void {
    console.log('Mouse down:', e.button, e.clientX, e.clientY)
    if (e.button === 0) {
      this.spawnFireworkAtScreenPosition(e.clientX, e.clientY)
    } else if (e.button === 2) {
      this.isRightMouseDown = true
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isRightMouseDown) {
      const deltaX = e.clientX - this.lastMouseX
      const deltaY = e.clientY - this.lastMouseY

      this.cameraAngleY += deltaX * 0.005
      this.cameraAngleX -= deltaY * 0.005

      this.updateCameraPosition()

      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 2) {
      this.isRightMouseDown = false
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault()
    this.cameraDistance += e.deltaY * 0.05
    this.cameraDistance = Math.max(10, Math.min(40, this.cameraDistance))
    this.updateCameraPosition()
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      this.spawnFireworkAtScreenPosition(touch.clientX, touch.clientY)
      this.lastMouseX = touch.clientX
      this.lastMouseY = touch.clientY
    } else if (e.touches.length === 2) {
      this.isRightMouseDown = true
      const touch = e.touches[0]
      this.lastMouseX = touch.clientX
      this.lastMouseY = touch.clientY
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (this.isRightMouseDown && e.touches.length >= 1) {
      const touch = e.touches[0]
      const deltaX = touch.clientX - this.lastMouseX
      const deltaY = touch.clientY - this.lastMouseY

      this.cameraAngleY += deltaX * 0.005
      this.cameraAngleX -= deltaY * 0.005

      this.updateCameraPosition()

      this.lastMouseX = touch.clientX
      this.lastMouseY = touch.clientY
    }
  }

  private onTouchEnd(): void {
    this.isRightMouseDown = false
  }

  private spawnFireworkAtScreenPosition(screenX: number, screenY: number): void {
    const ndcX = (screenX / window.innerWidth) * 2 - 1
    const ndcY = -(screenY / window.innerHeight) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera)

    const distance = 15
    const direction = raycaster.ray.direction.clone()
    const position = raycaster.ray.origin.clone().add(direction.multiplyScalar(distance))

    this.fireworkSystem.createFirework(position, this.selectedColor, this.intensity)
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this))

    const deltaTime = this.clock.getDelta()
    this.fireworkSystem.update(deltaTime)

    this.fpsFrames++
    this.fpsTime += deltaTime
    if (this.fpsTime >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsTime)
      this.fpsFrames = 0
      this.fpsTime = 0
    }

    if (this.fireworkCountEl) {
      this.fireworkCountEl.textContent = this.fireworkSystem.getActiveFireworkCount().toString()
    }
    if (this.fpsCountEl) {
      this.fpsCountEl.textContent = this.currentFps.toString()
    }

    if (this.starField) {
      this.starField.rotation.y += deltaTime * 0.01
    }

    this.renderer.render(this.scene, this.camera)
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App()
})
