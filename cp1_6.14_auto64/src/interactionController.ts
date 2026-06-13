import * as THREE from 'three'
import { eventBus, NavigateArtworkPayload } from './eventBus'
import { GalleryScene } from './galleryScene'

const DAMPING = 0.9
const ROTATION_SPEED = 0.003
const MIN_POLAR = -15 * Math.PI / 180
const MAX_POLAR = 60 * Math.PI / 180
const ZOOM_SPEED = 0.1
const MIN_ZOOM = 1
const MAX_ZOOM = 10
const CAMERA_HEIGHT = 1.6
const EASING = (t: number) => 1 - Math.pow(1 - t, 3)

export class InteractionController {
  private camera: THREE.PerspectiveCamera
  private domElement: HTMLElement
  private galleryScene: GalleryScene

  private isDragging: boolean = false
  private previousMouseX: number = 0
  private previousMouseY: number = 0

  private azimuthalAngle: number = 0
  private polarAngle: number = 0

  private targetAzimuthal: number = 0
  private targetPolar: number = 0

  private zoomDistance: number = 5
  private targetZoom: number = 5

  private lookAtTarget: THREE.Vector3 = new THREE.Vector3(0, CAMERA_HEIGHT, 0)
  private targetLookAt: THREE.Vector3 = new THREE.Vector3(0, CAMERA_HEIGHT, 0)

  private raycaster: THREE.Raycaster = new THREE.Raycaster()
  private mouse: THREE.Vector2 = new THREE.Vector2()
  private hoveredFrameIndex: number = -1

  private isAnimatingCamera: boolean = false
  private cameraAnimStart: THREE.Vector3 = new THREE.Vector3()
  private cameraAnimEnd: THREE.Vector3 = new THREE.Vector3()
  private lookAtAnimStart: THREE.Vector3 = new THREE.Vector3()
  private lookAtAnimEnd: THREE.Vector3 = new THREE.Vector3()
  private cameraAnimProgress: number = 0
  private cameraAnimDuration: number = 0.5

  private focusedArtworkIndex: number = -1
  private isPanelOpen: boolean = false

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    galleryScene: GalleryScene
  ) {
    this.camera = camera
    this.domElement = domElement
    this.galleryScene = galleryScene

    this.updateCameraPosition()
    this.setupEventListeners()
    this.setupDOMEvents()
  }

  private setupEventListeners(): void {
    eventBus.on('navigate-artwork', (payload: NavigateArtworkPayload) => {
      this.navigateToArtwork(payload.toIndex)
    })

    eventBus.on('close-panel', () => {
      this.isPanelOpen = false
      this.focusedArtworkIndex = -1
      eventBus.emit('artwork-unfocused')
    })

    eventBus.on('series-changed', () => {
      this.isPanelOpen = false
      this.focusedArtworkIndex = -1
      eventBus.emit('artwork-unfocused')
    })
  }

  private setupDOMEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this))
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this))
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this))
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false })
    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this))
    this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this))
    this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this))
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.isPanelOpen) return
    this.isDragging = true
    this.previousMouseX = e.clientX
    this.previousMouseY = e.clientY
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateHover(e.clientX, e.clientY)

    if (!this.isDragging || this.isPanelOpen) return

    const deltaX = e.clientX - this.previousMouseX
    const deltaY = e.clientY - this.previousMouseY

    this.targetAzimuthal -= deltaX * ROTATION_SPEED
    this.targetPolar += deltaY * ROTATION_SPEED

    this.targetPolar = Math.max(MIN_POLAR, Math.min(MAX_POLAR, this.targetPolar))

    this.previousMouseX = e.clientX
    this.previousMouseY = e.clientY
  }

  private onMouseUp(e: MouseEvent): void {
    if (this.isDragging && !this.isPanelOpen) {
      const deltaX = Math.abs(e.clientX - this.previousMouseX)
      const deltaY = Math.abs(e.clientY - this.previousMouseY)
      if (deltaX < 3 && deltaY < 3) {
        this.handleClick(e.clientX, e.clientY)
      }
    }
    this.isDragging = false
  }

  private onWheel(e: WheelEvent): void {
    if (this.isPanelOpen) return
    e.preventDefault()
    this.targetZoom += e.deltaY * ZOOM_SPEED * 0.01
    this.targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.targetZoom))
  }

  private touchStartX: number = 0
  private touchStartY: number = 0

  private onTouchStart(e: TouchEvent): void {
    if (this.isPanelOpen || e.touches.length !== 1) return
    this.isDragging = true
    this.touchStartX = e.touches[0].clientX
    this.touchStartY = e.touches[0].clientY
    this.previousMouseX = this.touchStartX
    this.previousMouseY = this.touchStartY
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || this.isPanelOpen || e.touches.length !== 1) return
    const deltaX = e.touches[0].clientX - this.previousMouseX
    const deltaY = e.touches[0].clientY - this.previousMouseY
    this.targetAzimuthal -= deltaX * ROTATION_SPEED
    this.targetPolar += deltaY * ROTATION_SPEED
    this.targetPolar = Math.max(MIN_POLAR, Math.min(MAX_POLAR, this.targetPolar))
    this.previousMouseX = e.touches[0].clientX
    this.previousMouseY = e.touches[0].clientY
  }

  private onTouchEnd(e: TouchEvent): void {
    this.isDragging = false
  }

  private updateHover(clientX: number, clientY: number): void {
    const rect = this.domElement.getBoundingClientRect()
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const frameObjects = this.galleryScene.getFrameObjects()
    const intersects = this.raycaster.intersectObjects(frameObjects)

    if (intersects.length > 0) {
      const hit = intersects[0].object
      const idx = hit.userData.frameIndex
      if (idx !== undefined && idx !== this.hoveredFrameIndex) {
        if (this.hoveredFrameIndex >= 0) {
          eventBus.emit('artwork-unhover')
        }
        this.hoveredFrameIndex = idx
        eventBus.emit('artwork-hover', idx)
        this.domElement.style.cursor = 'pointer'
      }
    } else {
      if (this.hoveredFrameIndex >= 0) {
        eventBus.emit('artwork-unhover')
        this.hoveredFrameIndex = -1
        this.domElement.style.cursor = 'grab'
      }
    }
  }

  private handleClick(clientX: number, clientY: number): void {
    const rect = this.domElement.getBoundingClientRect()
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const frameObjects = this.galleryScene.getFrameObjects()
    const intersects = this.raycaster.intersectObjects(frameObjects)

    if (intersects.length > 0) {
      const hit = intersects[0].object
      const idx = hit.userData.frameIndex
      if (idx !== undefined) {
        this.focusedArtworkIndex = idx
        this.isPanelOpen = true
        eventBus.emit('artwork-focused', idx)
        eventBus.emit('artwork-clicked', { index: idx })
      }
    }
  }

  navigateToArtwork(index: number): void {
    if (index < 0 || index >= this.galleryScene.getFrameCount()) return

    this.focusedArtworkIndex = index
    const framePos = this.galleryScene.getFramePosition(index)
    const lookAtPos = this.galleryScene.getFrameLookAt(index)

    this.cameraAnimStart.copy(this.camera.position)
    this.cameraAnimEnd.copy(framePos)

    const normal = new THREE.Vector3(0, 0, 1)
    const frameGroup = this.galleryScene.getFrameGroups()[index]
    if (frameGroup) {
      normal.applyEuler(frameGroup.rotation)
    }
    this.cameraAnimEnd.addScaledVector(normal, -3)
    this.cameraAnimEnd.y = CAMERA_HEIGHT

    this.lookAtAnimStart.copy(this.lookAtTarget)
    this.lookAtAnimEnd.copy(lookAtPos)

    this.cameraAnimProgress = 0
    this.isAnimatingCamera = true

    eventBus.emit('artwork-focused', index)
    eventBus.emit('artwork-clicked', { index })
  }

  private updateCameraPosition(): void {
    const x = this.lookAtTarget.x + this.zoomDistance * Math.sin(this.azimuthalAngle) * Math.cos(this.polarAngle)
    const y = this.lookAtTarget.y + this.zoomDistance * Math.sin(this.polarAngle)
    const z = this.lookAtTarget.z + this.zoomDistance * Math.cos(this.azimuthalAngle) * Math.cos(this.polarAngle)

    this.camera.position.set(x, y, z)
    this.camera.lookAt(this.lookAtTarget)
  }

  update(delta: number): void {
    if (this.isAnimatingCamera) {
      this.cameraAnimProgress += delta / this.cameraAnimDuration
      if (this.cameraAnimProgress >= 1) {
        this.cameraAnimProgress = 1
        this.isAnimatingCamera = false
      }

      const t = EASING(this.cameraAnimProgress)
      this.camera.position.lerpVectors(this.cameraAnimStart, this.cameraAnimEnd, t)
      this.lookAtTarget.lerpVectors(this.lookAtAnimStart, this.lookAtAnimEnd, t)
      this.camera.lookAt(this.lookAtTarget)

      this.azimuthalAngle = Math.atan2(
        this.camera.position.x - this.lookAtTarget.x,
        this.camera.position.z - this.lookAtTarget.z
      )
      const dx = this.camera.position.x - this.lookAtTarget.x
      const dz = this.camera.position.z - this.lookAtTarget.z
      const horizontalDist = Math.sqrt(dx * dx + dz * dz)
      this.polarAngle = Math.atan2(
        this.camera.position.y - this.lookAtTarget.y,
        horizontalDist
      )
      this.zoomDistance = this.camera.position.distanceTo(this.lookAtTarget)

      this.targetAzimuthal = this.azimuthalAngle
      this.targetPolar = this.polarAngle
      this.targetZoom = this.zoomDistance
      return
    }

    this.azimuthalAngle += (this.targetAzimuthal - this.azimuthalAngle) * (1 - DAMPING * delta)
    this.polarAngle += (this.targetPolar - this.polarAngle) * (1 - DAMPING * delta)
    this.zoomDistance += (this.targetZoom - this.zoomDistance) * (1 - DAMPING * delta)

    this.updateCameraPosition()
  }

  getFocusedIndex(): number {
    return this.focusedArtworkIndex
  }

  isPanelOpenState(): boolean {
    return this.isPanelOpen
  }
}
