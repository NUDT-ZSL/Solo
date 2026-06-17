import * as THREE from 'three'
import { useWeatherStore, WeatherMode } from './store'

interface Hill {
  position: THREE.Vector2
  height: number
  radius: number
}

export class SceneManager {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private terrain!: THREE.Mesh
  private terrainGeometry!: THREE.PlaneGeometry
  private terrainColorArr!: Float32Array
  private gridMesh!: THREE.LineSegments
  private gridColorArr!: Float32Array
  private gridVertexMap!: Int32Array
  private hills: Hill[] = []
  private terrainDeposition: Float32Array
  private snowTarget: Float32Array
  private snowDisplay: Float32Array
  private readonly MAX_P = 5000
  private pX: Float32Array
  private pY: Float32Array
  private pZ: Float32Array
  private pVX: Float32Array
  private pVY: Float32Array
  private pVZ: Float32Array
  private pActive: Uint8Array
  private freeList: number[]
  private activeCount = 0
  private particleMesh!: THREE.Points
  private particleGeo!: THREE.BufferGeometry
  private particleMat!: THREE.PointsMaterial
  private particlePosArr!: Float32Array
  private animId = 0
  private lastTime = 0
  private emitAccum = 0
  private fpsAccum = 0
  private fpsFrames = 0
  private rightDown = false
  private spherical = { radius: 25, theta: Math.PI / 4, phi: Math.PI / 3 }
  private camTarget = new THREE.Vector3(0, 0, 0)
  private unsub: (() => void) | null = null
  private weather: WeatherMode = 'sunny'
  private lastResetSig = 0
  private bgAnimId = 0
  private terrainDirty = true
  private gridSize = 20
  private divs = 40
  private readonly C_BOT = new THREE.Color(0x8bc34a)
  private readonly C_TOP = new THREE.Color(0x4caf50)
  private readonly C_RAIN = new THREE.Color(0x1565c0)
  private readonly C_SNOW = new THREE.Color(0xfafafa)
  private readonly C_GRID = new THREE.Color(0xc0c0c0)
  private _t1 = new THREE.Color()
  private _t2 = new THREE.Color()

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb)

    this.camera = new THREE.PerspectiveCamera(
      60, container.clientWidth / container.clientHeight, 0.1, 1000
    )
    this.updateCam()

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    const vc = (this.divs + 1) * (this.divs + 1)
    this.terrainDeposition = new Float32Array(vc)
    this.snowTarget = new Float32Array(vc)
    this.snowDisplay = new Float32Array(vc)

    this.pX = new Float32Array(this.MAX_P)
    this.pY = new Float32Array(this.MAX_P).fill(-100)
    this.pZ = new Float32Array(this.MAX_P)
    this.pVX = new Float32Array(this.MAX_P)
    this.pVY = new Float32Array(this.MAX_P)
    this.pVZ = new Float32Array(this.MAX_P)
    this.pActive = new Uint8Array(this.MAX_P)
    this.freeList = []
    for (let i = this.MAX_P - 1; i >= 0; i--) this.freeList.push(i)

    this.initTerrain()
    this.initHills()
    this.initGrid()
    this.initParticles()
    this.initLights()
    this.initEvents()
    this.subStore()

    this.lastTime = performance.now()
    this.animate()
  }

  private subStore() {
    this.unsub = useWeatherStore.subscribe(
      (s) => ({ weather: s.weather, resetSignal: s.resetSignal }),
      (s) => {
        if (s.weather !== this.weather) {
          this.weather = s.weather
          this.animateBg()
        }
      }
    )
    this.weather = useWeatherStore.getState().weather
  }

  private animateBg() {
    const map: Record<WeatherMode, number> = {
      sunny: 0x87ceeb, rainy: 0xb0bec5, snowy: 0xeceff1
    }
    const target = new THREE.Color(map[this.weather])
    const start = (this.scene.background as THREE.Color).clone()
    const t0 = performance.now()
    const dur = 1000
    const id = ++this.bgAnimId

    const step = () => {
      if (id !== this.bgAnimId) return
      const t = Math.min((performance.now() - t0) / dur, 1)
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      ;(this.scene.background as THREE.Color).copy(start).lerp(target, e)
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  private initTerrain() {
    this.terrainGeometry = new THREE.PlaneGeometry(
      this.gridSize, this.gridSize, this.divs, this.divs
    )
    this.terrainGeometry.rotateX(-Math.PI / 2)

    const cnt = this.terrainGeometry.attributes.position.count
    this.terrainColorArr = new Float32Array(cnt * 3)
    const c = new THREE.Color(0x4caf50)
    for (let i = 0; i < cnt; i++) {
      this.terrainColorArr[i * 3] = c.r
      this.terrainColorArr[i * 3 + 1] = c.g
      this.terrainColorArr[i * 3 + 2] = c.b
    }
    this.terrainGeometry.setAttribute(
      'color', new THREE.BufferAttribute(this.terrainColorArr, 3)
    )

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true, flatShading: true, roughness: 0.8, metalness: 0.1
    })
    this.terrain = new THREE.Mesh(this.terrainGeometry, mat)
    this.terrain.receiveShadow = true
    this.scene.add(this.terrain)
  }

  private initHills() {
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2
      const d = 2 + Math.random() * 7
      this.hills.push({
        position: new THREE.Vector2(Math.cos(a) * d, Math.sin(a) * d),
        height: 0.5 + Math.random() * 1.5,
        radius: 1 + Math.random() * 1.5
      })
    }

    const pos = this.terrainGeometry.attributes.position
    const col = this.terrainGeometry.attributes.color as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i)
      let y = 0
      for (const h of this.hills) {
        const dx = x - h.position.x, dz = z - h.position.y
        const dist = Math.sqrt(dx * dx + dz * dz)
        if (dist < h.radius) {
          const f = 1 - dist / h.radius
          y += h.height * f * f
        }
      }
      pos.setY(i, y)
      const hf = Math.min(y / 2, 1)
      this._t1.copy(this.C_BOT).lerp(this.C_TOP, hf)
      col.setXYZ(i, this._t1.r, this._t1.g, this._t1.b)
    }
    pos.needsUpdate = true
    col.needsUpdate = true
    this.terrainGeometry.computeVertexNormals()
  }

  private initGrid() {
    const d = this.divs
    const segX = (d + 1) * d
    const segZ = (d + 1) * d
    const totalVerts = (segX + segZ) * 2

    const positions = new Float32Array(totalVerts * 3)
    const colors = new Float32Array(totalVerts * 3)
    this.gridVertexMap = new Int32Array(totalVerts)

    let vi = 0
    let gi = 0
    const half = this.gridSize / 2

    for (let iz = 0; iz <= d; iz++) {
      const z = (iz / d - 0.5) * this.gridSize
      for (let ix = 0; ix < d; ix++) {
        const x0 = (ix / d - 0.5) * this.gridSize
        const x1 = ((ix + 1) / d - 0.5) * this.gridSize
        const y0 = this.getTerrainHeight(x0, z) + 0.02
        const y1 = this.getTerrainHeight(x1, z) + 0.02

        positions[vi * 3] = x0; positions[vi * 3 + 1] = y0; positions[vi * 3 + 2] = z
        this.gridVertexMap[gi++] = iz * (d + 1) + ix
        vi++

        positions[vi * 3] = x1; positions[vi * 3 + 1] = y1; positions[vi * 3 + 2] = z
        this.gridVertexMap[gi++] = iz * (d + 1) + ix + 1
        vi++
      }
    }

    for (let ix = 0; ix <= d; ix++) {
      const x = (ix / d - 0.5) * this.gridSize
      for (let iz = 0; iz < d; iz++) {
        const z0 = (iz / d - 0.5) * this.gridSize
        const z1 = ((iz + 1) / d - 0.5) * this.gridSize
        const y0 = this.getTerrainHeight(x, z0) + 0.02
        const y1 = this.getTerrainHeight(x, z1) + 0.02

        positions[vi * 3] = x; positions[vi * 3 + 1] = y0; positions[vi * 3 + 2] = z0
        this.gridVertexMap[gi++] = iz * (d + 1) + ix
        vi++

        positions[vi * 3] = x; positions[vi * 3 + 1] = y1; positions[vi * 3 + 2] = z1
        this.gridVertexMap[gi++] = (iz + 1) * (d + 1) + ix
        vi++
      }
    }

    const gc = this.C_GRID
    for (let i = 0; i < totalVerts; i++) {
      colors[i * 3] = gc.r; colors[i * 3 + 1] = gc.g; colors[i * 3 + 2] = gc.b
    }

    this.gridColorArr = colors
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.6
    })
    this.gridMesh = new THREE.LineSegments(geo, mat)
    this.scene.add(this.gridMesh)
  }

  private initParticles() {
    this.particlePosArr = new Float32Array(this.MAX_P * 3)
    this.particleGeo = new THREE.BufferGeometry()
    this.particleGeo.setAttribute(
      'position', new THREE.BufferAttribute(this.particlePosArr, 3)
    )
    this.particleGeo.setDrawRange(0, 0)

    this.particleMat = new THREE.PointsMaterial({
      color: 0x4fc3f7, size: 0.15, transparent: true, opacity: 0.7,
      sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending
    })
    this.particleMesh = new THREE.Points(this.particleGeo, this.particleMat)
    this.scene.add(this.particleMesh)
  }

  private initLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dl = new THREE.DirectionalLight(0xffffff, 0.8)
    dl.position.set(10, 20, 10)
    dl.castShadow = true
    dl.shadow.mapSize.set(2048, 2048)
    dl.shadow.camera.left = -15; dl.shadow.camera.right = 15
    dl.shadow.camera.top = 15; dl.shadow.camera.bottom = -15
    this.scene.add(dl)
  }

  private initEvents() {
    const cv = this.renderer.domElement
    cv.addEventListener('contextmenu', (e) => e.preventDefault())
    cv.addEventListener('mousedown', (e) => { if (e.button === 2) this.rightDown = true })
    cv.addEventListener('mouseup', (e) => { if (e.button === 2) this.rightDown = false })
    cv.addEventListener('mouseleave', () => { this.rightDown = false })
    cv.addEventListener('mousemove', (e) => {
      if (!this.rightDown) return
      this.spherical.theta -= e.movementX * 0.005
      this.spherical.phi = Math.max(
        0.1, Math.min(Math.PI / 2 - 0.05, this.spherical.phi - e.movementY * 0.005)
      )
      this.updateCam()
    })
    cv.addEventListener('wheel', (e) => {
      e.preventDefault()
      this.spherical.radius = Math.max(8, Math.min(60, this.spherical.radius + e.deltaY * 0.02))
      this.updateCam()
    })
    window.addEventListener('resize', this.onResize)
  }

  private onResize = () => {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
  }

  private updateCam() {
    const { radius, theta, phi } = this.spherical
    this.camera.position.set(
      this.camTarget.x + radius * Math.sin(phi) * Math.cos(theta),
      this.camTarget.y + radius * Math.cos(phi),
      this.camTarget.z + radius * Math.sin(phi) * Math.sin(theta)
    )
    this.camera.lookAt(this.camTarget)
  }

  private getTerrainHeight(x: number, z: number): number {
    let y = 0
    for (const h of this.hills) {
      const dx = x - h.position.x, dz = z - h.position.y
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < h.radius) {
        const f = 1 - dist / h.radius
        y += h.height * f * f
      }
    }
    return y
  }

  private emitParticles(dt: number) {
    if (this.weather === 'sunny') return
    const rate = this.weather === 'rainy' ? 200 : 150
    this.emitAccum += rate * dt

    if (this.weather === 'rainy') {
      this.particleMat.color.setHex(0x4fc3f7)
      this.particleMat.opacity = 0.7
      this.particleMat.size = 0.15
    } else {
      this.particleMat.color.setHex(0xffffff)
      this.particleMat.opacity = 0.9
      this.particleMat.size = 0.2
    }

    while (this.emitAccum >= 1 && this.freeList.length > 0) {
      this.emitAccum -= 1
      const idx = this.freeList.pop()!
      this.pX[idx] = (Math.random() - 0.5) * this.gridSize
      this.pY[idx] = 15
      this.pZ[idx] = (Math.random() - 0.5) * this.gridSize
      const spd = this.weather === 'rainy' ? 8 : 4
      this.pVX[idx] = (Math.random() - 0.5) * 0.5
      this.pVY[idx] = -spd
      this.pVZ[idx] = (Math.random() - 0.5) * 0.5
      this.pActive[idx] = 1
    }
  }

  private updateParticles(dt: number) {
    let alive = 0
    const arr = this.particlePosArr
    arr.fill(0)

    for (let i = 0; i < this.MAX_P; i++) {
      if (!this.pActive[i]) continue

      this.pX[i] += this.pVX[i] * dt
      this.pY[i] += this.pVY[i] * dt
      this.pZ[i] += this.pVZ[i] * dt

      const th = this.getTerrainHeight(this.pX[i], this.pZ[i])
      if (this.pY[i] <= th) {
        this.deposit(this.pX[i], this.pZ[i])
        this.pActive[i] = 0
        this.pY[i] = -100
        this.freeList.push(i)
      } else {
        const off = alive * 3
        arr[off] = this.pX[i]
        arr[off + 1] = this.pY[i]
        arr[off + 2] = this.pZ[i]
        alive++
      }
    }

    this.particleGeo.setDrawRange(0, alive)
    ;(this.particleGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true
    this.activeCount = alive
    useWeatherStore.getState().setParticleCount(alive)
  }

  private deposit(x: number, z: number) {
    const half = this.gridSize / 2
    const gx = Math.floor(((x + half) / this.gridSize) * this.divs)
    const gz = Math.floor(((z + half) / this.gridSize) * this.divs)
    if (gx < 0 || gx > this.divs || gz < 0 || gz > this.divs) return

    if (this.weather === 'rainy') {
      let lowH = this.getTerrainHeight(x, z)
      let lowI = gz * (this.divs + 1) + gx
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = gx + dx, nz = gz + dz
          if (nx >= 0 && nx <= this.divs && nz >= 0 && nz <= this.divs) {
            const wx = (nx / this.divs) * this.gridSize - half
            const wz = (nz / this.divs) * this.gridSize - half
            const h = this.getTerrainHeight(wx, wz)
            if (h < lowH) { lowH = h; lowI = nz * (this.divs + 1) + nx }
          }
        }
      }
      this.terrainDeposition[lowI] = Math.min(this.terrainDeposition[lowI] + 0.02, 0.3)
    } else if (this.weather === 'snowy') {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = gx + dx, nz = gz + dz
          if (nx >= 0 && nx <= this.divs && nz >= 0 && nz <= this.divs) {
            const dist = Math.sqrt(dx * dx + dz * dz)
            if (dist <= 2) {
              const ni = nz * (this.divs + 1) + nx
              const w = 1 - dist / 2.5
              this.snowTarget[ni] = Math.min(this.snowTarget[ni] + w * 0.015, 1)
            }
          }
        }
      }
    }
    this.terrainDirty = true
  }

  private updateSnowDisplay(dt: number) {
    const speed = 1 / 0.3
    let changed = false
    for (let i = 0; i < this.snowDisplay.length; i++) {
      if (this.snowDisplay[i] < this.snowTarget[i]) {
        this.snowDisplay[i] = Math.min(
          this.snowDisplay[i] + (this.snowTarget[i] - this.snowDisplay[i]) * speed * dt,
          this.snowTarget[i]
        )
        changed = true
      }
    }
    if (changed) this.terrainDirty = true
  }

  private updateColors() {
    if (!this.terrainDirty) return
    this.terrainDirty = false

    const tPos = this.terrainGeometry.attributes.position
    const tCol = this.terrainColorArr
    let covered = 0
    const total = tPos.count

    for (let i = 0; i < total; i++) {
      const y = tPos.getY(i)
      const hf = Math.min(y / 2, 1)
      this._t1.copy(this.C_BOT).lerp(this.C_TOP, hf)

      const dep = this.terrainDeposition[i]
      if (dep > 0) {
        const t = Math.min(dep / 0.3, 1)
        this._t1.lerp(this.C_RAIN, t * 0.85)
      }

      const snow = this.snowDisplay[i]
      if (snow > 0.001) {
        const e = snow < 0.5 ? 2 * snow * snow : 1 - Math.pow(-2 * snow + 2, 2) / 2
        this._t1.lerp(this.C_SNOW, e)
      }

      if (dep > 0.01 || snow > 0.01) covered++
      tCol[i * 3] = this._t1.r
      tCol[i * 3 + 1] = this._t1.g
      tCol[i * 3 + 2] = this._t1.b
    }

    ;(this.terrainGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true

    const gCol = this.gridColorArr
    const gMap = this.gridVertexMap
    for (let i = 0; i < gMap.length; i++) {
      const ti = gMap[i]
      const dep = this.terrainDeposition[ti]
      const snow = this.snowDisplay[ti]

      if (dep > 0 || snow > 0.001) {
        this._t2.copy(this.C_TOP)
        if (dep > 0) {
          this._t2.lerp(this.C_RAIN, Math.min(dep / 0.3, 1))
        }
        if (snow > 0.001) {
          const e = snow < 0.5 ? 2 * snow * snow : 1 - Math.pow(-2 * snow + 2, 2) / 2
          this._t2.lerp(this.C_SNOW, e)
        }
        gCol[i * 3] = this._t2.r
        gCol[i * 3 + 1] = this._t2.g
        gCol[i * 3 + 2] = this._t2.b
      } else {
        gCol[i * 3] = this.C_GRID.r
        gCol[i * 3 + 1] = this.C_GRID.g
        gCol[i * 3 + 2] = this.C_GRID.b
      }
    }
    ;(this.gridMesh.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true

    useWeatherStore.getState().setCoverageRatio(covered / total)
  }

  private resetScene() {
    for (let i = 0; i < this.MAX_P; i++) {
      this.pActive[i] = 0
      this.pY[i] = -100
    }
    this.freeList = []
    for (let i = this.MAX_P - 1; i >= 0; i--) this.freeList.push(i)
    this.activeCount = 0
    this.terrainDeposition.fill(0)
    this.snowTarget.fill(0)
    this.snowDisplay.fill(0)
    this.emitAccum = 0
    this.terrainDirty = true

    const pos = this.terrainGeometry.attributes.position
    const col = this.terrainColorArr
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      const hf = Math.min(y / 2, 1)
      this._t1.copy(this.C_BOT).lerp(this.C_TOP, hf)
      col[i * 3] = this._t1.r
      col[i * 3 + 1] = this._t1.g
      col[i * 3 + 2] = this._t1.b
    }
    ;(this.terrainGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true

    const gCol = this.gridColorArr
    for (let i = 0; i < gCol.length / 3; i++) {
      gCol[i * 3] = this.C_GRID.r
      gCol[i * 3 + 1] = this.C_GRID.g
      gCol[i * 3 + 2] = this.C_GRID.b
    }
    ;(this.gridMesh.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true

    useWeatherStore.getState().setParticleCount(0)
    useWeatherStore.getState().setCoverageRatio(0)
  }

  private animate = () => {
    this.animId = requestAnimationFrame(this.animate)

    const now = performance.now()
    const dt = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now

    this.fpsAccum += dt
    this.fpsFrames++
    if (this.fpsAccum >= 0.5) {
      useWeatherStore.getState().setFps(Math.round(this.fpsFrames / this.fpsAccum))
      this.fpsAccum = 0
      this.fpsFrames = 0
    }

    const st = useWeatherStore.getState()
    if (st.resetSignal !== this.lastResetSig) {
      this.lastResetSig = st.resetSignal
      this.resetScene()
    }

    this.emitParticles(dt)
    this.updateParticles(dt)
    this.updateSnowDisplay(dt)
    this.updateColors()

    this.renderer.render(this.scene, this.camera)
  }

  public dispose() {
    cancelAnimationFrame(this.animId)
    window.removeEventListener('resize', this.onResize)
    this.unsub?.()
    this.renderer.dispose()
    this.terrainGeometry.dispose()
    ;(this.terrain.material as THREE.Material).dispose()
    this.particleGeo.dispose()
    this.particleMat.dispose()
    this.gridMesh.geometry.dispose()
    ;(this.gridMesh.material as THREE.Material).dispose()
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
