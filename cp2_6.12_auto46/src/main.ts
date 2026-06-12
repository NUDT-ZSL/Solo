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
    this.renderer.setClearColor(0x0a0a2e, 1)

    this.container.appendChild(this.renderer.domElement)

    this.ambientLight = new THREE.AmbientLight(0x404060, 0.5)
    this.scene.add(this.ambientLight)

    this.pointLight = new THREE.PointLight(0xffffff, 2, 200)
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
    const twinkleData = new Float32Array(count * 2)

    for (let i = 0; i < count; i++) {
      const radius = 150 + Math.random() * 100
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      const brightness = 0.6 + Math.random() * 0.4
      colors[i * 3] = brightness
      colors[i * 3 + 1] = brightness
      colors[i * 3 + 2] = brightness * (0.9 + Math.random() * 0.15)

      twinkleData[i * 2] = 0.5 + Math.random() * 2
      twinkleData[i * 2 + 1] = Math.random() * Math.PI * 2
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('twinkleData', new THREE.BufferAttribute(twinkleData, 2))

    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
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
    const colors = geometry.attributes.color.array as Float32Array
    const twinkleData = geometry.attributes.twinkleData.array as Float32Array
    const baseColors = geometry.attributes.color.array as Float32Array

    for (let i = 0; i < twinkleData.length / 2; i++) {
      const speed = twinkleData[i * 2]
      const offset = twinkleData[i * 2 + 1]
      const twinkle = Math.sin(time * speed + offset) * 0.3 + 0.7

      colors[i * 3] = baseColors[i * 3] * twinkle
      colors[i * 3 + 1] = baseColors[i * 3 + 1] * twinkle
      colors[i * 3 + 2] = baseColors[i * 3 + 2] * twinkle
    }

    geometry.attributes.color.needsUpdate = true

    this.starField.rotation.y += delta * 0.01
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this))

    const delta = Math.min(this.clock.getDelta(), 0.1)

    this.updateStarField(delta)

    const cameraDistance = this.interactionController.getCameraDistance()
    this.particleSystem.update(delta, cameraDistance)

    this.interactionController.update(delta)

    const lightPulse = Math.sin(performance.now() * 0.001) * 0.3 + 1.7
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
