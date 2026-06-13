import * as THREE from 'three'
import { eventBus, ArtworkData, FrameTextureUpdatePayload, ArtworkClickPayload, NavigateArtworkPayload } from './eventBus'

const WALL_COLOR = 0xf5f0e1
const FLOOR_COLOR = 0xd4cdc0
const FRAME_COLOR = 0x8b7355
const FRAME_HIGHLIGHT_COLOR = 0xffd700
const FRAME_WIDTH = 2
const FRAME_HEIGHT = 1.5
const FRAME_BORDER = 0.05
const FRAMES_PER_WALL = 4
const FRAME_SPACING = 1.5
const CAMERA_HEIGHT = 1.6
const ROOM_WIDTH = 12
const ROOM_LENGTH = 20
const ROOM_HEIGHT = 4
const WALL_THICKNESS = 0.2

interface FrameObject {
  group: THREE.Group
  canvasPlane: THREE.Mesh
  borderMeshes: THREE.Mesh[]
  canvasTexture: THREE.CanvasTexture
  originalPosition: THREE.Vector3
  originalRotation: THREE.Euler
  targetPosition: THREE.Vector3
  isHighlighted: boolean
  isFocused: boolean
  highlightProgress: number
  moveProgress: number
}

export class GalleryScene {
  private scene: THREE.Scene
  private frames: FrameObject[] = []
  private hoveredIndex: number = -1
  private focusedIndex: number = -1
  private animationMixins: (() => void)[] = []

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.createFloor()
    this.createWalls()
    this.createCeiling()
    this.createLighting()
    this.createFrames()
    this.setupEventListeners()
  }

  private createFloor(): void {
    const floorGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_LENGTH)
    const floorMat = new THREE.MeshStandardMaterial({
      color: FLOOR_COLOR,
      roughness: 0.8,
      metalness: 0.1
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    this.scene.add(floor)
  }

  private createWalls(): void {
    const wallMat = new THREE.MeshStandardMaterial({
      color: WALL_COLOR,
      roughness: 0.9,
      metalness: 0.0
    })

    const leftWallGeo = new THREE.BoxGeometry(WALL_THICKNESS, ROOM_HEIGHT, ROOM_LENGTH)
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat)
    leftWall.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0)
    leftWall.receiveShadow = true
    leftWall.castShadow = true
    this.scene.add(leftWall)

    const rightWallGeo = new THREE.BoxGeometry(WALL_THICKNESS, ROOM_HEIGHT, ROOM_LENGTH)
    const rightWall = new THREE.Mesh(rightWallGeo, wallMat)
    rightWall.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0)
    rightWall.receiveShadow = true
    rightWall.castShadow = true
    this.scene.add(rightWall)

    const backWallGeo = new THREE.BoxGeometry(ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS)
    const backWall = new THREE.Mesh(backWallGeo, wallMat)
    backWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_LENGTH / 2)
    backWall.receiveShadow = true
    backWall.castShadow = true
    this.scene.add(backWall)

    const frontWallGeo = new THREE.BoxGeometry(ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS)
    const frontWall = new THREE.Mesh(frontWallGeo, wallMat)
    frontWall.position.set(0, ROOM_HEIGHT / 2, ROOM_LENGTH / 2)
    frontWall.receiveShadow = true
    frontWall.castShadow = true
    this.scene.add(frontWall)
  }

  private createCeiling(): void {
    const ceilingGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_LENGTH)
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xfaf5eb,
      roughness: 0.9,
      metalness: 0.0
    })
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat)
    ceiling.rotation.x = Math.PI / 2
    ceiling.position.y = ROOM_HEIGHT
    this.scene.add(ceiling)
  }

  private createLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.4)
    this.scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 0.6)
    dirLight.position.set(0, ROOM_HEIGHT - 0.5, 0)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 1024
    dirLight.shadow.mapSize.height = 1024
    dirLight.shadow.camera.near = 0.1
    dirLight.shadow.camera.far = 50
    dirLight.shadow.camera.left = -15
    dirLight.shadow.camera.right = 15
    dirLight.shadow.camera.top = 15
    dirLight.shadow.camera.bottom = -15
    this.scene.add(dirLight)

    const spotPositions = [
      { x: -3, z: -4 }, { x: 3, z: -4 },
      { x: -3, z: 0 }, { x: 3, z: 0 },
      { x: -3, z: 4 }, { x: 3, z: 4 }
    ]

    for (const pos of spotPositions) {
      const pointLight = new THREE.PointLight(0xffe4b5, 0.5, 8)
      pointLight.position.set(pos.x, ROOM_HEIGHT - 0.1, pos.z)
      pointLight.castShadow = false
      this.scene.add(pointLight)
    }
  }

  private createFrame(
    position: THREE.Vector3,
    rotation: THREE.Euler,
    index: number
  ): FrameObject {
    const group = new THREE.Group()
    group.position.copy(position)
    group.rotation.copy(rotation)
    group.userData.frameIndex = index

    const borderMat = new THREE.MeshStandardMaterial({
      color: FRAME_COLOR,
      roughness: 0.6,
      metalness: 0.2
    })

    const borders: THREE.Mesh[] = []
    const bw = FRAME_WIDTH + FRAME_BORDER * 2
    const bh = FRAME_HEIGHT + FRAME_BORDER * 2

    const topBorder = new THREE.Mesh(new THREE.BoxGeometry(bw, FRAME_BORDER, FRAME_BORDER), borderMat.clone())
    topBorder.position.set(0, FRAME_HEIGHT / 2 + FRAME_BORDER / 2, 0)
    borders.push(topBorder)
    group.add(topBorder)

    const bottomBorder = new THREE.Mesh(new THREE.BoxGeometry(bw, FRAME_BORDER, FRAME_BORDER), borderMat.clone())
    bottomBorder.position.set(0, -FRAME_HEIGHT / 2 - FRAME_BORDER / 2, 0)
    borders.push(bottomBorder)
    group.add(bottomBorder)

    const leftBorder = new THREE.Mesh(new THREE.BoxGeometry(FRAME_BORDER, bh, FRAME_BORDER), borderMat.clone())
    leftBorder.position.set(-FRAME_WIDTH / 2 - FRAME_BORDER / 2, 0, 0)
    borders.push(leftBorder)
    group.add(leftBorder)

    const rightBorder = new THREE.Mesh(new THREE.BoxGeometry(FRAME_BORDER, bh, FRAME_BORDER), borderMat.clone())
    rightBorder.position.set(FRAME_WIDTH / 2 + FRAME_BORDER / 2, 0, 0)
    borders.push(rightBorder)
    group.add(rightBorder)

    const placeholderCanvas = document.createElement('canvas')
    placeholderCanvas.width = 1024
    placeholderCanvas.height = 768
    const ctx = placeholderCanvas.getContext('2d')!
    ctx.fillStyle = '#e0d8cc'
    ctx.fillRect(0, 0, 1024, 768)

    const texture = new THREE.CanvasTexture(placeholderCanvas)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter

    const canvasGeo = new THREE.PlaneGeometry(FRAME_WIDTH, FRAME_HEIGHT)
    const canvasMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.5,
      metalness: 0.0
    })
    const canvasPlane = new THREE.Mesh(canvasGeo, canvasMat)
    canvasPlane.position.z = FRAME_BORDER / 2
    canvasPlane.userData.frameIndex = index
    group.add(canvasPlane)

    const backPlaneGeo = new THREE.PlaneGeometry(FRAME_WIDTH + FRAME_BORDER * 2, FRAME_HEIGHT + FRAME_BORDER * 2)
    const backPlaneMat = new THREE.MeshStandardMaterial({ color: 0x3a3028 })
    const backPlane = new THREE.Mesh(backPlaneGeo, backPlaneMat)
    backPlane.position.z = -FRAME_BORDER / 2
    group.add(backPlane)

    this.scene.add(group)

    return {
      group,
      canvasPlane,
      borderMeshes: borders,
      canvasTexture: texture,
      originalPosition: position.clone(),
      originalRotation: rotation.clone() as THREE.Euler,
      targetPosition: position.clone(),
      isHighlighted: false,
      isFocused: false,
      highlightProgress: 0,
      moveProgress: 0
    }
  }

  private createFrames(): void {
    this.frames = []
    const totalSpan = (FRAMES_PER_WALL - 1) * FRAME_SPACING
    const startZ = -totalSpan / 2

    for (let i = 0; i < FRAMES_PER_WALL; i++) {
      const z = startZ + i * FRAME_SPACING
      const leftPos = new THREE.Vector3(
        -ROOM_WIDTH / 2 + WALL_THICKNESS / 2 + 0.01,
        CAMERA_HEIGHT,
        z
      )
      const leftRot = new THREE.Euler(0, Math.PI / 2, 0)
      this.frames.push(this.createFrame(leftPos, leftRot, i))
    }

    for (let i = 0; i < FRAMES_PER_WALL; i++) {
      const z = startZ + i * FRAME_SPACING
      const rightPos = new THREE.Vector3(
        ROOM_WIDTH / 2 - WALL_THICKNESS / 2 - 0.01,
        CAMERA_HEIGHT,
        z
      )
      const rightRot = new THREE.Euler(0, -Math.PI / 2, 0)
      this.frames.push(this.createFrame(rightPos, rightRot, i + FRAMES_PER_WALL))
    }
  }

  private setupEventListeners(): void {
    eventBus.on('frame-texture-update', (payload: FrameTextureUpdatePayload) => {
      this.updateFrameTextures(payload.frames)
    })

    eventBus.on('artwork-hover', (index: number) => {
      if (this.hoveredIndex >= 0 && this.hoveredIndex < this.frames.length) {
        this.frames[this.hoveredIndex].isHighlighted = false
      }
      this.hoveredIndex = index
      if (index >= 0 && index < this.frames.length) {
        this.frames[index].isHighlighted = true
      }
    })

    eventBus.on('artwork-unhover', () => {
      if (this.hoveredIndex >= 0 && this.hoveredIndex < this.frames.length) {
        this.frames[this.hoveredIndex].isHighlighted = false
      }
      this.hoveredIndex = -1
    })

    eventBus.on('artwork-focused', (index: number) => {
      if (this.focusedIndex >= 0 && this.focusedIndex < this.frames.length) {
        this.frames[this.focusedIndex].isFocused = false
      }
      this.focusedIndex = index
      if (index >= 0 && index < this.frames.length) {
        this.frames[index].isFocused = true
      }
    })

    eventBus.on('artwork-unfocused', () => {
      if (this.focusedIndex >= 0 && this.focusedIndex < this.frames.length) {
        this.frames[this.focusedIndex].isFocused = false
      }
      this.focusedIndex = -1
    })
  }

  private updateFrameTextures(artworks: ArtworkData[]): void {
    for (let i = 0; i < this.frames.length && i < artworks.length; i++) {
      const frame = this.frames[i]
      frame.canvasTexture.image = artworks[i].imageCanvas
      frame.canvasTexture.needsUpdate = true
    }
  }

  getFrameObjects(): THREE.Object3D[] {
    return this.frames.map(f => f.canvasPlane)
  }

  getFrameGroups(): THREE.Object3D[] {
    return this.frames.map(f => f.group)
  }

  getFramePosition(index: number): THREE.Vector3 {
    if (index < 0 || index >= this.frames.length) return new THREE.Vector3()
    return this.frames[index].originalPosition.clone()
  }

  getFrameLookAt(index: number): THREE.Vector3 {
    if (index < 0 || index >= this.frames.length) return new THREE.Vector3()
    const frame = this.frames[index]
    const normal = new THREE.Vector3(0, 0, 1)
    normal.applyEuler(frame.originalRotation)
    const lookAt = frame.originalPosition.clone().add(normal.multiplyScalar(-3))
    lookAt.y = CAMERA_HEIGHT
    return lookAt
  }

  update(delta: number): void {
    const t = Math.min(delta * 5, 1)
    for (const frame of this.frames) {
      const targetHighlight = frame.isHighlighted ? 1 : 0
      frame.highlightProgress += (targetHighlight - frame.highlightProgress) * t
      if (Math.abs(frame.highlightProgress - targetHighlight) < 0.001) {
        frame.highlightProgress = targetHighlight
      }

      const hp = frame.highlightProgress
      for (const border of frame.borderMeshes) {
        const mat = border.material as THREE.MeshStandardMaterial
        const baseColor = new THREE.Color(FRAME_COLOR)
        const highlightColor = new THREE.Color(FRAME_HIGHLIGHT_COLOR)
        mat.color.copy(baseColor).lerp(highlightColor, hp)
      }

      const normal = new THREE.Vector3(0, 0, 1)
      normal.applyEuler(frame.originalRotation)
      const offset = normal.multiplyScalar(hp * 0.1)
      frame.group.position.copy(frame.originalPosition).add(offset)
    }
  }

  getFrameCount(): number {
    return this.frames.length
  }
}
