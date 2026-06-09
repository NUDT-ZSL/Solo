import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { AcousticPhysics, ERA_CONFIGS } from './physics'

interface TheaterMeshes {
  seats: THREE.Mesh[]
  stage: THREE.Mesh | null
  columns: THREE.Mesh[]
  backWall: THREE.Mesh | null
  collidables: THREE.Object3D[]
  energySpheres: THREE.Mesh[]
}

export class TheaterScene {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private physics: AcousticPhysics
  private theaterMeshes: TheaterMeshes
  private rayLineSegments: THREE.LineSegments | null = null
  private rayMaterial: THREE.LineBasicMaterial
  private playing: boolean = false
  private animationId: number = 0
  private clock: THREE.Clock
  private pulseTime: number = 0
  private onRT60Update: ((value: number) => void) | null = null
  private onPlayStateChange: ((playing: boolean) => void) | null = null

  private readonly THEATER_RADIUS = 12
  private readonly ROWS = 15
  private readonly ROW_HEIGHT = 0.4
  private readonly SEAT_WIDTH = 0.8

  constructor(containerId: string, physics: AcousticPhysics) {
    this.container = document.getElementById(containerId) || document.body
    this.physics = physics
    this.clock = new THREE.Clock()

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1A1512)
    this.scene.fog = new THREE.Fog(0x1A1512, 30, 60)

    this.camera = new THREE.PerspectiveCamera(
      50,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      500
    )
    this.camera.position.set(0, 18, 25)
    this.camera.lookAt(0, 2, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    this.container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.rotateSpeed = 0.5
    this.controls.minDistance = 10
    this.controls.maxDistance = 40
    this.controls.maxPolarAngle = Math.PI * 0.48
    this.controls.target.set(0, 2, 0)

    this.rayMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      linewidth: 1
    })

    this.theaterMeshes = {
      seats: [],
      stage: null,
      columns: [],
      backWall: null,
      collidables: [],
      energySpheres: []
    }

    this.setupLighting()
    this.buildTheater()
    this.setupGround()
    this.initEnergySpheres()

    this.physics.setTheaterParams(this.THEATER_RADIUS, this.ROWS)

    window.addEventListener('resize', this.handleResize)
  }

  public setRT60Callback(cb: (v: number) => void): void {
    this.onRT60Update = cb
  }

  public setPlayStateCallback(cb: (playing: boolean) => void): void {
    this.onPlayStateChange = cb
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0xD4AF8A, 0.45)
    this.scene.add(ambient)

    const hemisphere = new THREE.HemisphereLight(0xE8D0A8, 0x2D221C, 0.4)
    this.scene.add(hemisphere)

    const sunLight = new THREE.DirectionalLight(0xFFE4B5, 0.9)
    sunLight.position.set(8, 20, 10)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.set(2048, 2048)
    sunLight.shadow.camera.left = -20
    sunLight.shadow.camera.right = 20
    sunLight.shadow.camera.top = 20
    sunLight.shadow.camera.bottom = -20
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = 60
    this.scene.add(sunLight)

    const stageLight = new THREE.PointLight(0xFFD089, 0.6, 20)
    stageLight.position.set(0, 3, 0)
    this.scene.add(stageLight)
  }

  private buildTheater(): void {
    this.buildSeats()
    this.buildStage()
    this.buildColumns()
    this.buildBackWall()
    this.updateCollidables()
  }

  private buildSeats(): void {
    const baseColor = new THREE.Color(0xC4A77D)
    const arcSegments = 8
    const halfAngle = Math.PI * 0.7

    for (let row = 0; row < this.ROWS; row++) {
      const innerR = 4 + row * ((this.THEATER_RADIUS - 4) / this.ROWS)
      const outerR = innerR + this.SEAT_WIDTH
      const y = row * this.ROW_HEIGHT
      const height = this.ROW_HEIGHT * 0.85

      const shape = new THREE.Shape()
      const innerPoints: THREE.Vector2[] = []
      const outerPoints: THREE.Vector2[] = []

      for (let i = 0; i <= arcSegments; i++) {
        const t = i / arcSegments
        const angle = -halfAngle / 2 + t * halfAngle
        innerPoints.push(new THREE.Vector2(
          Math.sin(angle) * innerR,
          -Math.cos(angle) * innerR
        ))
        outerPoints.push(new THREE.Vector2(
          Math.sin(angle) * outerR,
          -Math.cos(angle) * outerR
        ))
      }

      shape.moveTo(innerPoints[0].x, innerPoints[0].y)
      for (let i = 1; i <= arcSegments; i++) {
        shape.lineTo(innerPoints[i].x, innerPoints[i].y)
      }
      for (let i = arcSegments; i >= 0; i--) {
        shape.lineTo(outerPoints[i].x, outerPoints[i].y)
      }
      shape.lineTo(innerPoints[0].x, innerPoints[0].y)

      const extrudeSettings = {
        depth: height,
        bevelEnabled: false,
        curveSegments: 2
      }

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
      geometry.rotateX(Math.PI / 2)
      geometry.translate(0, y, 0)

      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.85,
        metalness: 0.05,
        flatShading: true
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData = { type: 'seat', row }
      this.scene.add(mesh)
      this.theaterMeshes.seats.push(mesh)
    }
  }

  private buildStage(): void {
    const geometry = new THREE.BoxGeometry(4, 0.3, 3)
    geometry.translate(0, 0.15, 0)
    const material = new THREE.MeshStandardMaterial({
      color: 0x8B7355,
      roughness: 0.8,
      metalness: 0.05,
      flatShading: true
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData = { type: 'stage' }
    this.scene.add(mesh)
    this.theaterMeshes.stage = mesh
  }

  private buildColumns(): void {
    const columnPositions = [
      new THREE.Vector3(-2.5, 0.3, -1.2),
      new THREE.Vector3(0, 0.3, -1.5),
      new THREE.Vector3(2.5, 0.3, -1.2)
    ]

    for (const pos of columnPositions) {
      const geometry = new THREE.CylinderGeometry(0.22, 0.28, 4.5, 8, 1, false)
      geometry.translate(0, 2.25, 0)
      const material = new THREE.MeshStandardMaterial({
        color: 0xB8A07A,
        roughness: 0.78,
        metalness: 0.08,
        flatShading: true
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(pos)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData = { type: 'column' }
      this.scene.add(mesh)
      this.theaterMeshes.columns.push(mesh)

      const capGeo = new THREE.CylinderGeometry(0.32, 0.22, 0.3, 8, 1, false)
      const capMat = new THREE.MeshStandardMaterial({
        color: 0xA08868,
        roughness: 0.8,
        flatShading: true
      })
      const cap = new THREE.Mesh(capGeo, capMat)
      cap.position.set(pos.x, pos.y + 4.65, pos.z)
      cap.castShadow = true
      this.scene.add(cap)
      this.theaterMeshes.columns.push(cap)
    }
  }

  private buildBackWall(): void {
    const wallRadius = 13.2
    const wallHeight = 5.5
    const halfAngle = Math.PI * 0.72
    const segments = 8

    const points: THREE.Vector3[] = []
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const angle = -halfAngle / 2 + t * halfAngle
      points.push(new THREE.Vector3(
        Math.sin(angle) * wallRadius,
        0,
        -Math.cos(angle) * wallRadius
      ))
    }

    const shape = new THREE.Shape()
    shape.moveTo(points[0].x, points[0].z)
    for (let i = 1; i <= segments; i++) {
      shape.lineTo(points[i].x, points[i].z)
    }
    for (let i = segments; i >= 0; i--) {
      const innerR = wallRadius - 0.5
      const angle = -halfAngle / 2 + (i / segments) * halfAngle
      shape.lineTo(
        Math.sin(angle) * innerR,
        -Math.cos(angle) * innerR
      )
    }
    shape.lineTo(points[0].x, points[0].z)

    const extrudeSettings = {
      depth: wallHeight,
      bevelEnabled: false,
      curveSegments: 2
    }

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    geometry.rotateX(Math.PI / 2)

    const material = new THREE.MeshStandardMaterial({
      color: 0x9C8465,
      roughness: 0.9,
      metalness: 0.02,
      flatShading: true
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = 0.3
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData = { type: 'backWall' }
    this.scene.add(mesh)
    this.theaterMeshes.backWall = mesh
  }

  private setupGround(): void {
    const geometry = new THREE.CircleGeometry(40, 32)
    geometry.rotateX(-Math.PI / 2)
    const material = new THREE.MeshStandardMaterial({
      color: 0x2A2018,
      roughness: 1.0,
      metalness: 0
    })
    const ground = new THREE.Mesh(geometry, material)
    ground.position.y = -0.01
    ground.receiveShadow = true
    this.scene.add(ground)
  }

  private initEnergySpheres(): void {
    this.physics.initSeatSamples()
    const samples = this.physics.getSeatSamples()
    for (const sample of samples) {
      const geometry = new THREE.SphereGeometry(0.2, 12, 12)
      const material = new THREE.MeshBasicMaterial({
        color: 0x3344AA,
        transparent: true,
        opacity: 0.7
      })
      const sphere = new THREE.Mesh(geometry, material)
      sphere.position.copy(sample.position)
      sphere.visible = false
      this.scene.add(sphere)
      this.theaterMeshes.energySpheres.push(sphere)
    }
  }

  private updateCollidables(): void {
    const collidables: THREE.Object3D[] = []
    collidables.push(...this.theaterMeshes.seats)
    if (this.theaterMeshes.stage) collidables.push(this.theaterMeshes.stage)
    collidables.push(...this.theaterMeshes.columns)
    if (this.theaterMeshes.backWall) collidables.push(this.theaterMeshes.backWall)
    this.theaterMeshes.collidables = collidables
    this.physics.setCollidables(collidables)
  }

  public setEra(era: number): void {
    const config = ERA_CONFIGS[era]
    if (!config) return

    this.physics.setAbsorption(config.absorption)

    let seatColor: number
    switch (config.seatMaterial) {
      case 'bare':
        seatColor = 0xC4A77D
        break
      case 'wood':
        seatColor = 0x8B6914
        break
      case 'fabric':
        seatColor = 0x704214
        break
      default:
        seatColor = 0xC4A77D
    }

    for (const seat of this.theaterMeshes.seats) {
      const mat = seat.material as THREE.MeshStandardMaterial
      mat.color.setHex(seatColor)
      mat.needsUpdate = true
    }

    this.restartSimulation()
  }

  public togglePlay(): void {
    this.playing = !this.playing
    if (this.playing) {
      this.physics.spawnRays()
      this.startAnimation()
    }
    if (this.onPlayStateChange) this.onPlayStateChange(this.playing)
  }

  public restartSimulation(): void {
    this.playing = false
    this.physics.clear()
    this.clearRayVisuals()
    for (const sphere of this.theaterMeshes.energySpheres) {
      sphere.visible = false
    }
    if (this.onPlayStateChange) this.onPlayStateChange(false)
    if (this.onRT60Update) this.onRT60Update(0)
  }

  private clearRayVisuals(): void {
    if (this.rayLineSegments) {
      this.scene.remove(this.rayLineSegments)
      this.rayLineSegments.geometry.dispose()
      this.rayLineSegments = null
    }
  }

  private startAnimation(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId)
    this.animate()
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate)
    const delta = this.clock.getDelta()
    this.pulseTime += delta

    if (this.playing) {
      const alive = this.physics.step()
      if (!alive) {
        this.playing = false
        if (this.onPlayStateChange) this.onPlayStateChange(false)
      }
      this.updateRayVisuals()
      this.updateEnergySpheres()
    }

    this.updatePulse()

    if (this.onRT60Update) {
      const rt60 = this.physics.computeRT60()
      this.onRT60Update(rt60)
    }

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  private updateRayVisuals(): void {
    const rays = this.physics.getRays()
    const positions: number[] = []
    const colors: number[] = []

    for (const ray of rays) {
      for (const seg of ray.segments) {
        positions.push(seg.start.x, seg.start.y, seg.start.z)
        positions.push(seg.end.x, seg.end.y, seg.end.z)
        colors.push(seg.color.r, seg.color.g, seg.color.b)
        colors.push(seg.color.r, seg.color.g, seg.color.b)
      }
    }

    this.clearRayVisuals()
    if (positions.length === 0) return

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    this.rayLineSegments = new THREE.LineSegments(geometry, this.rayMaterial)
    this.scene.add(this.rayLineSegments)
  }

  private updateEnergySpheres(): void {
    const samples = this.physics.getSeatSamples()
    for (let i = 0; i < samples.length; i++) {
      const sphere = this.theaterMeshes.energySpheres[i]
      const sample = samples[i]
      if (sample.totalEnergy > 0.01 || sample.rayCount > 0) {
        sphere.visible = true
        const mat = sphere.material as THREE.MeshBasicMaterial
        const e = Math.min(sample.totalEnergy, 2.5)
        const t = Math.max(0, Math.min(1, (e - 0.5) / 1.5))
        const color = new THREE.Color()
        color.setHSL(0.66 * (1 - t), 0.85, 0.55)
        mat.color.copy(color)
        mat.opacity = 0.65
      }
    }
  }

  private updatePulse(): void {
    const t = (Math.sin(this.pulseTime * Math.PI * 2 / 0.8) + 1) / 2
    const scale = 1.0 + t * 0.1
    for (const sphere of this.theaterMeshes.energySpheres) {
      if (sphere.visible) {
        sphere.scale.setScalar(scale)
      }
    }
  }

  private handleResize = (): void => {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  public start(): void {
    this.startAnimation()
  }

  public dispose(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId)
    window.removeEventListener('resize', this.handleResize)
    this.renderer.dispose()
    this.controls.dispose()
  }
}
