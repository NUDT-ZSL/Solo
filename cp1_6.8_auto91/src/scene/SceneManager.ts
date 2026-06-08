import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DuneSimulator } from './DuneSimulator'
import { DustParticle } from './DustParticle'
import { AudioFeedback } from './AudioFeedback'
import { useDuneStore, ClickedPointData } from '@/store/useDuneStore'

export class SceneManager {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  dune: DuneSimulator
  dust: DustParticle
  audio: AudioFeedback
  private clock: THREE.Clock
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private container: HTMLElement
  private animationId: number = 0
  private unsubscribe: () => void

  constructor(container: HTMLElement) {
    this.container = container
    this.clock = new THREE.Clock()
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(0x3D1F47, 0.025)

    this.camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    )
    this.camera.position.set(8, 6, 10)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.9
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.maxPolarAngle = Math.PI / 2.1
    this.controls.minDistance = 4
    this.controls.maxDistance = 30

    this.setupLighting()
    this.setupSkyGradient()

    const state = useDuneStore.getState()
    this.dune = new DuneSimulator(state.noiseSeed)
    this.scene.add(this.dune.mesh)
    this.scene.add(this.dune.wireframe)

    this.dust = new DustParticle(4000)
    this.scene.add(this.dust.points)

    this.audio = new AudioFeedback()

    this.unsubscribe = useDuneStore.subscribe((state, prev) => {
      if (state.noiseSeed !== prev.noiseSeed) {
        this.dune.updateSeed(state.noiseSeed)
      }
    })

    this.renderer.domElement.addEventListener('click', this.onClick)
    window.addEventListener('resize', this.onResize)
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0xD4542A, 0.4)
    this.scene.add(ambient)

    const sun = new THREE.DirectionalLight(0xE8A838, 1.8)
    sun.position.set(-5, 4, -8)
    this.scene.add(sun)

    const fill = new THREE.DirectionalLight(0x8B2252, 0.3)
    fill.position.set(5, 3, 5)
    this.scene.add(fill)

    const hemi = new THREE.HemisphereLight(0xE8A838, 0x3D1F47, 0.5)
    this.scene.add(hemi)
  }

  private setupSkyGradient() {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, 512)
    gradient.addColorStop(0, '#8B2252')
    gradient.addColorStop(0.3, '#D4542A')
    gradient.addColorStop(0.6, '#E8A838')
    gradient.addColorStop(1, '#C4A35A')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 2, 512)

    const texture = new THREE.CanvasTexture(canvas)
    texture.magFilter = THREE.LinearFilter
    this.scene.background = texture
  }

  private onClick = (event: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObject(this.dune.mesh)

    if (intersects.length > 0) {
      const point = intersects[0].point
      const state = useDuneStore.getState()

      this.dune.triggerAvalanche(point)
      this.dust.triggerBurst(point)
      this.audio.init()
      this.audio.playAvalanche()

      const slope = this.dune.getSlopeAt(point)
      const grainSize = Math.round((0.1 + Math.random() * 0.4) * 100) / 100

      const screenPos = point.clone().project(this.camera)
      const sx = (screenPos.x * 0.5 + 0.5) * this.container.clientWidth
      const sy = (-screenPos.y * 0.5 + 0.5) * this.container.clientHeight

      const clickData: ClickedPointData = {
        x: Math.round(point.x * 100) / 100,
        y: Math.round(point.y * 100) / 100,
        z: Math.round(point.z * 100) / 100,
        slope,
        windSpeed: state.windSpeed,
        grainSize,
        screenX: sx,
        screenY: sy,
      }

      useDuneStore.getState().setClickedPoint(clickData)

      setTimeout(() => {
        useDuneStore.getState().clearClickedPoint()
      }, 3000)
    }
  }

  private onResize = () => {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  start() {
    this.audio.init()
    const animate = () => {
      this.animationId = requestAnimationFrame(animate)
      const dt = Math.min(this.clock.getDelta(), 0.05)
      const state = useDuneStore.getState()

      this.dune.update(dt, state.windSpeed, state.windDirection, state.duneAmplitude)
      this.dust.update(dt, state.windSpeed, state.windDirection)
      this.audio.updateWind(state.windSpeed)

      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    }
    animate()
  }

  stop() {
    cancelAnimationFrame(this.animationId)
    this.unsubscribe()
    this.renderer.domElement.removeEventListener('click', this.onClick)
    window.removeEventListener('resize', this.onResize)
  }

  dispose() {
    this.stop()
    this.dune.dispose()
    this.dust.dispose()
    this.audio.dispose()
    this.renderer.dispose()
    this.controls.dispose()
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement)
    }
  }
}
