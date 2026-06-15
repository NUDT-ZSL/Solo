import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Galaxy } from '../../constants'
import { GALAXY_PRESETS } from '../../constants'

interface PlacementAnim {
  id: string
  startTime: number
  duration: number
  position: [number, number, number]
  color: THREE.Color
  mesh: THREE.Mesh
}

interface GalaxyRenderData {
  id: string
  position: [number, number, number]
  baseColor: THREE.Color
  halo: THREE.Sprite
  selectedHalo?: THREE.Mesh
}

export interface FrameData {
  positions: Float32Array
  colors: Float32Array
  prevPositions: Float32Array
  particleIds: Int32Array
  galaxyIds: string[]
  particleGalaxies: Int32Array
  totalParticles: number
}

export type PlacementCallback = (type: Galaxy['type'], position: [number, number, number]) => void
export type GalaxySelectCallback = (galaxyId: string) => void

const BG_STAR_COUNT = 200
const MAX_PARTICLES = 5000
const TRAIL_LENGTH = 8
const TRAIL_DISTANCE = 0.5

export class SceneManager {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls

  private particleSystem: THREE.Points | null = null
  private particleGeometry: THREE.BufferGeometry | null = null
  private particleMaterial: THREE.PointsMaterial | null = null
  private particleTexture: THREE.Texture | null = null

  private trailSystems: THREE.Points[] = []

  private posBuffer: Float32Array
  private colBuffer: Float32Array

  private trailPosBuffer: Float32Array[]
  private trailColBuffer: Float32Array[]

  private history: Float32Array[][] = []
  private historyColors: Float32Array[] = []
  private historyHead = 0

  private galaxyRenderData = new Map<string, GalaxyRenderData>()
  private placementAnims: PlacementAnim[] = []
  private backgroundStars: THREE.Points | null = null
  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2()
  private placementPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  private hitPoint = new THREE.Vector3()
  private placementGhost: THREE.Mesh | null = null
  private activePlacementType: Galaxy['type'] | null = null

  private selectedGalaxyIds: Set<string> = new Set()
  private selectionChanged = false

  private onGalaxyPlacement: PlacementCallback | null = null
  private onGalaxySelected: GalaxySelectCallback | null = null

  private container: HTMLElement
  private running = true
  private animationFrameId = 0
  private lastFrameData: FrameData | null = null
  private frameGalaxies: string[] = []
  private galaxyPositions: Record<string, [number, number, number]> = {}
  private galaxyColors: Record<string, [number, number, number]> = {}
  private prevTotalParticles = 0

  constructor(container: HTMLElement) {
    this.container = container

    this.posBuffer = new Float32Array(MAX_PARTICLES * 3)
    this.colBuffer = new Float32Array(MAX_PARTICLES * 3)

    this.trailPosBuffer = []
    this.trailColBuffer = []
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      this.trailPosBuffer.push(new Float32Array(MAX_PARTICLES * 3))
      this.trailColBuffer.push(new Float32Array(MAX_PARTICLES * 3))
      this.history.push(new Float32Array(MAX_PARTICLES * 3))
      this.historyColors.push(new Float32Array(MAX_PARTICLES * 3))
    }

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 500)
    this.camera.position.set(0, 7, 11)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 2
    this.controls.maxDistance = 50
    this.controls.enablePan = true

    this.setupBackground()
    this.setupParticleSystem()
    this.setupTrailSystems()
    this.setupPlacementPlane()
    this.addAmbientLight()
    this.bindEvents()
    this.startRenderLoop()
  }

  private addAmbientLight() {
    const ambient = new THREE.AmbientLight(0x111122, 0.3)
    this.scene.add(ambient)
  }

  private setupBackground() {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 2
    const ctx = canvas.getContext('2d')!
    const grd = ctx.createRadialGradient(1, 1, 0, 1, 1, 1.5)
    grd.addColorStop(0, '#001133')
    grd.addColorStop(1, '#000011')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, 2, 2)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    this.scene.background = tex
    this.scene.fog = new THREE.Fog(0x000011, 15, 50)

    const starGeom = new THREE.BufferGeometry()
    const starPos = new Float32Array(BG_STAR_COUNT * 3)
    const starCol = new Float32Array(BG_STAR_COUNT * 3)
    for (let i = 0; i < BG_STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 30 + Math.random() * 15
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      starPos[i * 3 + 2] = r * Math.cos(phi)
      const b = 0.4 + Math.random() * 0.6
      starCol[i * 3] = b
      starCol[i * 3 + 1] = b
      starCol[i * 3 + 2] = Math.min(1, b + Math.random() * 0.2)
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    starGeom.setAttribute('color', new THREE.BufferAttribute(starCol, 3))
    const starMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      sizeAttenuation: true,
    })
    this.backgroundStars = new THREE.Points(starGeom, starMat)
    this.scene.add(this.backgroundStars)
  }

  private createSoftTexture(): THREE.Texture {
    const c = document.createElement('canvas')
    c.width = 64
    c.height = 64
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.2, 'rgba(255,255,255,0.9)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.3)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }

  private createHaloTexture(): THREE.Texture {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    g.addColorStop(0, 'rgba(150,180,255,0.18)')
    g.addColorStop(0.3, 'rgba(120,150,220,0.10)')
    g.addColorStop(0.7, 'rgba(80,100,180,0.04)')
    g.addColorStop(1, 'rgba(50,70,150,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }

  private setupParticleSystem() {
    this.particleTexture = this.createSoftTexture()
    this.particleGeometry = new THREE.BufferGeometry()
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.posBuffer, 3))
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colBuffer, 3))
    this.particleGeometry.setDrawRange(0, 0)
    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.075,
      map: this.particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
    this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial)
    this.scene.add(this.particleSystem)
  }

  private setupTrailSystems() {
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const geom = new THREE.BufferGeometry()
      geom.setAttribute('position', new THREE.BufferAttribute(this.trailPosBuffer[i], 3))
      geom.setAttribute('color', new THREE.BufferAttribute(this.trailColBuffer[i], 3))
      geom.setDrawRange(0, 0)
      const mat = new THREE.PointsMaterial({
        size: 0.035,
        map: this.particleTexture || this.createSoftTexture(),
        vertexColors: true,
        transparent: true,
        opacity: 0.75 - i * (0.75 / TRAIL_LENGTH),
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })
      const pts = new THREE.Points(geom, mat)
      this.trailSystems.push(pts)
      this.scene.add(pts)
    }
  }

  private setupPlacementPlane() {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, 64, 64)
    const tex = new THREE.CanvasTexture(canvas)
    const geom = new THREE.PlaneGeometry(200, 200)
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(geom, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = 0
    mesh.name = '__placement_plane__'
    this.scene.add(mesh)
  }

  private bindEvents() {
    const dom = this.renderer.domElement
    dom.addEventListener('pointermove', this.onPointerMove)
    dom.addEventListener('pointerdown', this.onPointerDown)
    dom.addEventListener('contextmenu', e => e.preventDefault())
    window.addEventListener('resize', this.onResize)
  }

  private onResize = () => {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private updateMouse(clientX: number, clientY: number) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1
  }

  private onPointerMove = (e: PointerEvent) => {
    this.updateMouse(e.clientX, e.clientY)
    this.raycaster.setFromCamera(this.mouse, this.camera)
    if (this.activePlacementType && this.placementGhost) {
      this.raycaster.ray.intersectPlane(this.placementPlane, this.hitPoint)
      this.placementGhost.position.set(this.hitPoint.x, Math.max(0, this.hitPoint.y), this.hitPoint.z)
    }
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    this.updateMouse(e.clientX, e.clientY)
    this.raycaster.setFromCamera(this.mouse, this.camera)

    if (this.activePlacementType) {
      this.raycaster.ray.intersectPlane(this.placementPlane, this.hitPoint)
      const pos: [number, number, number] = [this.hitPoint.x, Math.max(0, this.hitPoint.y), this.hitPoint.z]
      if (this.onGalaxyPlacement) {
        this.onGalaxyPlacement(this.activePlacementType, pos)
      }
      return
    }

    const intersects = this.raycaster.intersectObjects(this.scene.children, false)
    for (const hit of intersects) {
      const gId = hit.object.userData.galaxyId as string | undefined
      if (gId) {
        if (this.onGalaxySelected) this.onGalaxySelected(gId)
        return
      }
    }
  }

  private startRenderLoop() {
    const render = () => {
      if (!this.running) return
      this.controls.update()
      this.updatePlacementAnimations()
      this.updateGalaxyHalos()
      this.renderer.render(this.scene, this.camera)
      this.animationFrameId = requestAnimationFrame(render)
    }
    this.animationFrameId = requestAnimationFrame(render)
  }

  private updatePlacementAnimations() {
    const now = Date.now()
    const toRemove: number[] = []
    for (let i = 0; i < this.placementAnims.length; i++) {
      const p = this.placementAnims[i]
      const t = (now - p.startTime) / p.duration
      if (t >= 1) {
        this.scene.remove(p.mesh)
        p.mesh.geometry.dispose()
        ;(p.mesh.material as THREE.Material).dispose()
        toRemove.push(i)
        continue
      }
      const scale = 0.2 + t * 4
      p.mesh.scale.setScalar(scale)
      const mat = p.mesh.material as THREE.MeshBasicMaterial
      mat.opacity = 0.6 * (1 - t)
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.placementAnims.splice(toRemove[i], 1)
    }
  }

  private updateGalaxyHalos() {
    for (const [id, gd] of this.galaxyRenderData) {
      const pos = this.galaxyPositions[id]
      if (pos) {
        gd.halo.position.set(pos[0], pos[1], pos[2])
        if (gd.selectedHalo) {
          gd.selectedHalo.position.set(pos[0], pos[1], pos[2])
          gd.selectedHalo.visible = this.selectedGalaxyIds.has(id)
        }
      }
    }
  }

  setPlacementCallback(cb: PlacementCallback) { this.onGalaxyPlacement = cb }
  setGalaxySelectedCallback(cb: GalaxySelectCallback) { this.onGalaxySelected = cb }

  startPlacementMode(type: Galaxy['type']) {
    this.activePlacementType = type
    const preset = GALAXY_PRESETS.find(p => p.type === type)!
    const color = new THREE.Color(preset.colorRange[0])
    const geom = new THREE.RingGeometry(1.2, 1.4, 48)
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const mesh = new THREE.Mesh(geom, mat)
    mesh.rotation.x = -Math.PI / 2
    this.placementGhost = mesh
    this.scene.add(mesh)
    this.controls.enabled = false
  }

  cancelPlacementMode() {
    if (this.placementGhost) {
      this.scene.remove(this.placementGhost)
      this.placementGhost.geometry.dispose()
      ;(this.placementGhost.material as THREE.Material).dispose()
      this.placementGhost = null
    }
    this.activePlacementType = null
    this.controls.enabled = true
  }

  addGalaxyRender(galaxy: Galaxy) {
    const geom = new THREE.RingGeometry(0.2, 2.5, 64)
    const color = new THREE.Color(galaxy.galaxyBaseColor[0], galaxy.galaxyBaseColor[1], galaxy.galaxyBaseColor[2])
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const mesh = new THREE.Mesh(geom, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(galaxy.position[0], galaxy.position[1], galaxy.position[2])
    this.scene.add(mesh)
    this.placementAnims.push({
      id: galaxy.id,
      startTime: Date.now(),
      duration: 800,
      position: galaxy.position,
      color,
      mesh,
    })

    const haloTexture = this.createHaloTexture()
    const haloMat = new THREE.SpriteMaterial({
      map: haloTexture,
      color,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const halo = new THREE.Sprite(haloMat)
    halo.scale.set(5, 5, 1)
    halo.position.set(galaxy.position[0], galaxy.position[1], galaxy.position[2])
    halo.userData.galaxyId = galaxy.id
    this.scene.add(halo)

    const selGeom = new THREE.RingGeometry(1.5, 1.8, 48)
    const selMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const selHalo = new THREE.Mesh(selGeom, selMat)
    selHalo.rotation.x = -Math.PI / 2
    selHalo.position.set(galaxy.position[0], galaxy.position[1], galaxy.position[2])
    selHalo.visible = false
    selHalo.userData.galaxyId = galaxy.id
    this.scene.add(selHalo)

    this.galaxyRenderData.set(galaxy.id, {
      id: galaxy.id,
      position: galaxy.position,
      baseColor: color,
      halo,
      selectedHalo: selHalo,
    })

    this.galaxyPositions[galaxy.id] = [...galaxy.position]
    this.galaxyColors[galaxy.id] = [...galaxy.galaxyBaseColor]
  }

  removeGalaxyRender(id: string) {
    const gd = this.galaxyRenderData.get(id)
    if (gd) {
      this.scene.remove(gd.halo)
      gd.halo.material.dispose()
      if (gd.selectedHalo) {
        this.scene.remove(gd.selectedHalo)
        gd.selectedHalo.geometry.dispose()
        ;(gd.selectedHalo.material as THREE.Material).dispose()
      }
      this.galaxyRenderData.delete(id)
    }
    delete this.galaxyPositions[id]
    delete this.galaxyColors[id]
  }

  setSelectedGalaxyIds(ids: string[]) {
    this.selectedGalaxyIds = new Set(ids)
  }

  updateFromFrameData(data: FrameData) {
    this.lastFrameData = data
    this.frameGalaxies = data.galaxyIds

    const count = data.totalParticles
    if (count > 0) {
      const prevCount = this.prevTotalParticles || count
      this.historyHead = (this.historyHead + 1) % TRAIL_LENGTH
      this.history[this.historyHead].set(data.positions.slice(0, count * 3))
      this.historyColors[this.historyHead].set(data.colors.slice(0, count * 3))

      this.posBuffer.set(data.positions.slice(0, count * 3))
      this.colBuffer.set(data.colors.slice(0, count * 3))

      for (let tl = 0; tl < TRAIL_LENGTH; tl++) {
        const hi = (this.historyHead - tl - 1 + TRAIL_LENGTH) % TRAIL_LENGTH
        const alpha = 1 - (tl / TRAIL_LENGTH)
        const baseOpacity = count > 3000 ? 0.2 : 0.8
        for (let i = 0; i < count && i < MAX_PARTICLES; i++) {
          this.trailPosBuffer[tl][i * 3] = this.history[hi][i * 3] || data.positions[i * 3]
          this.trailPosBuffer[tl][i * 3 + 1] = this.history[hi][i * 3 + 1] || data.positions[i * 3 + 1]
          this.trailPosBuffer[tl][i * 3 + 2] = this.history[hi][i * 3 + 2] || data.positions[i * 3 + 2]

          const r = this.historyColors[hi][i * 3] || data.colors[i * 3]
          const g = this.historyColors[hi][i * 3 + 1] || data.colors[i * 3 + 1]
          const b = this.historyColors[hi][i * 3 + 2] || data.colors[i * 3 + 2]
          const a = alpha * baseOpacity
          this.trailColBuffer[tl][i * 3] = Math.min(1, r * a * 1.2)
          this.trailColBuffer[tl][i * 3 + 1] = Math.min(1, g * a * 1.2)
          this.trailColBuffer[tl][i * 3 + 2] = Math.min(1, b * a * 1.2)
        }

        const trailGeom = this.trailSystems[tl].geometry as THREE.BufferGeometry
        const posAttr = trailGeom.getAttribute('position') as THREE.BufferAttribute
        const colAttr = trailGeom.getAttribute('color') as THREE.BufferAttribute
        posAttr.needsUpdate = true
        colAttr.needsUpdate = true
        trailGeom.setDrawRange(0, count)

        const mat = this.trailSystems[tl].material as THREE.PointsMaterial
        const targetOpacity = count > 3000 ? 0.2 : 0.8
        mat.opacity = targetOpacity * alpha
      }

      if (count < prevCount) {
        for (let i = count; i < prevCount && i < MAX_PARTICLES; i++) {
          this.posBuffer[i * 3] = 999999
          this.posBuffer[i * 3 + 1] = 999999
          this.posBuffer[i * 3 + 2] = 999999
          this.colBuffer[i * 3] = 0
          this.colBuffer[i * 3 + 1] = 0
          this.colBuffer[i * 3 + 2] = 0
        }
      }
    }

    if (this.particleGeometry) {
      const posAttr = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute
      const colAttr = this.particleGeometry.getAttribute('color') as THREE.BufferAttribute
      posAttr.needsUpdate = true
      colAttr.needsUpdate = true
      this.particleGeometry.setDrawRange(0, count)
    }

    this.computeGalaxyCenters(data)
    this.prevTotalParticles = count
  }

  private computeGalaxyCenters(data: FrameData) {
    const galaxySumsX: Record<string, number> = {}
    const galaxySumsY: Record<string, number> = {}
    const galaxySumsZ: Record<string, number> = {}
    const galaxyCounts: Record<string, number> = {}
    for (const id of data.galaxyIds) {
      galaxySumsX[id] = 0
      galaxySumsY[id] = 0
      galaxySumsZ[id] = 0
      galaxyCounts[id] = 0
    }
    for (let i = 0; i < data.totalParticles; i++) {
      const gi = data.particleGalaxies[i]
      if (gi < 0) continue
      const id = data.galaxyIds[gi]
      if (!id) continue
      galaxySumsX[id] += data.positions[i * 3]
      galaxySumsY[id] += data.positions[i * 3 + 1]
      galaxySumsZ[id] += data.positions[i * 3 + 2]
      galaxyCounts[id] += 1
    }
    for (const id of data.galaxyIds) {
      const c = galaxyCounts[id] || 1
      this.galaxyPositions[id] = [
        galaxySumsX[id] / c,
        galaxySumsY[id] / c,
        galaxySumsZ[id] / c,
      ]
    }
  }

  getGalaxyCenter(id: string): [number, number, number] | null {
    return this.galaxyPositions[id] || null
  }

  reset() {
    for (const id of Array.from(this.galaxyRenderData.keys())) {
      this.removeGalaxyRender(id)
    }
    for (let i = this.placementAnims.length - 1; i >= 0; i--) {
      const p = this.placementAnims[i]
      this.scene.remove(p.mesh)
      p.mesh.geometry.dispose()
      ;(p.mesh.material as THREE.Material).dispose()
    }
    this.placementAnims = []
    this.historyHead = 0
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      this.history[i].fill(0)
      this.historyColors[i].fill(0)
      this.trailPosBuffer[i].fill(0)
      this.trailColBuffer[i].fill(0)
    }
    this.posBuffer.fill(0)
    this.colBuffer.fill(0)
    this.prevTotalParticles = 0
    if (this.particleGeometry) {
      this.particleGeometry.setDrawRange(0, 0)
    }
    for (const ts of this.trailSystems) {
      ts.geometry.setDrawRange(0, 0)
    }
  }

  destroy() {
    this.running = false
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId)
    this.reset()
    window.removeEventListener('resize', this.onResize)
    const dom = this.renderer.domElement
    dom.removeEventListener('pointermove', this.onPointerMove)
    dom.removeEventListener('pointerdown', this.onPointerDown)
    this.renderer.dispose()
    if (dom.parentElement === this.container) this.container.removeChild(dom)
  }
}
