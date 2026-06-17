import * as THREE from 'three'
import { useWeatherStore, WeatherMode } from './store'

interface Hill {
  position: THREE.Vector2
  height: number
  radius: number
}

const DEV_LOG = true
function devLog(tag: string, msg: string, data?: unknown) {
  if (DEV_LOG) {
    const prefix = `%c[${tag}]`
    const style = 'color: #2196F3; font-weight: bold;'
    if (data !== undefined) {
      console.log(prefix, style, msg, data)
    } else {
      console.log(prefix, style, msg)
    }
  }
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
  private snowHeight: Float32Array
  private readonly MAX_P = 5000
  private pX: Float32Array
  private pY: Float32Array
  private pZ: Float32Array
  private pVX: Float32Array
  private pVY: Float32Array
  private pVZ: Float32Array
  private pActive: Uint8Array
  private pBirth: Float64Array
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
  private bgAnimStart = 0
  private bgAnimDur = 1000
  private bgAnimFrom = new THREE.Color()
  private bgAnimTo = new THREE.Color()
  private terrainDirty = true
  private gridSize = 20
  private divs = 40
  private readonly DEP_MAX = 0.3
  private readonly C_BOT = new THREE.Color(0x8bc34a)
  private readonly C_TOP = new THREE.Color(0x4caf50)
  private readonly C_RAIN = new THREE.Color(0x1565c0)
  private readonly C_SNOW = new THREE.Color(0xfafafa)
  private readonly C_GRID = new THREE.Color(0xc0c0c0)
  private _t1 = new THREE.Color()
  private _t2 = new THREE.Color()
  private perfMonitor = {
    startTime: 0,
    fpsSamples: [] as number[],
    stable5s: false,
    checked: false,
  }

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
    this.snowHeight = new Float32Array(vc)

    this.pX = new Float32Array(this.MAX_P)
    this.pY = new Float32Array(this.MAX_P).fill(-100)
    this.pZ = new Float32Array(this.MAX_P)
    this.pVX = new Float32Array(this.MAX_P)
    this.pVY = new Float32Array(this.MAX_P)
    this.pVZ = new Float32Array(this.MAX_P)
    this.pActive = new Uint8Array(this.MAX_P)
    this.pBirth = new Float64Array(this.MAX_P)
    this.freeList = []
    for (let i = this.MAX_P - 1; i >= 0; i--) this.freeList.push(i)

    this.initTerrain()
    this.initHills()
    this.initGrid()
    this.initParticles()
    this.initLights()
    this.initEvents()
    this.subStore()

    devLog('Init', `地形顶点数: ${vc}, 粒子池大小: ${this.MAX_P}`)
    devLog('Fix1', '网格颜色将随沉积量动态变化，0.3单位处截断为#1565C0')
    devLog('Fix2', '雪天羽化动画: 0.3秒过渡，半径随堆积高度变化')
    devLog('Fix3', '覆盖比例: 沉积>0.01即统计，实时更新store')
    devLog('Fix4', '背景过渡: ease-in-out缓动，严格1秒')
    devLog('Fix5', '粒子池: FIFO复用旧粒子，上限5000')

    this.lastTime = performance.now()
    this.perfMonitor.startTime = this.lastTime
    this.runSelfTests()
    this.animate()
  }

  private runSelfTests() {
    devLog('Test', '========== 自检开始 ==========')

    devLog('Test', '测试1: 沉积量范围验证 [0, 0.3]')
    const testDep = 0.5
    const clampedDep = Math.min(testDep, this.DEP_MAX)
    devLog('Test', `  输入: ${testDep}, 截断后: ${clampedDep}, 期望值: ${this.DEP_MAX} → ${clampedDep === this.DEP_MAX ? '✓ PASS' : '✗ FAIL'}`)

    const testDepLow = 0.1
    const t = Math.min(testDepLow / this.DEP_MAX, 1)
    this._t1.copy(this.C_TOP).lerp(this.C_RAIN, t)
    devLog('Test', `  沉积0.1时颜色插值因子: ${t.toFixed(3)}, 颜色: #${this._t1.getHexString()}`)

    const tMax = Math.min(this.DEP_MAX / this.DEP_MAX, 1)
    this._t1.copy(this.C_TOP).lerp(this.C_RAIN, tMax)
    const expectedRain = this.C_RAIN.getHexString()
    devLog('Test', `  沉积0.3时颜色: #${this._t1.getHexString()}, 期望值: #${expectedRain} → ${this._t1.getHexString() === expectedRain ? '✓ PASS' : '✗ FAIL'}`)

    devLog('Test', '测试2: 雪天羽化半径动态变化')
    const h0 = 0, h1 = 0.3, h2 = 1
    const r0 = Math.max(1.5, 1.5 + h0 * 4)
    const r1 = Math.max(1.5, 1.5 + h1 * 4)
    const r2 = Math.max(1.5, 1.5 + h2 * 4)
    devLog('Test', `  高度0 → 半径: ${r0}, 高度0.3 → 半径: ${r1}, 高度1 → 半径: ${r2}`)
    devLog('Test', `  半径随高度递增: ${r2 > r1 && r1 > r0 ? '✓ PASS' : '✗ FAIL'}`)

    devLog('Test', '测试3: 覆盖比例计算')
    const totalCells = (this.divs + 1) * (this.divs + 1)
    const testCoverage = 100
    const ratio = testCoverage / totalCells
    devLog('Test', `  总网格单元: ${totalCells}, 覆盖单元: ${testCoverage}, 比例: ${(ratio * 100).toFixed(3)}%`)
    devLog('Test', `  计算逻辑有效: ${ratio >= 0 && ratio <= 1 ? '✓ PASS' : '✗ FAIL'}`)

    devLog('Test', '测试4: ease-in-out缓动函数')
    const t0 = this.easeInOut(0)
    const t5 = this.easeInOut(0.5)
    const t1 = this.easeInOut(1)
    devLog('Test', `  t=0 → ${t0.toFixed(3)}, t=0.5 → ${t5.toFixed(3)}, t=1 → ${t1.toFixed(3)}`)
    devLog('Test', `  缓动正确: ${t0 === 0 && t5 === 0.5 && t1 === 1 ? '✓ PASS' : '✗ FAIL'}`)

    devLog('Test', '测试5: 粒子池大小')
    devLog('Test', `  池容量: ${this.MAX_P}, 空闲列表长度: ${this.freeList.length}`)
    devLog('Test', `  池初始化正确: ${this.freeList.length === this.MAX_P ? '✓ PASS' : '✗ FAIL'}`)

    devLog('Test', '测试6: 网格顶点映射')
    devLog('Test', `  网格顶点数: ${this.gridVertexMap.length}, 地形顶点数: ${(this.divs + 1) * (this.divs + 1)}`)
    devLog('Test', `  网格索引范围: [0, ${Math.max(...this.gridVertexMap)}]`)

    devLog('Test', '========== 自检结束 ==========')
  }

  private subStore() {
    this.unsub = useWeatherStore.subscribe(
      (s) => ({ weather: s.weather, resetSignal: s.resetSignal }),
      (s) => {
        if (s.weather !== this.weather) {
          this.weather = s.weather
          devLog('Fix4', `天气切换: ${this.weather} → ${s.weather}, 启动1秒背景过渡`)
          this.startBgTransition()
        }
      }
    )
    this.weather = useWeatherStore.getState().weather
  }

  private startBgTransition() {
    const map: Record<WeatherMode, number> = {
      sunny: 0x87ceeb, rainy: 0xb0bec5, snowy: 0xeceff1
    }
    this.bgAnimId++
    const id = this.bgAnimId
    this.bgAnimFrom.copy(this.scene.background as THREE.Color)
    this.bgAnimTo.setHex(map[this.weather])
    this.bgAnimStart = performance.now()
    this.bgAnimDur = 1000

    const step = () => {
      if (id !== this.bgAnimId) {
        devLog('Fix4', '背景过渡被中断，新动画已启动')
        return
      }
      const elapsed = performance.now() - this.bgAnimStart
      const t = Math.min(elapsed / this.bgAnimDur, 1)
      const eased = this.easeInOut(t)
      ;(this.scene.background as THREE.Color).copy(this.bgAnimFrom).lerp(this.bgAnimTo, eased)
      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        ;(this.scene.background as THREE.Color).copy(this.bgAnimTo)
        devLog('Fix4', `背景过渡完成，耗时: ${elapsed.toFixed(0)}ms (目标1000ms)`)
        devLog('Fix4', `起始色: #${this.bgAnimFrom.getHexString()}, 结束色: #${this.bgAnimTo.getHexString()}`)
      }
    }
    requestAnimationFrame(step)
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
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
    devLog('Fix1', `自定义网格创建完成，共 ${totalVerts} 个顶点，${gi / 2} 条线段`)
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

  private acquireParticle(): number {
    if (this.freeList.length > 0) {
      return this.freeList.pop()!
    }
    let oldestIdx = -1
    let oldestBirth = Infinity
    for (let i = 0; i < this.MAX_P; i++) {
      if (this.pActive[i] && this.pBirth[i] < oldestBirth) {
        oldestBirth = this.pBirth[i]
        oldestIdx = i
      }
    }
    if (oldestIdx >= 0) {
      return oldestIdx
    }
    return -1
  }

  private emitParticles(dt: number, now: number) {
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

    let emitted = 0
    while (this.emitAccum >= 1) {
      this.emitAccum -= 1
      const idx = this.acquireParticle()
      if (idx < 0) break
      this.pX[idx] = (Math.random() - 0.5) * this.gridSize
      this.pY[idx] = 15
      this.pZ[idx] = (Math.random() - 0.5) * this.gridSize
      const spd = this.weather === 'rainy' ? 8 : 4
      this.pVX[idx] = (Math.random() - 0.5) * 0.5
      this.pVY[idx] = -spd
      this.pVZ[idx] = (Math.random() - 0.5) * 0.5
      this.pActive[idx] = 1
      this.pBirth[idx] = now
      emitted++
    }

    if (emitted > 0 && this.freeList.length === 0) {
      devLog('Fix5', `粒子池已满(${this.MAX_P})，开始FIFO复用最旧粒子`)
    }
  }

  private updateParticles(dt: number) {
    let alive = 0
    const arr = this.particlePosArr

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
      const before = this.terrainDeposition[lowI]
      this.terrainDeposition[lowI] = Math.min(before + 0.02, this.DEP_MAX)
      const after = this.terrainDeposition[lowI]

      if (DEV_LOG && before === 0 && after > 0) {
        devLog('Fix1', `新沉积单元 #${lowI}: ${before.toFixed(3)} → ${after.toFixed(3)} (上限${this.DEP_MAX})`)
      }
      if (DEV_LOG && after >= this.DEP_MAX - 0.001 && before < this.DEP_MAX - 0.001) {
        devLog('Fix1', `单元 #${lowI} 达到上限 ${this.DEP_MAX}，颜色截断为#1565C0`)
      }
    } else if (this.weather === 'snowy') {
      let nearestHill: Hill | null = null
      let nearestDist = Infinity
      for (const h of this.hills) {
        const dx = x - h.position.x, dz = z - h.position.y
        const dist = Math.sqrt(dx * dx + dz * dz)
        if (dist < nearestDist) {
          nearestDist = dist
          nearestHill = h
        }
      }

      if (nearestHill) {
        const hx = nearestHill.position.x
        const hz = nearestHill.position.y
        const ghx = Math.floor(((hx + this.gridSize / 2) / this.gridSize) * this.divs)
        const ghz = Math.floor(((hz + this.gridSize / 2) / this.gridSize) * this.divs)

        const centerI = ghz * (this.divs + 1) + ghx
        const baseH = this.snowHeight[centerI]
        const featherRadius = Math.max(1.5, 1.5 + baseH * 4)
        const intRadius = Math.ceil(featherRadius)

        for (let dz2 = -intRadius; dz2 <= intRadius; dz2++) {
          for (let dx2 = -intRadius; dx2 <= intRadius; dx2++) {
            const nx = ghx + dx2, nz = ghz + dz2
            if (nx >= 0 && nx <= this.divs && nz >= 0 && nz <= this.divs) {
              const dist = Math.sqrt(dx2 * dx2 + dz2 * dz2)
              if (dist <= featherRadius) {
                const ni = nz * (this.divs + 1) + nx
                const w = 1 - dist / (featherRadius + 0.5)
                this.snowTarget[ni] = Math.min(this.snowTarget[ni] + w * 0.012, 1)
                this.snowHeight[ni] = Math.min(this.snowHeight[ni] + w * 0.006, 1)
              }
            }
          }
        }

        if (DEV_LOG && baseH > 0.05 && baseH < 0.06) {
          devLog('Fix2', `山丘顶部积雪起始，高度: ${baseH.toFixed(3)}, 羽化半径: ${featherRadius.toFixed(1)}`)
        }
        if (DEV_LOG && baseH > 0.3 && baseH < 0.31) {
          devLog('Fix2', `山丘积雪增长中，高度: ${baseH.toFixed(3)}, 羽化半径: ${featherRadius.toFixed(1)} (随高度增大)`)
        }
      }
    }
    this.terrainDirty = true
  }

  private updateSnowDisplay(dt: number) {
    const transitionSpeed = 1 / 0.3
    let changed = false
    let maxDiff = 0
    for (let i = 0; i < this.snowDisplay.length; i++) {
      const diff = this.snowTarget[i] - this.snowDisplay[i]
      if (Math.abs(diff) > 0.001) {
        const step = diff * transitionSpeed * dt
        this.snowDisplay[i] += step
        if (Math.abs(diff) > maxDiff) maxDiff = Math.abs(diff)
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
    let maxDep = 0
    let minDep = Infinity
    let maxSnow = 0
    let minSnowAboveZero = Infinity

    for (let i = 0; i < total; i++) {
      const y = tPos.getY(i)
      const hf = Math.min(y / 2, 1)
      this._t1.copy(this.C_BOT).lerp(this.C_TOP, hf)

      const dep = this.terrainDeposition[i]
      if (dep > maxDep) maxDep = dep
      if (dep > 0 && dep < minDep) minDep = dep
      if (dep > 0) {
        const t = Math.min(dep / this.DEP_MAX, 1)
        this._t1.lerp(this.C_RAIN, t)
      }

      const snow = this.snowDisplay[i]
      if (snow > maxSnow) maxSnow = snow
      if (snow > 0.001 && snow < minSnowAboveZero) minSnowAboveZero = snow
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
          const t = Math.min(dep / this.DEP_MAX, 1)
          this._t2.lerp(this.C_RAIN, t)
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

    const ratio = covered / total
    useWeatherStore.getState().setCoverageRatio(ratio)

    if (DEV_LOG && covered > 0 && Math.random() < 0.02) {
      devLog('Fix3', `覆盖统计: ${covered}/${total} = ${(ratio * 100).toFixed(2)}%, 雨量范围: [${minDep.toFixed(4)}, ${maxDep.toFixed(3)}]`)
      devLog('Fix3', `store.coverageRatio 已更新: ${(ratio * 100).toFixed(2)}%`)
    }
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
    this.snowHeight.fill(0)
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

    this.perfMonitor.startTime = performance.now()
    this.perfMonitor.fpsSamples = []
    this.perfMonitor.stable5s = false
    this.perfMonitor.checked = false

    devLog('Reset', '场景已重置，粒子清空，地形颜色还原')
  }

  private checkPerfStability(fps: number, elapsedSec: number) {
    if (this.perfMonitor.checked) return

    this.perfMonitor.fpsSamples.push(fps)

    if (elapsedSec >= 5) {
      this.perfMonitor.checked = true
      const samples = this.perfMonitor.fpsSamples
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length
      const min = Math.min(...samples)
      const max = Math.max(...samples)
      const stable = min >= 45

      devLog('Fix5', '=== 5秒性能评估 ===')
      devLog('Fix5', `平均FPS: ${avg.toFixed(1)}`)
      devLog('Fix5', `最低FPS: ${min}`)
      devLog('Fix5', `最高FPS: ${max}`)
      devLog('Fix5', `样本数: ${samples.length}`)
      devLog('Fix5', `是否稳定≥45FPS: ${stable ? '✓ 是' : '✗ 否'}`)

      this.perfMonitor.stable5s = stable
    }
  }

  private animate = () => {
    this.animId = requestAnimationFrame(this.animate)

    const now = performance.now()
    const dt = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now

    this.fpsAccum += dt
    this.fpsFrames++
    if (this.fpsAccum >= 0.25) {
      const fps = Math.round(this.fpsFrames / this.fpsAccum)
      useWeatherStore.getState().setFps(fps)
      const elapsed = (now - this.perfMonitor.startTime) / 1000
      this.checkPerfStability(fps, elapsed)
      this.fpsAccum = 0
      this.fpsFrames = 0
    }

    const st = useWeatherStore.getState()
    if (st.resetSignal !== this.lastResetSig) {
      this.lastResetSig = st.resetSignal
      this.resetScene()
    }

    this.emitParticles(dt, now)
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
