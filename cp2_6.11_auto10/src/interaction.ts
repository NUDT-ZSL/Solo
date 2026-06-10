import * as THREE from 'three'
import { ParticleSystem } from './particleSystem'

export class InteractionController {
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private particleSystem: ParticleSystem
  private domElement: HTMLElement

  private isDragging: boolean = false
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 }

  private targetRotationX: number = 0
  private targetRotationY: number = 0
  private currentRotationX: number = 0
  private currentRotationY: number = 0

  private targetDistance: number = 30
  private currentDistance: number = 30

  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 2, 0)

  private raycaster: THREE.Raycaster = new THREE.Raycaster()
  private mouse: THREE.Vector2 = new THREE.Vector2()
  private hoveredPosition: THREE.Vector3 | null = null

  private minDistance: number = 10
  private maxDistance: number = 80
  private minPolarAngle: number = 0.2
  private maxPolarAngle: number = Math.PI / 2 - 0.1

  private damping: number = 0.08

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    particleSystem: ParticleSystem
  ) {
    this.camera = camera
    this.renderer = renderer
    this.particleSystem = particleSystem
    this.domElement = renderer.domElement

    this.targetRotationY = Math.PI / 4
    this.targetRotationX = -Math.PI / 4

    this.currentRotationY = this.targetRotationY
    this.currentRotationX = this.targetRotationX

    this.bindEvents()
    this.updateCameraPosition()
  }

  private bindEvents(): void {
    const canvas = this.domElement

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this))
    window.addEventListener('mouseup', this.onMouseUp.bind(this))
    window.addEventListener('mousemove', this.onMouseMove.bind(this))
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false })
    canvas.addEventListener('click', this.onClick.bind(this))
    window.addEventListener('resize', this.onResize.bind(this))
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true
    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    }
  }

  private onMouseUp(): void {
    this.isDragging = false
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    if (this.isDragging) {
      const deltaX = event.clientX - this.previousMousePosition.x
      const deltaY = event.clientY - this.previousMousePosition.y

      this.targetRotationY -= deltaX * 0.005
      this.targetRotationX -= deltaY * 0.005

      this.targetRotationX = Math.max(
        this.minPolarAngle - Math.PI / 2,
        Math.min(this.maxPolarAngle - Math.PI / 2, this.targetRotationX)
      )

      this.previousMousePosition = {
        x: event.clientX,
        y: event.clientY
      }
    }

    this.updateHover()
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault()
    event.stopPropagation()

    const zoomSpeed = 0.001
    this.targetDistance += event.deltaY * zoomSpeed * this.targetDistance
    this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.targetDistance))
  }

  private onClick(event: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    const worldPos = this.getIntersectionPoint()
    if (worldPos) {
      this.particleSystem.triggerRipple(worldPos, 20)
    }
  }

  private updateHover(): void {
    const worldPos = this.getIntersectionPoint()
    if (worldPos) {
      this.hoveredPosition = worldPos
      this.particleSystem.triggerHoverEffect(worldPos, 4)
    } else {
      this.hoveredPosition = null
    }
  }

  private getIntersectionPoint(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera)

    const points = this.particleSystem.getPoints()
    const intersects = this.raycaster.intersectObject(points)

    if (intersects.length > 0) {
      return intersects[0].point
    }

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -2)
    const intersectPoint = new THREE.Vector3()
    this.raycaster.ray.intersectPlane(plane, intersectPoint)

    if (intersectPoint) {
      const dist = intersectPoint.distanceTo(new THREE.Vector3(0, 2, 0))
      if (dist < 25) {
        return intersectPoint
      }
    }

    return null
  }

  public update(delta: number): void {
    const dampingFactor = this.damping

    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * dampingFactor
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * dampingFactor
    this.currentDistance += (this.targetDistance - this.currentDistance) * dampingFactor

    this.updateCameraPosition()
  }

  private updateCameraPosition(): void {
    const x = this.currentDistance * Math.cos(this.currentRotationX) * Math.sin(this.currentRotationY)
    const y = this.currentDistance * Math.sin(-this.currentRotationX) + this.cameraTarget.y
    const z = this.currentDistance * Math.cos(this.currentRotationX) * Math.cos(this.currentRotationY)

    this.camera.position.set(
      x + this.cameraTarget.x,
      y,
      z + this.cameraTarget.z
    )
    this.camera.lookAt(this.cameraTarget)
  }

  private onResize(): void {
    const canvas = this.domElement
    this.camera.aspect = canvas.clientWidth / canvas.clientHeight
    this.camera.updateProjectionMatrix()
  }

  public setCameraTarget(target: THREE.Vector3): void {
    this.cameraTarget.copy(target)
  }

  public dispose(): void {
    const canvas = this.domElement
    canvas.removeEventListener('mousedown', this.onMouseDown.bind(this))
    window.removeEventListener('mouseup', this.onMouseUp.bind(this))
    window.removeEventListener('mousemove', this.onMouseMove.bind(this))
    canvas.removeEventListener('wheel', this.onWheel.bind(this))
    canvas.removeEventListener('click', this.onClick.bind(this))
    window.removeEventListener('resize', this.onResize.bind(this))
  }
}
