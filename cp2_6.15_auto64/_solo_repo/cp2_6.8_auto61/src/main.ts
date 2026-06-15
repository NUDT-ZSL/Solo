import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Crystal, type CrystalParameters } from './crystal'
import { ParticleSystem } from './particles'

class CrystalGrowthApp {
  private container: HTMLElement
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private controls!: OrbitControls
  private crystal!: Crystal
  private particles!: ParticleSystem
  private raycaster: THREE.Raycaster = new THREE.Raycaster()
  private mouse: THREE.Vector2 = new THREE.Vector2()

  private miniScene!: THREE.Scene
  private miniCamera!: THREE.PerspectiveCamera
  private miniRenderer!: THREE.WebGLRenderer
  private unitCellMesh!: THREE.Group

  private gridHelper!: THREE.GridHelper
  private axesHelper!: THREE.AxesHelper

  private currentParams: CrystalParameters = {
    ionConcentration: 1.0,
    temperature: 35,
    pH: 7
  }

  private displayParams: CrystalParameters = {
    ionConcentration: 1.0,
    temperature: 35,
    pH: 7
  }

  private lastTime: number = 0
  private frameCount: number = 0
  private fpsTime: number = 0
  private fpsDisplay!: HTMLElement

  private isUnitCellExpanded: boolean = false
  private structureThumbnail!: HTMLDivElement
  private unitCellContainer!: HTMLDivElement

  constructor() {
    this.container = document.getElementById('app')!
    this.init()
  }

  private init(): void {
    this.setupMainScene()
    this.setupLighting()
    this.setupGridAndAxes()
    this.setupCrystal()
    this.setupParticles()
    this.setupMiniScene()
    this.setupUI()
    this.setupEventListeners()
    this.animate()
    this.crystal.startGrowth()
  }

  private setupMainScene(): void {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0f172a)
    this.scene.fog = new THREE.Fog(0x0f172a, 15, 45)

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    )
    this.camera.position.set(7, 6, 9)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.15
    this.container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 3
    this.controls.maxDistance = 30
    this.controls.autoRotate = false
    this.controls.autoRotateSpeed = 0.3
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x4a4a7a, 0.55)
    this.scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.4)
    mainLight.position.set(8, 12, 6)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 2048
    mainLight.shadow.mapSize.height = 2048
    mainLight.shadow.camera.near = 0.5
    mainLight.shadow.camera.far = 50
    mainLight.shadow.camera.left = -15
    mainLight.shadow.camera.right = 15
    mainLight.shadow.camera.top = 15
    mainLight.shadow.camera.bottom = -15
    this.scene.add(mainLight)

    const fillLight = new THREE.DirectionalLight(0x8899ff, 0.5)
    fillLight.position.set(-8, 4, -5)
    this.scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0x88ccff, 0.4)
    rimLight.position.set(0, -3, -8)
    this.scene.add(rimLight)

    const violetLight = new THREE.PointLight(0x8b5cf6, 0.8, 25)
    violetLight.position.set(-5, 3, 5)
    this.scene.add(violetLight)

    const cyanLight = new THREE.PointLight(0x34d399, 0.6, 25)
    cyanLight.position.set(5, -2, -5)
    this.scene.add(cyanLight)

    const orangeLight = new THREE.PointLight(0xfb923c, 0.4, 20)
    orangeLight.position.set(3, 5, -3)
    this.scene.add(orangeLight)
  }

  private setupGridAndAxes(): void {
    this.gridHelper = new THREE.GridHelper(20, 20, 0x3b4266, 0x1e293b)
    ;(this.gridHelper.material as THREE.Material).transparent = true
    ;(this.gridHelper.material as THREE.Material).opacity = 0.6
    this.scene.add(this.gridHelper)

    this.axesHelper = new THREE.AxesHelper(10.5)
    this.scene.add(this.axesHelper)

    const gridYZ = new THREE.GridHelper(20, 20, 0x3b4266, 0x1e293b)
    gridYZ.rotation.z = Math.PI / 2
    gridYZ.position.set(-10, 0, 0)
    ;(gridYZ.material as THREE.Material).transparent = true
    ;(gridYZ.material as THREE.Material).opacity = 0.35
    this.scene.add(gridYZ)

    const gridXZ = new THREE.GridHelper(20, 20, 0x3b4266, 0x1e293b)
    gridXZ.rotation.x = Math.PI / 2
    gridXZ.position.set(0, 0, -10)
    ;(gridXZ.material as THREE.Material).transparent = true
    ;(gridXZ.material as THREE.Material).opacity = 0.35
    this.scene.add(gridXZ)
  }

  private setupCrystal(): void {
    this.crystal = new Crystal(this.scene, this.currentParams)
  }

  private setupParticles(): void {
    this.particles = new ParticleSystem(this.scene, this.container, this.crystal)
  }

  private setupMiniScene(): void {
    this.miniScene = new THREE.Scene()
    this.miniScene.background = new THREE.Color(0x1e1b4b)

    this.miniCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    this.miniCamera.position.set(3.5, 3, 3.5)
    this.miniCamera.lookAt(0, 0, 0)
  }

  private createUnitCell(system: string): THREE.Group {
    const group = new THREE.Group()
    const atomMaterial = new THREE.MeshPhongMaterial({
      color: 0x8b5cf6,
      emissive: 0x4c1d95,
      shininess: 100
    })
    const bondMaterial = new THREE.LineBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.7
    })

    let size = 1
    const atomPositions: [number, number, number][] = []

    switch (system) {
      case 'hexagonal':
        size = 0.9
        atomPositions.push([0, 0, 0])
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2
          atomPositions.push([
            Math.cos(angle) * size,
            0,
            Math.sin(angle) * size
          ])
          atomPositions.push([
            Math.cos(angle + Math.PI / 6) * size * 0.5,
            size * 0.8,
            Math.sin(angle + Math.PI / 6) * size * 0.5
          ])
        }
        break
      case 'tetragonal':
        size = 1.1
        atomPositions.push([0, 0, 0])
        atomPositions.push([size, 0, 0])
        atomPositions.push([0, size * 1.3, 0])
        atomPositions.push([0, 0, size])
        atomPositions.push([size, size * 1.3, 0])
        atomPositions.push([size, 0, size])
        atomPositions.push([0, size * 1.3, size])
        atomPositions.push([size, size * 1.3, size])
        atomPositions.push([size / 2, size * 0.65, size / 2])
        break
      case 'orthorhombic':
        atomPositions.push([0, 0, 0])
        atomPositions.push([size * 1.2, 0, 0])
        atomPositions.push([0, size * 0.8, 0])
        atomPositions.push([0, 0, size * 1.5])
        atomPositions.push([size * 1.2, size * 0.8, 0])
        atomPositions.push([size * 1.2, 0, size * 1.5])
        atomPositions.push([0, size * 0.8, size * 1.5])
        atomPositions.push([size * 1.2, size * 0.8, size * 1.5])
        break
      case 'cubic':
      default:
        atomPositions.push([0, 0, 0])
        atomPositions.push([size, 0, 0])
        atomPositions.push([0, size, 0])
        atomPositions.push([0, 0, size])
        atomPositions.push([size, size, 0])
        atomPositions.push([size, 0, size])
        atomPositions.push([0, size, size])
        atomPositions.push([size, size, size])
        atomPositions.push([size / 2, size / 2, 0])
        atomPositions.push([size / 2, 0, size / 2])
        atomPositions.push([0, size / 2, size / 2])
        atomPositions.push([size, size / 2, size / 2])
        atomPositions.push([size / 2, size, size / 2])
        atomPositions.push([size / 2, size / 2, size])
        atomPositions.push([size / 2, size / 2, size / 2])
        break
    }

    atomPositions.forEach((pos) => {
      const atomGeo = new THREE.SphereGeometry(0.12, 12, 12)
      const atom = new THREE.Mesh(atomGeo, atomMaterial)
      atom.position.set(pos[0] - size / 2, pos[1] - size / 2, pos[2] - size / 2)
      group.add(atom)
    })

    const edgePoints: [number, number, number][] = [
      [-size / 2, -size / 2, -size / 2],
      [size / 2, -size / 2, -size / 2],
      [size / 2, -size / 2, -size / 2],
      [size / 2, size / 2, -size / 2],
      [size / 2, size / 2, -size / 2],
      [-size / 2, size / 2, -size / 2],
      [-size / 2, size / 2, -size / 2],
      [-size / 2, -size / 2, -size / 2],
      [-size / 2, -size / 2, size / 2],
      [size / 2, -size / 2, size / 2],
      [size / 2, -size / 2, size / 2],
      [size / 2, size / 2, size / 2],
      [size / 2, size / 2, size / 2],
      [-size / 2, size / 2, size / 2],
      [-size / 2, size / 2, size / 2],
      [-size / 2, -size / 2, size / 2],
      [-size / 2, -size / 2, -size / 2],
      [-size / 2, -size / 2, size / 2],
      [size / 2, -size / 2, -size / 2],
      [size / 2, -size / 2, size / 2],
      [size / 2, size / 2, -size / 2],
      [size / 2, size / 2, size / 2],
      [-size / 2, size / 2, -size / 2],
      [-size / 2, size / 2, size / 2]
    ]

    for (let i = 0; i < edgePoints.length; i += 2) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...edgePoints[i]),
        new THREE.Vector3(...edgePoints[i + 1])
      ])
      group.add(new THREE.Line(geo, bondMaterial))
    }

    const miniLight = new THREE.PointLight(0xffffff, 1)
    miniLight.position.set(3, 3, 3)
    group.add(miniLight)

    const miniAmbient = new THREE.AmbientLight(0x404080, 0.5)
    group.add(miniAmbient)

    return group
  }

  private setupUI(): void {
    this.createControlPanel()
    this.createStructureThumbnail()
    this.createFPSDisplay()
  }

  private createControlPanel(): void {
    const panel = document.createElement('div')
    Object.assign(panel.style, {
      position: 'absolute',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(30, 27, 75, 0.65)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '16px',
      padding: '20px 28px',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
      zIndex: '50',
      display: 'flex',
      flexDirection: 'row',
      gap: '32px',
      alignItems: 'flex-start',
      maxWidth: '90vw',
      flexWrap: 'wrap',
      justifyContent: 'center'
    })
    panel.id = 'control-panel'

    const title = document.createElement('div')
    title.textContent = '💎 晶体生长参数'
    Object.assign(title.style, {
      position: 'absolute',
      top: '-12px',
      left: '24px',
      background: 'linear-gradient(90deg, #8B5CF6, #34D399, #FB923C)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      fontSize: '15px',
      fontWeight: '700',
      padding: '0 10px',
      letterSpacing: '1px'
    })
    panel.appendChild(title)

    const ionControl = this.createSlider(
      '离子浓度',
      'mol/L',
      0.1,
      2.0,
      0.1,
      this.currentParams.ionConcentration,
      '#8B5CF6',
      (val: number) => {
        this.currentParams.ionConcentration = val
        this.crystal.updateParameters(this.currentParams)
        this.updateStructureThumbnail()
      }
    )

    const tempControl = this.createSlider(
      '温度',
      '°C',
      20,
      60,
      5,
      this.currentParams.temperature,
      '#34D399',
      (val: number) => {
        this.currentParams.temperature = val
        this.crystal.updateParameters(this.currentParams)
        this.updateStructureThumbnail()
      }
    )

    const pHControl = this.createSlider(
      'pH值',
      '',
      3,
      10,
      1,
      this.currentParams.pH,
      '#FB923C',
      (val: number) => {
        this.currentParams.pH = val
        this.crystal.updateParameters(this.currentParams)
        this.updateStructureThumbnail()
      }
    )

    panel.appendChild(ionControl)
    panel.appendChild(tempControl)
    panel.appendChild(pHControl)

    const regrowBtn = document.createElement('button')
    regrowBtn.textContent = '🔄 重新生长'
    Object.assign(regrowBtn.style, {
      alignSelf: 'center',
      padding: '10px 20px',
      background: 'linear-gradient(135deg, #8B5CF6, #34D399)',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '13px',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
      fontFamily: 'inherit',
      letterSpacing: '0.5px'
    })
    regrowBtn.addEventListener('mouseenter', () => {
      regrowBtn.style.transform = 'translateY(-2px)'
      regrowBtn.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.5)'
    })
    regrowBtn.addEventListener('mouseleave', () => {
      regrowBtn.style.transform = 'translateY(0)'
      regrowBtn.style.boxShadow = '0 4px 15px rgba(139, 92, 246, 0.3)'
    })
    regrowBtn.addEventListener('click', () => {
      this.crystal.startGrowth()
    })
    panel.appendChild(regrowBtn)

    this.container.appendChild(panel)
  }

  private createSlider(
    label: string,
    unit: string,
    min: number,
    max: number,
    step: number,
    value: number,
    color: string,
    onChange: (val: number) => void
  ): HTMLDivElement {
    const wrapper = document.createElement('div')
    Object.assign(wrapper.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      minWidth: '160px'
    })

    const labelRow = document.createElement('div')
    Object.assign(labelRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    })

    const labelEl = document.createElement('span')
    labelEl.textContent = label
    Object.assign(labelEl.style, {
      fontSize: '12px',
      color: '#CBD5E1',
      fontWeight: '500',
      letterSpacing: '0.3px'
    })

    const valueEl = document.createElement('span')
    valueEl.textContent = `${value.toFixed(step < 1 ? 1 : 0)}${unit}`
    Object.assign(valueEl.style, {
      fontSize: '13px',
      fontWeight: '700',
      color,
      fontFamily: 'monospace',
      transition: 'color 0.3s ease'
    })

    labelRow.appendChild(labelEl)
    labelRow.appendChild(valueEl)

    const sliderContainer = document.createElement('div')
    Object.assign(sliderContainer.style, {
      position: 'relative',
      height: '8px'
    })

    const trackBg = document.createElement('div')
    Object.assign(trackBg.style, {
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '100%',
      height: '6px',
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '3px'
    })

    const trackFill = document.createElement('div')
    const pct = ((value - min) / (max - min)) * 100
    Object.assign(trackFill.style, {
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      left: '0',
      width: `${pct}%`,
      height: '6px',
      background: `linear-gradient(90deg, #8B5CF6, #34D399, #FB923C)`,
      borderRadius: '3px',
      transition: 'width 0.3s ease'
    })

    const input = document.createElement('input')
    input.type = 'range'
    input.min = String(min)
    input.max = String(max)
    input.step = String(step)
    input.value = String(value)
    Object.assign(input.style, {
      position: 'absolute',
      width: '100%',
      height: '100%',
      top: '0',
      left: '0',
      opacity: '0',
      cursor: 'pointer',
      margin: '0',
      padding: '0'
    })

    const thumb = document.createElement('div')
    Object.assign(thumb.style, {
      position: 'absolute',
      top: '50%',
      left: `${pct}%`,
      transform: 'translate(-50%, -50%)',
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      background: color,
      boxShadow: `0 0 12px ${color}, 0 2px 6px rgba(0,0,0,0.3)`,
      transition: 'left 0.3s ease, transform 0.2s ease',
      pointerEvents: 'none',
      border: '2px solid white'
    })

    input.addEventListener('input', () => {
      const val = parseFloat(input.value)
      const newPct = ((val - min) / (max - min)) * 100
      trackFill.style.width = `${newPct}%`
      thumb.style.left = `${newPct}%`
      valueEl.textContent = `${val.toFixed(step < 1 ? 1 : 0)}${unit}`
      onChange(val)
    })

    input.addEventListener('mousedown', () => {
      thumb.style.transform = 'translate(-50%, -50%) scale(1.2)'
    })
    input.addEventListener('mouseup', () => {
      thumb.style.transform = 'translate(-50%, -50%) scale(1)'
    })
    input.addEventListener('touchstart', () => {
      thumb.style.transform = 'translate(-50%, -50%) scale(1.2)'
    })
    input.addEventListener('touchend', () => {
      thumb.style.transform = 'translate(-50%, -50%) scale(1)'
    })

    sliderContainer.appendChild(trackBg)
    sliderContainer.appendChild(trackFill)
    sliderContainer.appendChild(thumb)
    sliderContainer.appendChild(input)

    wrapper.appendChild(labelRow)
    wrapper.appendChild(sliderContainer)

    return wrapper
  }

  private createStructureThumbnail(): void {
    this.structureThumbnail = document.createElement('div')
    Object.assign(this.structureThumbnail.style, {
      position: 'absolute',
      bottom: '24px',
      right: '24px',
      width: '140px',
      height: '160px',
      background: 'rgba(30, 27, 75, 0.7)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderRadius: '14px',
      border: '1px solid rgba(139, 92, 246, 0.4)',
      padding: '8px',
      cursor: 'pointer',
      zIndex: '40',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      transition: 'all 0.3s ease',
      overflow: 'hidden'
    })

    this.structureThumbnail.addEventListener('mouseenter', () => {
      this.structureThumbnail.style.transform = 'scale(1.05)'
      this.structureThumbnail.style.boxShadow = '0 0 30px rgba(139, 92, 246, 0.4)'
    })
    this.structureThumbnail.addEventListener('mouseleave', () => {
      this.structureThumbnail.style.transform = 'scale(1)'
      this.structureThumbnail.style.boxShadow = 'none'
    })
    this.structureThumbnail.addEventListener('click', () => {
      this.toggleUnitCellExpand()
    })

    const title = document.createElement('div')
    title.textContent = '🔬 晶体结构'
    Object.assign(title.style, {
      fontSize: '11px',
      color: '#A78BFA',
      fontWeight: '600',
      marginBottom: '4px',
      letterSpacing: '0.5px',
      textAlign: 'center'
    })
    this.structureThumbnail.appendChild(title)

    const systemName = document.createElement('div')
    systemName.id = 'system-name'
    systemName.textContent = this.crystal.getCrystalSystemInfo().name
    Object.assign(systemName.style, {
      fontSize: '10px',
      color: '#94A3B8',
      marginBottom: '6px',
      textAlign: 'center',
      fontFamily: 'monospace'
    })
    this.structureThumbnail.appendChild(systemName)

    const canvasContainer = document.createElement('div')
    Object.assign(canvasContainer.style, {
      width: '100px',
      height: '100px',
      position: 'relative',
      borderRadius: '10px',
      overflow: 'hidden',
      boxShadow: '0 0 15px rgba(52, 211, 153, 0.2)'
    })

    this.miniRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.miniRenderer.setSize(100, 100)
    this.miniRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    canvasContainer.appendChild(this.miniRenderer.domElement)

    const pulseRing = document.createElement('div')
    Object.assign(pulseRing.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      borderRadius: '10px',
      border: '2px solid rgba(52, 211, 153, 0.6)',
      animation: 'pulse 2s ease-in-out infinite',
      pointerEvents: 'none'
    })
    canvasContainer.appendChild(pulseRing)

    this.structureThumbnail.appendChild(canvasContainer)

    this.unitCellMesh = this.createUnitCell(this.crystal.crystalSystem)
    this.miniScene.add(this.unitCellMesh)

    this.container.appendChild(this.structureThumbnail)

    this.createExpandedUnitCell()

    this.addPulseAnimation()
  }

  private createExpandedUnitCell(): void {
    this.unitCellContainer = document.createElement('div')
    Object.assign(this.unitCellContainer.style, {
      position: 'absolute',
      bottom: '24px',
      right: '180px',
      width: '0px',
      height: '0px',
      background: 'rgba(30, 27, 75, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '16px',
      border: '1px solid rgba(139, 92, 246, 0.5)',
      overflow: 'hidden',
      zIndex: '45',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: '0',
      pointerEvents: 'none'
    })

    const title = document.createElement('div')
    title.textContent = '🔷 晶胞骨架模型'
    Object.assign(title.style, {
      padding: '12px 16px',
      fontSize: '13px',
      fontWeight: '600',
      color: '#A78BFA',
      borderBottom: '1px solid rgba(139, 92, 246, 0.3)',
      background: 'rgba(139, 92, 246, 0.1)'
    })
    this.unitCellContainer.appendChild(title)

    const expandedCanvas = document.createElement('canvas')
    Object.assign(expandedCanvas.style, {
      width: '280px',
      height: '280px',
      display: 'block'
    })

    this.unitCellContainer.appendChild(expandedCanvas)

    const info = document.createElement('div')
    info.id = 'unit-cell-info'
    Object.assign(info.style, {
      padding: '12px 16px',
      fontSize: '11px',
      color: '#94A3B8',
      borderTop: '1px solid rgba(139, 92, 246, 0.3)',
      lineHeight: '1.6'
    })
    info.innerHTML = `
      <div style="color:#34D399;font-weight:600;margin-bottom:4px;">${this.crystal.getCrystalSystemInfo().name}</div>
      <div>原子数: <span style="color:#FBBF24;font-family:monospace;">${this.unitCellMesh.children.filter(c => c.type === 'Mesh').length}</span></div>
      <div>键合数: <span style="color:#FBBF24;font-family:monospace;">${this.unitCellMesh.children.filter(c => c.type === 'Line').length}</span></div>
    `
    this.unitCellContainer.appendChild(info)

    this.container.appendChild(this.unitCellContainer)
  }

  private toggleUnitCellExpand(): void {
    this.isUnitCellExpanded = !this.isUnitCellExpanded

    if (this.isUnitCellExpanded) {
      this.unitCellContainer.style.width = '300px'
      this.unitCellContainer.style.height = '360px'
      this.unitCellContainer.style.opacity = '1'
      this.unitCellContainer.style.pointerEvents = 'auto'
      this.unitCellContainer.style.boxShadow = '0 10px 40px rgba(0,0,0,0.5), 0 0 30px rgba(139, 92, 246, 0.2)'
    } else {
      this.unitCellContainer.style.width = '0px'
      this.unitCellContainer.style.height = '0px'
      this.unitCellContainer.style.opacity = '0'
      this.unitCellContainer.style.pointerEvents = 'none'
      this.unitCellContainer.style.boxShadow = 'none'
    }
  }

  private updateStructureThumbnail(): void {
    const sysName = document.getElementById('system-name')
    if (sysName) {
      sysName.textContent = this.crystal.getCrystalSystemInfo().name
    }
    const info = document.getElementById('unit-cell-info')
    if (info) {
      info.innerHTML = `
        <div style="color:#34D399;font-weight:600;margin-bottom:4px;">${this.crystal.getCrystalSystemInfo().name}</div>
        <div>原子数: <span style="color:#FBBF24;font-family:monospace;">${this.unitCellMesh.children.filter(c => c.type === 'Mesh').length}</span></div>
        <div>键合数: <span style="color:#FBBF24;font-family:monospace;">${this.unitCellMesh.children.filter(c => c.type === 'Line').length}</span></div>
      `
    }

    this.miniScene.remove(this.unitCellMesh)
    this.unitCellMesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
        else obj.material.dispose()
      }
    })
    this.unitCellMesh = this.createUnitCell(this.crystal.crystalSystem)
    this.miniScene.add(this.unitCellMesh)
  }

  private addPulseAnimation(): void {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 0.3; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.05); }
      }
    `
    document.head.appendChild(style)
  }

  private createFPSDisplay(): void {
    this.fpsDisplay = document.createElement('div')
    Object.assign(this.fpsDisplay.style, {
      position: 'absolute',
      top: '20px',
      left: '20px',
      padding: '8px 14px',
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#34D399',
      fontWeight: '600',
      border: '1px solid rgba(52, 211, 153, 0.3)',
      zIndex: '30'
    })
    this.fpsDisplay.textContent = 'FPS: --'
    this.container.appendChild(this.fpsDisplay)
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize())
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e))
    this.renderer.domElement.addEventListener('mouseleave', () => {
      this.particles.updateHover(null, null)
    })
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersection = this.crystal.intersect(this.raycaster)

    if (intersection) {
      const faceInfo = this.crystal.getFaceInfo(intersection)
      if (faceInfo) {
        const screenPos = {
          x: event.clientX,
          y: event.clientY
        }
        this.particles.updateHover(faceInfo, screenPos)
        return
      }
    }
    this.particles.updateHover(null, null)
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate)

    const currentTime = performance.now()
    const delta = Math.min((currentTime - this.lastTime) / 1000, 0.1)
    this.lastTime = currentTime

    this.frameCount++
    if (currentTime - this.fpsTime >= 1000) {
      const fps = Math.round(this.frameCount * 1000 / (currentTime - this.fpsTime))
      this.fpsDisplay.textContent = `FPS: ${fps}`
      this.fpsDisplay.style.color = fps >= 40 ? '#34D399' : fps >= 30 ? '#FBBF24' : '#EF4444'
      this.frameCount = 0
      this.fpsTime = currentTime
    }

    this.displayParams.ionConcentration += (this.currentParams.ionConcentration - this.displayParams.ionConcentration) * 0.08
    this.displayParams.temperature += (this.currentParams.temperature - this.displayParams.temperature) * 0.08
    this.displayParams.pH += (this.currentParams.pH - this.displayParams.pH) * 0.08

    this.controls.update()
    this.crystal.update(currentTime, this.camera)
    this.particles.update(currentTime, delta, this.crystal.isGrowing)

    this.unitCellMesh.rotation.y += 0.01
    this.unitCellMesh.rotation.x = Math.sin(currentTime * 0.0005) * 0.3

    if (this.isUnitCellExpanded) {
      const expandedCanvas = this.unitCellContainer.querySelector('canvas')
      if (expandedCanvas && !expandedCanvas.dataset.initialized) {
        expandedCanvas.dataset.initialized = 'true'
      }
    }

    this.renderer.render(this.scene, this.camera)
    this.miniRenderer.render(this.miniScene, this.miniCamera)

    if (this.isUnitCellExpanded) {
      const expandedCanvas = this.unitCellContainer.querySelector('canvas') as HTMLCanvasElement | null
      if (expandedCanvas) {
        const ctx = expandedCanvas.getContext('2d')
        if (ctx) {
          this.miniCamera.aspect = 1
          this.miniCamera.updateProjectionMatrix()
          this.miniRenderer.setSize(280, 280)
          this.miniRenderer.render(this.miniScene, this.miniCamera)
          ctx.drawImage(this.miniRenderer.domElement, 0, 0, 280, 280)
          this.miniRenderer.setSize(100, 100)
        }
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new CrystalGrowthApp()
})
