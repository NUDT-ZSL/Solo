import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { LavaNetwork } from './LavaNetwork'
import { ParticleSystem } from './ParticleSystem'
import { useLavaStore, LavaBranchInfo } from './store'

export class LavaEngine {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private composer: EffectComposer
  private bloomPass: UnrealBloomPass
  private lavaNetwork: LavaNetwork
  private particleSystem: ParticleSystem
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private clock: THREE.Clock
  private animationId: number = 0
  private container: HTMLElement
  private onBranchClick: ((info: LavaBranchInfo) => void) | null = null
  private unsubscribe: (() => void) | null = null
  private glowLight: THREE.PointLight

  constructor(container: HTMLElement) {
    this.container = container
    const width = container.clientWidth
    const height = container.clientHeight

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.8
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0505)
    this.scene.fog = new THREE.FogExp2(0x0a0505, 0.035)

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200)
    this.camera.position.set(8, 10, 12)
    this.camera.lookAt(0, 2, 0)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 5
    this.controls.maxDistance = 40
    this.controls.target.set(0, 2, 0)
    this.controls.maxPolarAngle = Math.PI * 0.85

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.2,
      0.5,
      0.3
    )
    this.composer.addPass(this.bloomPass)

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.clock = new THREE.Clock()

    this.createTerrain()
    this.createVolcano()
    this.createLighting()

    this.lavaNetwork = new LavaNetwork(this.scene)
    this.particleSystem = new ParticleSystem(this.scene)

    this.setupStoreSync()
    this.setupInteraction()

    window.addEventListener('resize', this.onResize)
  }

  private createTerrain() {
    const groundGeo = new THREE.PlaneGeometry(80, 80, 128, 128)
    const positions = groundGeo.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const dist = Math.sqrt(x * x + y * y)
      let height = 0
      if (dist < 5) {
        height = Math.pow(1 - dist / 5, 2) * 4.5
      } else {
        height = Math.sin(x * 0.3) * 0.3 + Math.cos(y * 0.25) * 0.3
        height += (Math.random() - 0.5) * 0.15
      }
      positions.setZ(i, height)
    }
    groundGeo.computeVertexNormals()

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a0a0a,
      roughness: 0.95,
      metalness: 0.05,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.1
    this.scene.add(ground)
  }

  private createVolcano() {
    const volcanoGeo = new THREE.ConeGeometry(5, 6, 32, 8, true)
    const volcanoMat = new THREE.MeshStandardMaterial({
      color: 0x1a0808,
      roughness: 0.9,
      metalness: 0.1,
    })
    const volcano = new THREE.Mesh(volcanoGeo, volcanoMat)
    volcano.position.y = 3
    this.scene.add(volcano)

    const craterGeo = new THREE.CircleGeometry(1.5, 32)
    const craterMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.6,
    })
    const crater = new THREE.Mesh(craterGeo, craterMat)
    crater.rotation.x = -Math.PI / 2
    crater.position.y = 5.95
    this.scene.add(crater)
  }

  private createLighting() {
    const ambient = new THREE.AmbientLight(0x220808, 0.4)
    this.scene.add(ambient)

    this.glowLight = new THREE.PointLight(0xff4500, 3, 30, 1.5)
    this.glowLight.position.set(0, 6.5, 0)
    this.scene.add(this.glowLight)

    const fillLight = new THREE.PointLight(0xff2200, 1.5, 20, 2)
    fillLight.position.set(3, 2, 3)
    this.scene.add(fillLight)

    const backLight = new THREE.PointLight(0xcc1100, 1.0, 20, 2)
    backLight.position.set(-3, 2, -3)
    this.scene.add(backLight)
  }

  private setupStoreSync() {
    const store = useLavaStore.getState()
    this.lavaNetwork.setParams(store.flowSpeed, store.glowIntensity, store.branchDensity)

    this.unsubscribe = useLavaStore.subscribe((state) => {
      this.lavaNetwork.setParams(state.flowSpeed, state.glowIntensity, state.branchDensity)
      this.bloomPass.strength = 0.8 + state.glowIntensity * 0.6
    })
  }

  private setupInteraction() {
    this.renderer.domElement.addEventListener('click', this.onClick)
  }

  private onClick = (event: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)

    const meshes = this.lavaNetwork.getAllMeshes()
    const intersects = this.raycaster.intersectObjects(meshes, false)

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh
      const branches = this.lavaNetwork.getAllBranches()
      const hitBranch = branches.find((b) => b.mesh === hitMesh)

      if (hitBranch) {
        this.lavaNetwork.triggerEruption(hitBranch.id)
        this.particleSystem.triggerEruption(intersects[0].point)

        const info: LavaBranchInfo = {
          id: hitBranch.id,
          speed: hitBranch.speed,
          temperature: hitBranch.temperature,
          childCount: hitBranch.childCount,
          screenX: event.clientX,
          screenY: event.clientY,
        }
        if (this.onBranchClick) {
          this.onBranchClick(info)
        }
      }
    }
  }

  setOnBranchClick(callback: (info: LavaBranchInfo) => void) {
    this.onBranchClick = callback
  }

  triggerRebuild() {
    this.lavaNetwork.rebuild()
  }

  private onResize = () => {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
    this.composer.setSize(width, height)
  }

  start() {
    this.clock.start()
    const animate = () => {
      this.animationId = requestAnimationFrame(animate)
      const delta = Math.min(this.clock.getDelta(), 0.05)

      this.controls.update()
      this.lavaNetwork.update(delta)

      const lavaPositions: THREE.Vector3[] = []
      const branches = this.lavaNetwork.getAllBranches()
      for (const b of branches) {
        const mid = Math.floor(b.points.length / 2)
        if (b.points[mid]) lavaPositions.push(b.points[mid])
        for (const c of b.children) {
          const cmid = Math.floor(c.points.length / 2)
          if (c.points[cmid]) lavaPositions.push(c.points[cmid])
        }
      }
      this.particleSystem.update(delta, lavaPositions)

      this.glowLight.intensity = 3 + Math.sin(this.clock.elapsedTime * 2) * 0.5

      this.composer.render()
    }
    animate()
  }

  stop() {
    cancelAnimationFrame(this.animationId)
  }

  dispose() {
    this.stop()
    window.removeEventListener('resize', this.onResize)
    this.renderer.domElement.removeEventListener('click', this.onClick)
    if (this.unsubscribe) this.unsubscribe()
    this.lavaNetwork.dispose()
    this.particleSystem.dispose()
    this.controls.dispose()
    this.renderer.dispose()
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
