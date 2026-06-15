import * as THREE from 'three'
import type { ParsedDNAData, BasePairData } from './DNAParser'

const BASE_SPHERE_RADIUS = 0.12
const SPHERE_WIDTH_SEGMENTS = 12
const SPHERE_HEIGHT_SEGMENTS = 8
const BACKBONE_RADIUS = 0.05
const BACKBONE_RADIAL_SEGMENTS = 8
const INITIAL_CAMERA_Z = 8
const MIN_ZOOM = 0.5
const MAX_ZOOM = 3.0
const ROTATION_DAMPING = 0.1
const RESET_DURATION = 0.8
const HELIX_RADIUS = 1.0
const BASES_PER_TURN = 10
const STEP_Z = 0.34

const BATCH_SIZE = 200
const FRAME_TIME_BUDGET_MS = 10

export type RenderProgressCallback = (
  progress: number,
  stage: string,
  etaMs: number,
) => void

interface BuildTask {
  type: 'spheres' | 'backbone' | 'hbonds'
  data: BasePairData[]
  startTime: number
  totalBases: number
}

export class DNAVisualizer {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private dnaGroup: THREE.Group | null = null

  private isDragging = false
  private lastMouseX = 0
  private lastMouseY = 0
  private targetRotationX = 0
  private targetRotationY = 0
  private currentRotationX = 0
  private currentRotationY = 0
  private targetZoom = 1
  private currentZoom = 1

  private isResetting = false
  private resetStartTime = 0
  private resetStartX = 0
  private resetStartY = 0
  private resetStartZoom = 0
  private resetTargetX = 0
  private resetTargetY = 0
  private resetTargetZoom = 1

  private animationId: number | null = null
  private onWindowResize: () => void
  private buildTask: BuildTask | null = null
  private buildFrameId: number | null = null
  private sphereCursor = 0
  private backboneCursor = 0
  private sphereInstancedMeshes: Map<number, THREE.InstancedMesh> = new Map()
  private sphereDummy = new THREE.Object3D()
  private backboneInstancedMesh: THREE.InstancedMesh | null = null
  private backboneDummy = new THREE.Object3D()
  private upVector = new THREE.Vector3(0, 1, 0)
  private helixRisePerBase = 0
  private sphereGeometry: THREE.SphereGeometry | null = null
  private cylinderGeometry: THREE.CylinderGeometry | null = null
  private basePairCount = 0

  private disposed = false

  constructor(container: HTMLElement) {
    this.container = container

    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    )
    this.camera.position.z = INITIAL_CAMERA_Z

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setClearColor(0x000000, 0)
    container.appendChild(this.renderer.domElement)

    this.setupLights()
    this.setupEventListeners()

    this.onWindowResize = () => this.handleResize()
    window.addEventListener('resize', this.onWindowResize)

    this.animate = this.animate.bind(this)
    this.animate()
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9)
    directionalLight.position.set(5, 5, 8)
    this.scene.add(directionalLight)

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4)
    directionalLight2.position.set(-5, -3, -5)
    this.scene.add(directionalLight2)
  }

  private setupEventListeners(): void {
    const dom = this.renderer.domElement

    dom.addEventListener('mousedown', (e) => {
      this.isDragging = true
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
      this.interruptReset()
    })

    window.addEventListener('mouseup', () => {
      this.isDragging = false
    })

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return
      const deltaX = e.clientX - this.lastMouseX
      const deltaY = e.clientY - this.lastMouseY
      this.targetRotationY += deltaX * 0.005
      this.targetRotationX += deltaY * 0.005
      this.targetRotationX = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, this.targetRotationX),
      )
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
    })

    dom.addEventListener('wheel', (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.08 : -0.08
      this.targetZoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, this.targetZoom + delta),
      )
    })

    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        this.resetCamera()
      }
    })
  }

  public resetCamera(): void {
    if (this.isResetting) {
      this.resetStartX = this.currentRotationX
      this.resetStartY = this.currentRotationY
      this.resetStartZoom = this.currentZoom
      this.resetStartTime = performance.now()
    } else {
      this.isResetting = true
      this.resetStartX = this.currentRotationX
      this.resetStartY = this.currentRotationY
      this.resetStartZoom = this.currentZoom
      this.resetStartTime = performance.now()
    }
    this.targetRotationX = 0
    this.targetRotationY = 0
    this.targetZoom = 1
    this.resetTargetX = 0
    this.resetTargetY = 0
    this.resetTargetZoom = 1
  }

  private interruptReset(): void {
    if (this.isResetting) {
      this.isResetting = false
      this.targetRotationX = this.currentRotationX
      this.targetRotationY = this.currentRotationY
      this.targetZoom = this.currentZoom
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  private handleResize(): void {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  public clearDNA(): void {
    if (this.buildFrameId !== null) {
      cancelAnimationFrame(this.buildFrameId)
      this.buildFrameId = null
      this.buildTask = null
    }

    if (this.dnaGroup) {
      this.scene.remove(this.dnaGroup)
      this.dnaGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose())
          } else {
            obj.material.dispose()
          }
        } else if (obj instanceof THREE.LineSegments) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose())
          } else {
            obj.material.dispose()
          }
        }
      })
      this.dnaGroup = null
    }

    this.sphereInstancedMeshes.clear()
    this.backboneInstancedMesh = null
    this.sphereCursor = 0
    this.backboneCursor = 0

    if (this.sphereGeometry) {
      this.sphereGeometry.dispose()
      this.sphereGeometry = null
    }
    if (this.cylinderGeometry) {
      this.cylinderGeometry.dispose()
      this.cylinderGeometry = null
    }
  }

  public async renderDNA(
    data: ParsedDNAData,
    onProgress?: RenderProgressCallback,
  ): Promise<void> {
    this.clearDNA()

    if (data.basePairs.length === 0) {
      return
    }

    this.basePairCount = data.basePairs.length
    this.dnaGroup = new THREE.Group()
    this.scene.add(this.dnaGroup)

    this.helixRisePerBase = Math.sqrt(
      (2 * HELIX_RADIUS * Math.sin(Math.PI / BASES_PER_TURN)) ** 2 +
        STEP_Z * STEP_Z,
    )

    return new Promise((resolve) => {
      this.buildTask = {
        type: 'spheres',
        data: data.basePairs,
        startTime: performance.now(),
        totalBases: data.basePairs.length,
      }
      this.sphereCursor = 0
      this.backboneCursor = 0

      const tick = () => {
        if (this.disposed || !this.buildTask) {
          resolve()
          return
        }

        const frameStart = performance.now()
        let worked = true

        while (worked && performance.now() - frameStart < FRAME_TIME_BUDGET_MS) {
          worked = this.buildStep()
        }

        const elapsed = performance.now() - this.buildTask.startTime
        const progress = this.getProgress()
        const stage = this.getStageName()
        const etaMs = progress > 0.02
          ? (elapsed / progress) * (1 - progress)
          : -1

        onProgress?.(progress, stage, etaMs)

        if (!worked || this.buildTask.type === 'done') {
          this.buildTask = null
          this.buildFrameId = null
          resolve()
        } else {
          this.buildFrameId = requestAnimationFrame(tick)
        }
      }

      this.buildFrameId = requestAnimationFrame(tick)
    })
  }

  private getProgress(): number {
    if (!this.buildTask) return 1
    const total = this.buildTask.totalBases
    if (total === 0) return 1

    switch (this.buildTask.type) {
      case 'spheres':
        return (this.sphereCursor / total) * 0.6
      case 'backbone':
        return 0.6 + (this.backboneCursor / Math.max(total - 1, 1)) * 0.3
      case 'hbonds':
        return 0.95
      default:
        return 1
    }
  }

  private getStageName(): string {
    if (!this.buildTask) return '完成'
    switch (this.buildTask.type) {
      case 'spheres': return '生成碱基球体'
      case 'backbone': return '生成螺旋骨架'
      case 'hbonds': return '生成氢键连线'
      default: return '渲染中...'
    }
  }

  private buildStep(): boolean {
    if (!this.buildTask || !this.dnaGroup) return false

    const { type, data } = this.buildTask

    if (type === 'spheres') {
      return this.buildSpheresStep(data)
    } else if (type === 'backbone') {
      return this.buildBackboneStep(data)
    } else if (type === 'hbonds') {
      this.buildHydrogenBonds(data)
      this.buildTask.type = 'done' as any
      return false
    }

    return false
  }

  private buildSpheresStep(data: BasePairData[]): boolean {
    if (this.sphereCursor >= data.length) {
      this.sphereInstancedMeshes.forEach((mesh) => {
        mesh.instanceMatrix.needsUpdate = true
        this.dnaGroup!.add(mesh)
      })
      this.buildTask!.type = 'backbone'
      return true
    }

    if (!this.sphereGeometry) {
      this.sphereGeometry = new THREE.SphereGeometry(
        BASE_SPHERE_RADIUS,
        SPHERE_WIDTH_SEGMENTS,
        SPHERE_HEIGHT_SEGMENTS,
      )
    }

    const end = Math.min(this.sphereCursor + BATCH_SIZE, data.length)

    for (let i = this.sphereCursor; i < end; i++) {
      const bp = data[i]
      const c1 = new THREE.Color(bp.base1.color).getHex()
      const c2 = new THREE.Color(bp.base2.color).getHex()

      this.addSphereInstance(c1, bp.base1.x, bp.base1.y, bp.base1.z, i * 2)
      this.addSphereInstance(c2, bp.base2.x, bp.base2.y, bp.base2.z, i * 2 + 1)
    }

    this.sphereCursor = end
    return end < data.length
  }

  private addSphereInstance(
    colorHex: number,
    x: number,
    y: number,
    z: number,
    globalIndex: number,
  ): void {
    let mesh = this.sphereInstancedMeshes.get(colorHex)
    if (!mesh) {
      const material = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.4,
        metalness: 0.1,
      })
      mesh = new THREE.InstancedMesh(
        this.sphereGeometry!,
        material,
        this.basePairCount * 2,
      )
      mesh.count = 0
      this.sphereInstancedMeshes.set(colorHex, mesh)
    }

    this.sphereDummy.position.set(x, y, z)
    this.sphereDummy.updateMatrix()
    mesh.setMatrixAt(mesh.count, this.sphereDummy.matrix)
    mesh.count++
  }

  private buildBackboneStep(data: BasePairData[]): boolean {
    if (this.backboneCursor >= data.length - 1) {
      if (this.backboneInstancedMesh) {
        this.backboneInstancedMesh.instanceMatrix.needsUpdate = true
        this.dnaGroup!.add(this.backboneInstancedMesh)
      }
      this.buildTask!.type = 'hbonds'
      return false
    }

    const totalSegments = Math.max(data.length - 1, 0) * 2

    if (!this.cylinderGeometry) {
      this.cylinderGeometry = new THREE.CylinderGeometry(
        BACKBONE_RADIUS,
        BACKBONE_RADIUS,
        1,
        BACKBONE_RADIAL_SEGMENTS,
        1,
      )
    }

    if (!this.backboneInstancedMesh) {
      const material = new THREE.MeshStandardMaterial({
        color: 0x8899aa,
        transparent: true,
        opacity: 0.55,
        roughness: 0.5,
        metalness: 0.2,
      })
      this.backboneInstancedMesh = new THREE.InstancedMesh(
        this.cylinderGeometry,
        material,
        Math.max(totalSegments, 1),
      )
      this.backboneInstancedMesh.count = 0
    }

    const end = Math.min(
      this.backboneCursor + BATCH_SIZE,
      data.length - 1,
    )

    for (let i = this.backboneCursor; i < end; i++) {
      for (let strand = 0; strand < 2; strand++) {
        const curr =
          strand === 0 ? data[i].base1 : data[i].base2
        const next =
          strand === 0 ? data[i + 1].base1 : data[i + 1].base2

        const dirX = next.x - curr.x
        const dirY = next.y - curr.y
        const dirZ = next.z - curr.z
        const len = Math.sqrt(
          dirX * dirX + dirY * dirY + dirZ * dirZ,
        ) || this.helixRisePerBase

        this.backboneDummy.position.set(
          (curr.x + next.x) / 2,
          (curr.y + next.y) / 2,
          (curr.z + next.z) / 2,
        )
        this.backboneDummy.scale.set(1, len, 1)

        const dir = new THREE.Vector3(dirX, dirY, dirZ)
        if (dir.lengthSq() > 0.0001) {
          dir.normalize()
          this.backboneDummy.quaternion.setFromUnitVectors(
            this.upVector,
            dir,
          )
        }
        this.backboneDummy.updateMatrix()

        this.backboneInstancedMesh!.setMatrixAt(
          this.backboneInstancedMesh!.count,
          this.backboneDummy.matrix,
        )
        this.backboneInstancedMesh!.count++
      }
    }

    this.backboneCursor = end
    return end < data.length - 1
  }

  private buildHydrogenBonds(basePairs: BasePairData[]): void {
    if (!this.dnaGroup) return

    const positions = new Float32Array(basePairs.length * 6)

    for (let i = 0; i < basePairs.length; i++) {
      const bp = basePairs[i]
      const idx = i * 6
      positions[idx] = bp.base1.x
      positions[idx + 1] = bp.base1.y
      positions[idx + 2] = bp.base1.z
      positions[idx + 3] = bp.base2.x
      positions[idx + 4] = bp.base2.y
      positions[idx + 5] = bp.base2.z
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.LineBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.35,
    })

    const lines = new THREE.LineSegments(geometry, material)
    this.dnaGroup.add(lines)
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate)

    const now = performance.now()

    if (this.isResetting) {
      const elapsed = (now - this.resetStartTime) / 1000
      const t = Math.min(1, elapsed / RESET_DURATION)
      const eased = this.easeInOutCubic(t)

      this.currentRotationX =
        this.resetStartX + (this.resetTargetX - this.resetStartX) * eased
      this.currentRotationY =
        this.resetStartY + (this.resetTargetY - this.resetStartY) * eased
      this.currentZoom =
        this.resetStartZoom + (this.resetTargetZoom - this.resetStartZoom) * eased

      if (t >= 1) {
        this.isResetting = false
        this.targetRotationX = this.resetTargetX
        this.targetRotationY = this.resetTargetY
        this.targetZoom = this.resetTargetZoom
      }
    } else {
      this.currentRotationX +=
        (this.targetRotationX - this.currentRotationX) * ROTATION_DAMPING
      this.currentRotationY +=
        (this.targetRotationY - this.currentRotationY) * ROTATION_DAMPING
      this.currentZoom +=
        (this.targetZoom - this.currentZoom) * 0.15
    }

    if (this.dnaGroup) {
      this.dnaGroup.rotation.x = this.currentRotationX
      this.dnaGroup.rotation.y = this.currentRotationY
    }

    this.camera.position.z = INITIAL_CAMERA_Z / this.currentZoom

    this.renderer.render(this.scene, this.camera)
  }

  public dispose(): void {
    this.disposed = true
    if (this.buildFrameId !== null) {
      cancelAnimationFrame(this.buildFrameId)
      this.buildFrameId = null
    }
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    window.removeEventListener('resize', this.onWindowResize)
    this.clearDNA()
    this.renderer.dispose()
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(
        this.renderer.domElement,
      )
    }
  }
}
