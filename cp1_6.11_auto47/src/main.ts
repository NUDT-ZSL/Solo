import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ParticleMemorySystem } from './particleMemory'
import { UIController } from './ui'

const INITIAL_CAMERA_POS = new THREE.Vector3(0, 5, 20)
const INITIAL_CAMERA_TARGET = new THREE.Vector3(0, 0, 0)

class CrystalMemoryApp {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private particleSystem: ParticleMemorySystem
  private ui: UIController
  private clock = new THREE.Clock()
  private animationId = 0
  private isAnimatingCamera = false
  private cameraAnimStart = new THREE.Vector3()
  private cameraAnimTarget = new THREE.Vector3()
  private cameraAnimLookStart = new THREE.Vector3()
  private cameraAnimLookTarget = new THREE.Vector3()
  private cameraAnimStartTime = 0
  private cameraAnimDuration = 0

  constructor() {
    const container = document.getElementById('app')!

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(0x000000, 0)
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.copy(INITIAL_CAMERA_POS)
    this.camera.lookAt(INITIAL_CAMERA_TARGET)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.rotateSpeed = 0.2
    this.controls.enablePan = false
    this.controls.minDistance = 5
    this.controls.maxDistance = 60
    this.controls.target.copy(INITIAL_CAMERA_TARGET)

    this.particleSystem = new ParticleMemorySystem(this.scene)
    this.ui = new UIController(container, this.particleSystem)

    this.setupScene()
    this.setupInteractionHandlers()
    this.startAnimation()

    this.hideLoading()
  }

  private setupScene() {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5)
    this.scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0x6688cc, 0.8, 100)
    pointLight.position.set(0, 10, 0)
    this.scene.add(pointLight)

    this.createStarfield()
  }

  private createStarfield() {
    const starCount = 1500
    const positions = new Float32Array(starCount * 3)
    const sizes = new Float32Array(starCount)

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200
      sizes[i] = Math.random() * 0.08 + 0.02
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const stars = new THREE.Points(geometry, material)
    this.scene.add(stars)
  }

  private setupInteractionHandlers() {
    this.renderer.domElement.addEventListener('click', (e) => {
      const clicked = this.particleSystem.handleClick(e, this.camera)
      if (clicked && !clicked.isRecalled) {
        this.particleSystem.recallCluster(clicked)
      }
    })

    this.particleSystem.setOrbClickHandler(() => {
      this.particleSystem.dismissRecall()
    })

    this.particleSystem.setClusterClickHandler((cluster) => {
      this.particleSystem.recallCluster(cluster)
    })

    this.ui.setTimelineClickHandler((clusterId) => {
      const cluster = this.particleSystem.findClusterById(clusterId)
      if (cluster) {
        this.animateCameraToTarget(cluster.center)
        this.particleSystem.highlightCluster(cluster)
      }
    })

    this.ui.setResetCameraHandler(() => {
      this.animateCameraToTarget(INITIAL_CAMERA_TARGET, INITIAL_CAMERA_POS, 0.8)
    })

    window.addEventListener('resize', () => this.onResize())
  }

  private animateCameraToTarget(
    lookTarget: THREE.Vector3,
    cameraPos?: THREE.Vector3,
    duration: number = 0.5
  ) {
    this.isAnimatingCamera = true
    this.cameraAnimStart.copy(this.camera.position)
    this.cameraAnimLookStart.copy(this.controls.target)
    this.cameraAnimLookTarget.copy(lookTarget)

    if (cameraPos) {
      this.cameraAnimTarget.copy(cameraPos)
    } else {
      const direction = new THREE.Vector3()
        .subVectors(this.camera.position, this.controls.target)
        .normalize()
      const dist = Math.max(this.camera.position.distanceTo(lookTarget), 8)
      this.cameraAnimTarget.copy(
        lookTarget.clone().add(direction.multiplyScalar(dist * 0.5))
      )
    }

    this.cameraAnimStartTime = performance.now()
    this.cameraAnimDuration = duration
  }

  private updateCameraAnimation() {
    if (!this.isAnimatingCamera) return

    const elapsed = (performance.now() - this.cameraAnimStartTime) / 1000
    const t = Math.min(elapsed / this.cameraAnimDuration, 1.0)
    const eased = 1 - Math.pow(1 - t, 3)

    this.camera.position.lerpVectors(this.cameraAnimStart, this.cameraAnimTarget, eased)
    this.controls.target.lerpVectors(this.cameraAnimLookStart, this.cameraAnimLookTarget, eased)
    this.controls.update()

    if (t >= 1.0) {
      this.isAnimatingCamera = false
    }
  }

  private startAnimation() {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate)

      const delta = this.clock.getDelta()

      this.particleSystem.update(delta)
      this.updateCameraAnimation()

      if (!this.isAnimatingCamera) {
        this.controls.update()
      }

      this.renderer.render(this.scene, this.camera)
    }
    animate()
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private hideLoading() {
    const loading = document.getElementById('loading')
    if (loading) {
      loading.classList.add('fade-out')
      setTimeout(() => {
        loading.remove()
      }, 700)
    }
  }
}

new CrystalMemoryApp()
