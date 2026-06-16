import * as THREE from 'three'

export interface CameraState {
  theta: number
  phi: number
  radius: number
  target: THREE.Vector3
}

export class InteractionController {
  private cameraState: CameraState
  private isDragging: boolean = false
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 }
  private minRadius: number = 30
  private maxRadius: number = 300
  private rotateSpeed: number = 0.005
  private zoomSpeed: number = 0.001
  private onCameraChange: (() => void) | null = null
  private onTrailUpdate: ((position: THREE.Vector3) => void) | null = null
  private canvas: HTMLElement | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2

  constructor(initialRadius: number = 150) {
    this.cameraState = {
      theta: 0,
      phi: Math.PI / 2,
      radius: initialRadius,
      target: new THREE.Vector3(0, 0, 0)
    }
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
  }

  attach(canvas: HTMLElement, camera: THREE.PerspectiveCamera): void {
    this.canvas = canvas
    this.camera = camera

    canvas.addEventListener('mousedown', this.handleMouseDown)
    canvas.addEventListener('mousemove', this.handleMouseMove)
    canvas.addEventListener('mouseup', this.handleMouseUp)
    canvas.addEventListener('mouseleave', this.handleMouseUp)
    canvas.addEventListener('wheel', this.handleWheel, { passive: false })

    this.updateCameraPosition()
  }

  detach(): void {
    if (!this.canvas) return

    this.canvas.removeEventListener('mousedown', this.handleMouseDown)
    this.canvas.removeEventListener('mousemove', this.handleMouseMove)
    this.canvas.removeEventListener('mouseup', this.handleMouseUp)
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp)
    this.canvas.removeEventListener('wheel', this.handleWheel)

    this.canvas = null
    this.camera = null
  }

  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return
    this.isDragging = true
    this.previousMouse = { x: e.clientX, y: e.clientY }
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.canvas || !this.camera) return

    const rect = this.canvas.getBoundingClientRect()
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    if (this.isDragging) {
      const deltaX = e.clientX - this.previousMouse.x
      const deltaY = e.clientY - this.previousMouse.y

      this.cameraState.theta -= deltaX * this.rotateSpeed
      this.cameraState.phi -= deltaY * this.rotateSpeed

      this.cameraState.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.cameraState.phi))

      this.previousMouse = { x: e.clientX, y: e.clientY }
      this.updateCameraPosition()

      if (this.onTrailUpdate) {
        const trailPos = this.getTrailPosition()
        if (trailPos) {
          this.onTrailUpdate(trailPos)
        }
      }
    }
  }

  private handleMouseUp = (): void => {
    this.isDragging = false
  }

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault()

    const zoomFactor = 1 + e.deltaY * this.zoomSpeed
    this.cameraState.radius *= zoomFactor
    this.cameraState.radius = Math.max(this.minRadius, Math.min(this.maxRadius, this.cameraState.radius))

    this.updateCameraPosition()
  }

  private updateCameraPosition(): void {
    if (!this.camera) return

    const { theta, phi, radius, target } = this.cameraState

    const x = target.x + radius * Math.sin(phi) * Math.cos(theta)
    const y = target.y + radius * Math.cos(phi)
    const z = target.z + radius * Math.sin(phi) * Math.sin(theta)

    this.camera.position.set(x, y, z)
    this.camera.lookAt(target)

    if (this.onCameraChange) {
      this.onCameraChange()
    }
  }

  private getTrailPosition(): THREE.Vector3 | null {
    if (!this.camera || !this.canvas) return null

    this.raycaster.setFromCamera(this.mouse, this.camera)

    const planeNormal = new THREE.Vector3(0, 0, 1)
    const planePoint = new THREE.Vector3(0, 0, 0)
    const plane = new THREE.Plane(planeNormal, -planePoint.dot(planeNormal))

    const intersect = new THREE.Vector3()
    this.raycaster.ray.intersectPlane(plane, intersect)

    if (intersect) {
      return intersect
    }

    return null
  }

  reset(): void {
    this.cameraState.theta = 0
    this.cameraState.phi = Math.PI / 2
    this.cameraState.radius = 150
    this.cameraState.target.set(0, 0, 0)
    this.updateCameraPosition()
  }

  setOnCameraChange(callback: (() => void) | null): void {
    this.onCameraChange = callback
  }

  setOnTrailUpdate(callback: ((position: THREE.Vector3) => void) | null): void {
    this.onTrailUpdate = callback
  }

  getIsDragging(): boolean {
    return this.isDragging
  }

  getCameraState(): CameraState {
    return { ...this.cameraState }
  }
}
