import * as THREE from 'three'
import { eventBus, NavigateArtworkPayload } from './eventBus'
import { GalleryScene } from './galleryScene'

export const DAMPING = 0.9
export const ROTATION_SPEED = 0.003
export const MIN_POLAR = -15 * Math.PI / 180
export const MAX_POLAR = 60 * Math.PI / 180
export const ZOOM_SPEED = 0.1
export const MIN_ZOOM = 1
export const MAX_ZOOM = 10
export const CAMERA_HEIGHT = 1.6
export const EASING = (t: number) => 1 - Math.pow(1 - t, 3)

export class InteractionController {
  private camera: THREE.PerspectiveCamera
  private domElement: HTMLElement
  private galleryScene: GalleryScene

  private isDragging: boolean = false
  private dragStartX: number = 0
  private dragStartY: number = 0
  private previousMouseX: number = 0
  private previousMouseY: number = 0

  private azimuthalAngle: number = -Math.PI / 2
  private polarAngle: number = 0

  private targetAzimuthal: number = -Math.PI / 2
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

    this.domElement.style.cursor = 'grab'

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
    this.domElement.addEventListener('mouseleave', this.onMouseLeave.bind(this))
    this.domElement.addEventListener('click', this.onClick.bind(this))
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false })
    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false })
    this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false })
    this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this))
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.isPanelOpen) return
    this.isDragging = true
    this.dragStartX = e.clientX
    this.dragStartY = e.clientY
    this.previousMouseX = e.clientX
    this.previousMouseY = e.clientY
    this.domElement.style.cursor = 'grabbing'
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
    this.isDragging = false
    if (!this.isPanelOpen) {
      this.domElement.style.cursor = this.hoveredFrameIndex >= 0 ? 'pointer' : 'grab'
    }
  }

  private onMouseLeave(): void {
    this.isDragging = false
    if (this.hoveredFrameIndex >= 0) {
      eventBus.emit('artwork-unhover')
      this.hoveredFrameIndex = -1
    }
    this.domElement.style.cursor = 'grab'
  }

  private onClick(e: MouseEvent): void {
    if (this.isPanelOpen) return
    const dx = Math.abs(e.clientX - this.dragStartX)
    const dy = Math.abs(e.clientY - this.dragStartY)
    if (dx > 3 || dy > 3) return
    this.handleClick(e.clientX, e.clientY)
  }

  private onWheel(e: WheelEvent): void {
    if (this.isPanelOpen) return
    e.preventDefault()
    const deltaNorm = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 100) / 100
    this.targetZoom += deltaNorm * ZOOM_SPEED
    this.targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.targetZoom))
  }

  private touchStartX: number = 0
  private touchStartY: number = 0

  private onTouchStart(e: TouchEvent): void {
    if (this.isPanelOpen || e.touches.length !== 1) return
    e.preventDefault()
    this.isDragging = true
    this.touchStartX = e.touches[0].clientX
    this.touchStartY = e.touches[0].clientY
    this.previousMouseX = this.touchStartX
    this.previousMouseY = this.touchStartY
    this.dragStartX = this.touchStartX
    this.dragStartY = this.touchStartY
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || this.isPanelOpen || e.touches.length !== 1) return
    e.preventDefault()
    const deltaX = e.touches[0].clientX - this.previousMouseX
    const deltaY = e.touches[0].clientY - this.previousMouseY
    this.targetAzimuthal -= deltaX * ROTATION_SPEED
    this.targetPolar += deltaY * ROTATION_SPEED
    this.targetPolar = Math.max(MIN_POLAR, Math.min(MAX_POLAR, this.targetPolar))
    this.previousMouseX = e.touches[0].clientX
    this.previousMouseY = e.touches[0].clientY
  }

  private onTouchEnd(e: TouchEvent): void {
    if (!this.isDragging) return
    this.isDragging = false
    const lastTouch = e.changedTouches[0]
    if (lastTouch) {
      const dx = Math.abs(lastTouch.clientX - this.touchStartX)
      const dy = Math.abs(lastTouch.clientY - this.touchStartY)
      if (dx < 10 && dy < 10) {
        this.updateHover(lastTouch.clientX, lastTouch.clientY)
        this.handleClick(lastTouch.clientX, lastTouch.clientY)
      }
    }
  }

  private updateHover(clientX: number, clientY: number): void {
    const rect = this.domElement.getBoundingClientRect()
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const frameObjects = this.galleryScene.getFrameObjects()
    const intersects = this.raycaster.intersectObjects(frameObjects, false)

    if (intersects.length > 0) {
      const hit = intersects[0].object
      let idx: number | undefined
      if (hit.userData && typeof hit.userData.frameIndex === 'number') {
        idx = hit.userData.frameIndex
      }
      if (idx !== undefined && idx !== this.hoveredFrameIndex) {
        if (this.hoveredFrameIndex >= 0) {
          eventBus.emit('artwork-unhover')
        }
        this.hoveredFrameIndex = idx
        eventBus.emit('artwork-hover', idx)
        if (!this.isDragging) this.domElement.style.cursor = 'pointer'
      }
    } else {
      if (this.hoveredFrameIndex >= 0) {
        eventBus.emit('artwork-unhover')
        this.hoveredFrameIndex = -1
        if (!this.isDragging) this.domElement.style.cursor = 'grab'
      }
    }
  }

  private handleClick(clientX: number, clientY: number): void {
    const rect = this.domElement.getBoundingClientRect()
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const frameObjects = this.galleryScene.getFrameObjects()
    const intersects = this.raycaster.intersectObjects(frameObjects, false)

    if (intersects.length > 0) {
      const hit = intersects[0].object
      let idx: number | undefined
      if (hit.userData && typeof hit.userData.frameIndex === 'number') {
        idx = hit.userData.frameIndex
      }
      if (idx !== undefined && idx >= 0 && idx < this.galleryScene.getFrameCount()) {
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
    this.isPanelOpen = true
    const framePos = this.galleryScene.getFramePosition(index)
    const frameGroup = this.galleryScene.getFrameGroups()[index]

    this.cameraAnimStart.copy(this.camera.position)

    const normal = new THREE.Vector3(0, 0, 1)
    if (frameGroup) {
      normal.applyQuaternion(frameGroup.quaternion)
    }
    this.cameraAnimEnd.copy(framePos).addScaledVector(normal, 3)
    this.cameraAnimEnd.y = CAMERA_HEIGHT

    this.lookAtAnimStart.copy(this.lookAtTarget)
    this.lookAtAnimEnd.copy(framePos)
    this.lookAtAnimEnd.y = CAMERA_HEIGHT

    this.cameraAnimProgress = 0
    this.isAnimatingCamera = true

    eventBus.emit('artwork-focused', index)
    eventBus.emit('artwork-clicked', { index })
  }

  private updateCameraPosition(): void {
    const hDist = this.zoomDistance * Math.cos(this.polarAngle)
    const x = this.lookAtTarget.x + hDist * Math.sin(this.azimuthalAngle)
    const y = this.lookAtTarget.y + this.zoomDistance * Math.sin(this.polarAngle)
    const z = this.lookAtTarget.z + hDist * Math.cos(this.azimuthalAngle)

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

      const dx = this.camera.position.x - this.lookAtTarget.x
      const dz = this.camera.position.z - this.lookAtTarget.z
      const dy = this.camera.position.y - this.lookAtTarget.y
      const horizontalDist = Math.sqrt(dx * dx + dz * dz)

      this.azimuthalAngle = Math.atan2(dx, dz)
      this.polarAngle = Math.atan2(dy, horizontalDist)
      this.zoomDistance = this.camera.position.distanceTo(this.lookAtTarget)

      this.targetAzimuthal = this.azimuthalAngle
      this.targetPolar = this.polarAngle
      this.targetZoom = this.zoomDistance
      return
    }

    const lerpPerFrame = 1 - DAMPING
    const fpsFactor = delta * 60
    const lerpFactor = 1 - Math.pow(1 - lerpPerFrame, fpsFactor)

    this.azimuthalAngle += (this.targetAzimuthal - this.azimuthalAngle) * lerpFactor
    this.polarAngle += (this.targetPolar - this.polarAngle) * lerpFactor
    this.zoomDistance += (this.targetZoom - this.zoomDistance) * lerpFactor

    this.lookAtTarget.lerp(this.targetLookAt, lerpFactor)

    this.updateCameraPosition()
  }

  getFocusedIndex(): number {
    return this.focusedArtworkIndex
  }

  isPanelOpenState(): boolean {
    return this.isPanelOpen
  }
}
