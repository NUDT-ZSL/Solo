import * as THREE from 'three'
import { NeuralNetwork } from './network'
import { Neuron } from './neuron'

export interface CameraState {
  radius: number
  theta: number
  phi: number
  targetRadius: number
  targetTheta: number
  targetPhi: number
  lookAt: THREE.Vector3
}

export class InteractionManager {
  private readonly camera: THREE.PerspectiveCamera
  private readonly renderer: THREE.WebGLRenderer
  private readonly network: NeuralNetwork
  private readonly container: HTMLElement

  private raycaster: THREE.Raycaster
  private mouseNdc: THREE.Vector2

  public cameraState: CameraState
  private readonly minRadius = 5
  private readonly maxRadius = 50
  private readonly minPhi = 0.15
  private readonly maxPhi = Math.PI - 0.15

  private isDragging = false
  private lastMouseX = 0
  private lastMouseY = 0
  private dragThreshold = 3
  private dragDistance = 0
  private mouseDownX = 0
  private mouseDownY = 0
  private mouseDownTime = 0

  private zoomStartTime = 0
  private zoomStartRadius = 0
  private zoomEndRadius = 0
  private zoomDuration = 300
  private isZooming = false

  private onNeuronClickHandlers: Array<(neuron: Neuron) => void> = []

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    network: NeuralNetwork,
    container: HTMLElement,
    initialDistance: number = 25
  ) {
    this.camera = camera
    this.renderer = renderer
    this.network = network
    this.container = container

    this.raycaster = new THREE.Raycaster()
    this.mouseNdc = new THREE.Vector2()

    this.cameraState = {
      radius: initialDistance,
      theta: Math.PI * 0.25,
      phi: Math.PI * 0.4,
      targetRadius: initialDistance,
      targetTheta: Math.PI * 0.25,
      targetPhi: Math.PI * 0.4,
      lookAt: new THREE.Vector3(0, 0, 0)
    }

    this.bindEvents()
    this.updateCameraFromState(true)
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement

    dom.addEventListener('pointerdown', this.onPointerDown)
    dom.addEventListener('pointermove', this.onPointerMove)
    dom.addEventListener('pointerup', this.onPointerUp)
    dom.addEventListener('pointerleave', this.onPointerUp)
    dom.addEventListener('wheel', this.onWheel, { passive: false })
    dom.addEventListener('contextmenu', (e) => e.preventDefault())

    window.addEventListener('resize', this.onResize)
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    this.isDragging = true
    this.lastMouseX = e.clientX
    this.lastMouseY = e.clientY
    this.mouseDownX = e.clientX
    this.mouseDownY = e.clientY
    this.mouseDownTime = performance.now()
    this.dragDistance = 0
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isDragging) return

    const dx = e.clientX - this.lastMouseX
    const dy = e.clientY - this.lastMouseY
    this.dragDistance += Math.abs(dx) + Math.abs(dy)

    this.lastMouseX = e.clientX
    this.lastMouseY = e.clientY

    const rotSpeed = 0.005
    this.cameraState.targetTheta -= dx * rotSpeed
    this.cameraState.targetPhi += dy * rotSpeed

    this.cameraState.targetPhi = Math.max(
      this.minPhi,
      Math.min(this.maxPhi, this.cameraState.targetPhi)
    )
  }

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.isDragging) return
    this.isDragging = false

    const elapsed = performance.now() - this.mouseDownTime
    const moveDist = this.dragDistance

    if (moveDist <= this.dragThreshold && elapsed < 300) {
      this.handleClick(this.mouseDownX, this.mouseDownY)
    }
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    e.stopPropagation()

    const zoomFactor = Math.exp(e.deltaY * 0.001)
    let newRadius = this.cameraState.radius * zoomFactor

    const targetRange = this.maxRadius - this.minRadius
    const minR = this.minRadius + targetRange * 0.1
    const maxR = this.maxRadius - targetRange * 0.1
    newRadius = Math.max(minR, Math.min(maxR, newRadius))

    this.startZoomSmooth(newRadius)
  }

  private startZoomSmooth(targetRadius: number): void {
    this.zoomStartTime = performance.now()
    this.zoomStartRadius = this.cameraState.radius
    this.zoomEndRadius = targetRadius
    this.cameraState.targetRadius = targetRadius
    this.isZooming = true
  }

  private handleClick(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouseNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.mouseNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouseNdc, this.camera)

    const meshes = this.network.neurons.map(n => n.mesh)
    const intersects = this.raycaster.intersectObjects(meshes, false)

    if (intersects.length > 0) {
      const hit = intersects[0]
      const neuron = (hit.object as any).neuronRef as Neuron
      if (neuron) {
        this.onNeuronClickHandlers.forEach(fn => fn(neuron))
      }
    }
  }

  private onResize = (): void => {
    const width = this.container.clientWidth
    const height = this.container.clientHeight

    if (width <= 0 || height <= 0) return

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)

    this.adjustCameraDistanceForViewport(width, height)
  }

  private adjustCameraDistanceForViewport(width: number, height: number): void {
    const minDim = Math.min(width, height)
    if (minDim < 800) {
      const scale = 800 / minDim
      const targetR = 25 * Math.min(scale, 2)
      this.startZoomSmooth(targetR)
    }
  }

  public onNeuronClick(handler: (neuron: Neuron) => void): void {
    this.onNeuronClickHandlers.push(handler)
  }

  public update(currentTime: number, deltaTime: number): void {
    let needsUpdate = false

    const smoothing = Math.min(1, deltaTime * 6)

    if (Math.abs(this.cameraState.theta - this.cameraState.targetTheta) > 0.0001) {
      this.cameraState.theta += (this.cameraState.targetTheta - this.cameraState.theta) * smoothing
      needsUpdate = true
    } else {
      this.cameraState.theta = this.cameraState.targetTheta
    }

    if (Math.abs(this.cameraState.phi - this.cameraState.targetPhi) > 0.0001) {
      this.cameraState.phi += (this.cameraState.targetPhi - this.cameraState.phi) * smoothing
      needsUpdate = true
    } else {
      this.cameraState.phi = this.cameraState.targetPhi
    }

    if (this.isZooming) {
      const elapsed = currentTime - this.zoomStartTime
      const t = Math.min(1, elapsed / this.zoomDuration)
      const eased = this.easeInOutCubic(t)
      this.cameraState.radius =
        this.zoomStartRadius + (this.zoomEndRadius - this.zoomStartRadius) * eased
      needsUpdate = true
      if (t >= 1) {
        this.isZooming = false
        this.cameraState.radius = this.zoomEndRadius
      }
    } else if (Math.abs(this.cameraState.radius - this.cameraState.targetRadius) > 0.01) {
      this.cameraState.radius += (this.cameraState.targetRadius - this.cameraState.radius) * smoothing
      needsUpdate = true
    }

    if (needsUpdate) {
      this.updateCameraFromState()
    }
  }

  private updateCameraFromState(immediate: boolean = false): void {
    const { radius, theta, phi, lookAt } = this.cameraState

    const sinPhi = Math.sin(phi)
    const x = radius * sinPhi * Math.cos(theta)
    const y = radius * Math.cos(phi)
    const z = radius * sinPhi * Math.sin(theta)

    if (immediate) {
      this.camera.position.set(x, y, z)
    } else {
      this.camera.position.lerp(new THREE.Vector3(x, y, z), 1)
    }

    this.camera.lookAt(lookAt)
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  public dispose(): void {
    const dom = this.renderer.domElement
    dom.removeEventListener('pointerdown', this.onPointerDown)
    dom.removeEventListener('pointermove', this.onPointerMove)
    dom.removeEventListener('pointerup', this.onPointerUp)
    dom.removeEventListener('pointerleave', this.onPointerUp)
    dom.removeEventListener('wheel', this.onWheel)
    window.removeEventListener('resize', this.onResize)
  }
}
