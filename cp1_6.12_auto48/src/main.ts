import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { PlantGenerator, PlantPartInfo } from './PlantGenerator'
import { UIHandler, UIParams } from './UIHandler'

class App {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private clock: THREE.Clock
  private plantGenerator: PlantGenerator
  private uiHandler: UIHandler
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private frameCount: number = 0
  private fpsUpdateTime: number = 0

  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    this.camera.position.set(2.2, 1.6, 2.8)
    this.camera.lookAt(0, 0.8, 0)

    const container = document.getElementById('canvas-container')
    if (!container) throw new Error('Canvas container not found')

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.15
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 1.5
    this.controls.maxDistance = 8
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05
    this.controls.target.set(0, 0.8, 0)
    this.controls.update()

    this.clock = new THREE.Clock()
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.setupBackgroundAndLighting()
    this.setupGround()

    this.plantGenerator = new PlantGenerator()
    this.scene.add(this.plantGenerator.group)

    this.uiHandler = new UIHandler({
      onParamChange: (params) => this.handleParamChange(params),
      onReplay: () => this.plantGenerator.replayAnimation()
    })

    this.setupEventListeners(container)
    this.animate()

    // Log vertex count for verification
    console.log(`Plant vertex count: ${this.plantGenerator.getVertexCount()}`)
  }

  private setupBackgroundAndLighting(): void {
    const bgCanvas = document.createElement('canvas')
    bgCanvas.width = 512
    bgCanvas.height = 512
    const bgCtx = bgCanvas.getContext('2d')!
    const gradient = bgCtx.createRadialGradient(
      256, 450, 50,
      256, 256, 450
    )
    gradient.addColorStop(0, '#4a7c59')
    gradient.addColorStop(0.3, '#2d5a3d')
    gradient.addColorStop(0.6, '#1a3a5c')
    gradient.addColorStop(1, '#0a1a2e')
    bgCtx.fillStyle = gradient
    bgCtx.fillRect(0, 0, 512, 512)

    const bgTexture = new THREE.CanvasTexture(bgCanvas)
    this.scene.background = bgTexture

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.1)
    directionalLight.position.set(3, 5, 2.5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.set(1024, 1024)
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 15
    directionalLight.shadow.camera.left = -3
    directionalLight.shadow.camera.right = 3
    directionalLight.shadow.camera.top = 3
    directionalLight.shadow.camera.bottom = -3
    this.scene.add(directionalLight)

    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.35)
    fillLight.position.set(-2, 3, -2)
    this.scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xfff0cc, 0.25)
    rimLight.position.set(0, 4, -3)
    this.scene.add(rimLight)
  }

  private setupGround(): void {
    const groundGeo = new THREE.CircleGeometry(6, 48)
    const groundCanvas = document.createElement('canvas')
    groundCanvas.width = 512
    groundCanvas.height = 512
    const gCtx = groundCanvas.getContext('2d')!

    const grassGrad = gCtx.createRadialGradient(256, 256, 30, 256, 256, 300)
    grassGrad.addColorStop(0, '#3d6b4f')
    grassGrad.addColorStop(0.5, '#2d5a3d')
    grassGrad.addColorStop(1, '#1a3a2e')
    gCtx.fillStyle = grassGrad
    gCtx.fillRect(0, 0, 512, 512)

    gCtx.strokeStyle = 'rgba(200, 200, 200, 0.12)'
    gCtx.lineWidth = 1
    const cellSize = 32
    for (let x = 0; x <= 512; x += cellSize) {
      gCtx.beginPath()
      gCtx.moveTo(x, 0)
      gCtx.lineTo(x, 512)
      gCtx.stroke()
    }
    for (let y = 0; y <= 512; y += cellSize) {
      gCtx.beginPath()
      gCtx.moveTo(0, y)
      gCtx.lineTo(512, y)
      gCtx.stroke()
    }

    const groundTex = new THREE.CanvasTexture(groundCanvas)
    groundTex.wrapS = THREE.RepeatWrapping
    groundTex.wrapT = THREE.RepeatWrapping

    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.95,
      metalness: 0.0
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    const gridHelper = new THREE.GridHelper(8, 24, 0x445544, 0x334433)
    ;(gridHelper.material as THREE.Material).transparent = true
    ;(gridHelper.material as THREE.Material).opacity = 0.18
    gridHelper.position.y = 0.002
    this.scene.add(gridHelper)
  }

  private handleParamChange(params: Partial<UIParams>): void {
    if (params.growthSpeed !== undefined) {
      this.plantGenerator.setGrowthSpeed(params.growthSpeed)
    }
    if (params.branchDensity !== undefined) {
      this.plantGenerator.setBranchDensity(params.branchDensity)
    }
    if (params.bloomSize !== undefined) {
      this.plantGenerator.setBloomSize(params.bloomSize)
    }
  }

  private setupEventListeners(container: HTMLElement): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })

    container.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return
      const rect = container.getBoundingClientRect()
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      setTimeout(() => this.handleClick(), 0)
    })
  }

  private handleClick(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const meshes = this.plantGenerator.getAllMeshes()
    if (meshes.length === 0) return

    const intersects = this.raycaster.intersectObjects(meshes, false)
    if (intersects.length === 0) return

    const hit = intersects[0]
    let info: PlantPartInfo | null = null
    let obj: THREE.Object3D | null = hit.object

    while (obj) {
      const candidate = this.plantGenerator.getPartInfoFromObject(obj)
      if (candidate) {
        info = candidate
        break
      }
      obj = obj.parent
    }

    if (info) {
      this.uiHandler.showPartInfo(info)
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate())

    const delta = this.clock.getDelta()
    const clampedDelta = Math.min(delta, 0.05)

    this.plantGenerator.update(clampedDelta)
    this.controls.update()
    this.renderer.render(this.scene, this.camera)

    this.frameCount++
    this.fpsUpdateTime += clampedDelta
    if (this.fpsUpdateTime >= 1.0) {
      const fps = this.frameCount / this.fpsUpdateTime
      this.renderer.domElement.style.setProperty('--fps', `${fps.toFixed(0)}`)
      if (fps < 45) {
        console.warn(`Low FPS: ${fps.toFixed(1)}`)
      }
      this.frameCount = 0
      this.fpsUpdateTime = 0
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new App()
  } catch (err) {
    console.error('Failed to initialize app:', err)
  }
})
