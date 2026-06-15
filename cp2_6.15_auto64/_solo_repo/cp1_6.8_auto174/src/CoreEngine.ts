import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { NebulaSimulator } from './NebulaSimulator'
import { StarFormation, StarCore } from './StarFormation'
import { useSimStore } from './store'

export class CoreEngine {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  composer: EffectComposer
  bloomPass: UnrealBloomPass

  nebula: NebulaSimulator
  starFormation: StarFormation

  private clock: THREE.Clock
  private animationId: number = 0
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private bgStars: THREE.Points
  private onStarClick: ((star: StarCore) => void) | null = null
  private defaultCameraPos = new THREE.Vector3(0, 8, 30)
  private defaultCameraTarget = new THREE.Vector3(0, 0, 0)

  constructor(container: HTMLElement) {
    this.clock = new THREE.Clock()
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x000000)

    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 200)
    this.camera.position.copy(this.defaultCameraPos)
    this.camera.lookAt(this.defaultCameraTarget)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 8
    this.controls.maxDistance = 80
    this.controls.target.copy(this.defaultCameraTarget)

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      1.2, 0.4, 0.85
    )
    this.composer.addPass(this.bloomPass)

    this.nebula = new NebulaSimulator()
    this.scene.add(this.nebula.points)

    this.starFormation = new StarFormation()
    this.scene.add(this.starFormation.group)

    this.bgStars = this.createBgStars()
    this.scene.add(this.bgStars)

    const ambient = new THREE.AmbientLight(0x111122, 0.3)
    this.scene.add(ambient)

    this.renderer.domElement.addEventListener('click', this.handleClick.bind(this))
    window.addEventListener('resize', this.handleResize.bind(this))

    useSimStore.subscribe((state) => {
      this.bloomPass.strength = 1.0 * state.glowIntensity
    })
  }

  setOnStarClick(cb: (star: StarCore) => void) {
    this.onStarClick = cb
  }

  private createBgStars(): THREE.Points {
    const count = 1500
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const cols = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const r = 60 + Math.random() * 80
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i3 + 2] = r * Math.cos(phi)

      const brightness = 0.5 + Math.random() * 0.5
      const tint = Math.random()
      if (tint < 0.3) {
        cols[i3] = 0.7 * brightness
        cols[i3 + 1] = 0.8 * brightness
        cols[i3 + 2] = 1.0 * brightness
      } else {
        cols[i3] = brightness
        cols[i3 + 1] = brightness
        cols[i3 + 2] = brightness
      }
      sizes[i] = 0.3 + Math.random() * 0.8
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3))

    const mat = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      depthWrite: false,
    })

    return new THREE.Points(geo, mat)
  }

  private handleClick(event: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const meshes = this.starFormation.stars.map(s => s.mesh)
    if (meshes.length === 0) return

    const intersects = this.raycaster.intersectObjects(meshes, false)
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object
      const star = this.starFormation.stars.find(s => s.mesh === hitMesh)
      if (star && this.onStarClick) {
        this.starFormation.triggerBurst(star)
        this.onStarClick(star)
      }
    }
  }

  resetCamera() {
    this.camera.position.copy(this.defaultCameraPos)
    this.controls.target.copy(this.defaultCameraTarget)
    this.controls.update()
  }

  private handleResize() {
    const container = this.renderer.domElement.parentElement
    if (!container) return
    const w = container.clientWidth
    const h = container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this.composer.setSize(w, h)
  }

  start() {
    this.clock.start()
    this.animate()
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate())
    const delta = this.clock.getDelta()
    const time = this.clock.getElapsedTime()

    this.controls.update()

    const clusters = this.nebula.update(delta)
    for (const cluster of clusters) {
      this.starFormation.tryFormStar(cluster)
    }

    this.starFormation.update(time)
    this.composer.render()
  }

  stop() {
    cancelAnimationFrame(this.animationId)
  }

  dispose() {
    this.stop()
    this.nebula.dispose()
    this.starFormation.dispose()
    this.bgStars.geometry.dispose()
    ;(this.bgStars.material as THREE.Material).dispose()
    this.renderer.dispose()
    window.removeEventListener('resize', this.handleResize.bind(this))
  }
}
