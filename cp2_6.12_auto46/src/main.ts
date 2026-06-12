import * as THREE from 'three'
import { ParticleSystem } from './ParticleSystem'
import { InteractionController } from './InteractionController'
import './style.css'

class App {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private particleSystem: ParticleSystem
  private interactionController: InteractionController
  private starField: THREE.Points
  private ambientLight: THREE.AmbientLight
  private pointLight: THREE.PointLight
  private clock: THREE.Clock
  private container: HTMLElement

  constructor() {
    this.clock = new THREE.Clock()

    const container = document.getElementById('canvas-container')
    if (!container) {
      throw new Error('Canvas container not found')
    }
    this.container = container

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(0x000010, 0.008)

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 30, 50)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(0x0a0a1a, 1)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2

    this.container.appendChild(this.renderer.domElement)

    this.ambientLight = new THREE.AmbientLight(0x404060, 0.4)
    this.scene.add(this.ambientLight)

    this.pointLight = new THREE.PointLight(0xffffff, 1.5, 200)
    this.pointLight.position.set(0, 0, 0)
    this.scene.add(this.pointLight)

    this.starField = this.createStarField(200)
    this.scene.add(this.starField)

    this.particleSystem = new ParticleSystem(2000)
    this.scene.add(this.particleSystem.getPoints())

    this.interactionController = new InteractionController(
      this.camera,
      this.renderer,
      this.particleSystem,
      this.scene
    )

    window.addEventListener('resize', this.handleResize.bind(this))

    this.animate()
  }

  private createStarField(count: number): THREE.Points {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const twinkleSpeeds = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const radius = 150 + Math.random() * 100
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      const brightness = 0.5 + Math.random() * 0.5
      colors[i * 3] = brightness
      colors[i * 3 + 1] = brightness
      colors[i * 3 + 2] = brightness * (0.9 + Math.random() * 0.2)

      sizes[i] = 0.5 + Math.random() * 1.5
      twinkleSpeeds[i] = 0.5 + Math.random() * 2
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('twinkleSpeed', new THREE.BufferAttribute(twinkleSpeeds, 1))

    const material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: false
    })

    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false

    return points
  }

  private updateStarField(delta: number): void {
    const time = performance.now() * 0.001
    const geometry = this.starField.geometry
    const sizes = geometry.attributes.size.array as Float32Array
    const baseSizes = geometry.attributes.size.array as Float32Array
    const twinkleSpeeds = geometry.attributes.twinkleSpeed.array as Float32Array

    for (let i = 0; i < sizes.length; i++) {
      const twinkle = Math.sin(time * twinkleSpeeds[i] + i) * 0.3 + 0.7
      sizes[i] = baseSizes[i] * twinkle
    }

    geometry.attributes.size.needsUpdate = true

    this.starField.rotation.y += delta * 0.005
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.interactionController.resize()
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this))

    const delta = Math.min(this.clock.getDelta(), 0.1)

    this.updateStarField(delta)

    const cameraDistance = this.interactionController.getCameraDistance()
    this.particleSystem.update(delta, cameraDistance)

    this.interactionController.update(delta, this.scene)

    const lightPulse = Math.sin(performance.now() * 0.001) * 0.2 + 1.3
    this.pointLight.intensity = lightPulse

    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    window.removeEventListener('resize', this.handleResize.bind(this))
    this.interactionController.dispose()
    this.particleSystem.dispose()
    this.starField.geometry.dispose()
    ;(this.starField.material as THREE.Material).dispose()
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }
}

let app: App

try {
  app = new App()
} catch (error) {
  console.error('Failed to initialize application:', error)
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (app) {
      app.dispose()
    }
  })
}
