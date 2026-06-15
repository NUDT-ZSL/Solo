import * as THREE from 'three'
import { createHeatmapMeshes, updateHeatmap, createGroundPlane, createGridLines } from './HeatmapGrid'

export class SceneManager {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private heatmapMesh: THREE.InstancedMesh
  private animationId: number = 0
  private breathTime: number = 0
  private container: HTMLElement
  private currentData: number[][] = []

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0f172a)
    this.scene.fog = new THREE.Fog(0x0f172a, 80, 160)

    const aspect = container.clientWidth / container.clientHeight
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 500)
    this.camera.position.set(50, 45, 50)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = false
    container.appendChild(this.renderer.domElement)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(30, 50, 30)
    this.scene.add(dirLight)

    const dirLight2 = new THREE.DirectionalLight(0x60a5fa, 0.3)
    dirLight2.position.set(-30, 20, -30)
    this.scene.add(dirLight2)

    createGroundPlane(this.scene)
    createGridLines(this.scene)
    this.heatmapMesh = createHeatmapMeshes(this.scene)

    window.addEventListener('resize', this.onResize)
    this.animate()
  }

  private onResize = () => {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate)
    this.breathTime += 0.016
    const breathFactor = 0.9 + 0.1 * ((Math.sin(this.breathTime * (2 * Math.PI / 3)) + 1) / 2)
    if (this.currentData.length > 0) {
      updateHeatmap(this.heatmapMesh, this.currentData, breathFactor)
    }
    this.renderer.render(this.scene, this.camera)
  }

  updateNoiseData(data: number[][]) {
    this.currentData = data
  }

  enableOrbitControls() {
    let isDragging = false
    let prevX = 0
    let prevY = 0
    let spherical = new THREE.Spherical().setFromVector3(this.camera.position)
    const target = new THREE.Vector3(0, 0, 0)

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true
      prevX = e.clientX
      prevY = e.clientY
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - prevX
      const dy = e.clientY - prevY
      prevX = e.clientX
      prevY = e.clientY
      spherical.theta -= dx * 0.005
      spherical.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, spherical.phi - dy * 0.005))
      this.camera.position.setFromSpherical(spherical)
      this.camera.lookAt(target)
    }
    const onMouseUp = () => { isDragging = false }
    const onWheel = (e: WheelEvent) => {
      spherical.radius = Math.max(20, Math.min(120, spherical.radius + e.deltaY * 0.05))
      this.camera.position.setFromSpherical(spherical)
      this.camera.lookAt(target)
    }

    this.renderer.domElement.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    this.renderer.domElement.addEventListener('wheel', onWheel)
  }

  destroy() {
    window.removeEventListener('resize', this.onResize)
    cancelAnimationFrame(this.animationId)
    this.renderer.dispose()
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
