import * as THREE from 'three'
import type { ParsedDNAData, BasePairData } from './DNAParser'

const BASE_SPHERE_RADIUS = 0.12
const SPHERE_WIDTH_SEGMENTS = 12
const SPHERE_HEIGHT_SEGMENTS = 8
const BACKBONE_RADIUS = 0.05
const BACKBONE_RADIAL_SEGMENTS = 8
const HBOND_LINE_WIDTH = 1
const INITIAL_CAMERA_Z = 8
const MIN_ZOOM = 0.5
const MAX_ZOOM = 3.0
const ROTATION_DAMPING = 0.1
const RESET_DURATION = 0.8

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

  private animationId: number | null = null
  private onWindowResize: () => void

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
      this.isResetting = false
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
    this.isResetting = true
    this.resetStartTime = performance.now()
    this.resetStartX = this.currentRotationX
    this.resetStartY = this.currentRotationY
    this.resetStartZoom = this.currentZoom
    this.targetRotationX = 0
    this.targetRotationY = 0
    this.targetZoom = 1
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
  }

  public renderDNA(data: ParsedDNAData): void {
    this.clearDNA()

    if (data.basePairs.length === 0) {
      return
    }

    this.dnaGroup = new THREE.Group()
    this.scene.add(this.dnaGroup)

    this.createBaseSpheres(data.basePairs)
    this.createBackbone(data.basePairs)
    this.createHydrogenBonds(data.basePairs)
  }

  private createBaseSpheres(basePairs: BasePairData[]): void {
    const sphereGeometry = new THREE.SphereGeometry(
      BASE_SPHERE_RADIUS,
      SPHERE_WIDTH_SEGMENTS,
      SPHERE_HEIGHT_SEGMENTS,
    )

    const colorMap = new Map<string, number>()
    basePairs.forEach((bp) => {
      colorMap.set(bp.base1.color, new THREE.Color(bp.base1.color).getHex())
      colorMap.set(bp.base2.color, new THREE.Color(bp.base2.color).getHex())
    })

    const colorGroups = new Map<number, { positions: THREE.Vector3[] }>()
    basePairs.forEach((bp) => {
      const c1 = new THREE.Color(bp.base1.color).getHex()
      const c2 = new THREE.Color(bp.base2.color).getHex()

      if (!colorGroups.has(c1)) {
        colorGroups.set(c1, { positions: [] })
      }
      colorGroups.get(c1)!.positions.push(
        new THREE.Vector3(bp.base1.x, bp.base1.y, bp.base1.z),
      )

      if (!colorGroups.has(c2)) {
        colorGroups.set(c2, { positions: [] })
      }
      colorGroups.get(c2)!.positions.push(
        new THREE.Vector3(bp.base2.x, bp.base2.y, bp.base2.z),
      )
    })

    colorGroups.forEach(({ positions }, colorHex) => {
      const material = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.4,
        metalness: 0.1,
      })

      const instancedMesh = new THREE.InstancedMesh(
        sphereGeometry,
        material,
        positions.length,
      )

      const dummy = new THREE.Object3D()
      positions.forEach((pos, i) => {
        dummy.position.copy(pos)
        dummy.updateMatrix()
        instancedMesh.setMatrixAt(i, dummy.matrix)
      })

      instancedMesh.instanceMatrix.needsUpdate = true
      this.dnaGroup!.add(instancedMesh)
    })
  }

  private createBackbone(basePairs: BasePairData[]): void {
    if (basePairs.length < 2) return

    const material = new THREE.MeshStandardMaterial({
      color: 0x8899aa,
      transparent: true,
      opacity: 0.55,
      roughness: 0.5,
      metalness: 0.2,
    })

    for (let strand = 0; strand < 2; strand++) {
      for (let i = 0; i < basePairs.length - 1; i++) {
        const curr =
          strand === 0 ? basePairs[i].base1 : basePairs[i].base2
        const next =
          strand === 0 ? basePairs[i + 1].base1 : basePairs[i + 1].base2

        const start = new THREE.Vector3(curr.x, curr.y, curr.z)
        const end = new THREE.Vector3(next.x, next.y, next.z)

        const dir = new THREE.Vector3().subVectors(end, start)
        const len = dir.length()

        const geometry = new THREE.CylinderGeometry(
          BACKBONE_RADIUS,
          BACKBONE_RADIUS,
          len,
          BACKBONE_RADIAL_SEGMENTS,
          1,
        )

        const cylinder = new THREE.Mesh(geometry, material)
        cylinder.position.copy(start.clone().add(end).multiplyScalar(0.5))
        cylinder.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.clone().normalize(),
        )
        this.dnaGroup!.add(cylinder)
      }
    }
  }

  private createHydrogenBonds(basePairs: BasePairData[]): void {
    const positions: number[] = []

    basePairs.forEach((bp) => {
      positions.push(
        bp.base1.x,
        bp.base1.y,
        bp.base1.z,
        bp.base2.x,
        bp.base2.y,
        bp.base2.z,
      )
    })

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    )

    const material = new THREE.LineBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.35,
    })

    const lines = new THREE.LineSegments(geometry, material)
    this.dnaGroup!.add(lines)
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate)

    const now = performance.now()

    if (this.isResetting) {
      const elapsed = (now - this.resetStartTime) / 1000
      const t = Math.min(1, elapsed / RESET_DURATION)
      const eased = this.easeInOutCubic(t)

      this.currentRotationX =
        this.resetStartX + (0 - this.resetStartX) * eased
      this.currentRotationY =
        this.resetStartY + (0 - this.resetStartY) * eased
      this.currentZoom =
        this.resetStartZoom + (1 - this.resetStartZoom) * eased

      if (t >= 1) {
        this.isResetting = false
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
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
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
