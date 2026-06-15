import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import {
  generateCrystalCluster,
  buildCrystalMesh,
  updateCrystalGrowth,
  explodeCrystal,
  updateShards,
  type CrystalData,
  type ShardData,
} from './CrystalCluster'
import {
  createSparkBand,
  findSparkPair,
  updateSparkBands,
  type SparkBand,
} from './SparkEffect'
import './styles.css'

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const crystalsRef = useRef<CrystalData[]>([])
  const shardsRef = useRef<ShardData[]>([])
  const sparkBandsRef = useRef<SparkBand[]>([])
  const crystalGroupsRef = useRef<Map<number, THREE.Group>>(new Map())
  const nextSparkTimeRef = useRef<number>(0)
  const animationIdRef = useRef<number>(0)
  const isDraggingRef = useRef<boolean>(false)
  const previousMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const cameraDistanceRef = useRef<number>(8)
  const cameraThetaRef = useRef<number>(0)
  const cameraPhiRef = useRef<number>(Math.PI / 3.5)
  const cameraTargetThetaRef = useRef<number>(0)
  const cameraTargetPhiRef = useRef<number>(Math.PI / 3.5)
  const cameraTargetDistanceRef = useRef<number>(8)
  const [crystalCount, setCrystalCount] = useState<number>(0)

  const updateCrystalCount = useCallback(() => {
    const activeCrystals = crystalsRef.current.filter(c => !c.isExploding).length
    setCrystalCount(activeCrystals)
  }, [])

  const handleCrystalClick = useCallback((crystalId: number) => {
    const crystal = crystalsRef.current.find(c => c.id === crystalId)
    if (!crystal || crystal.isExploding) return

    const scene = sceneRef.current
    if (!scene) return

    const newShards = explodeCrystal(crystal, scene, shardsRef.current, crystalsRef.current)
    shardsRef.current = [...shardsRef.current, ...newShards]

    const group = crystalGroupsRef.current.get(crystalId)
    if (group && scene) {
      scene.remove(group)
    }
    crystalGroupsRef.current.delete(crystalId)

    for (const branch of crystal.branches) {
      const branchGroup = crystalGroupsRef.current.get(branch.id)
      if (branchGroup && scene) {
        scene.remove(branchGroup)
      }
      crystalGroupsRef.current.delete(branch.id)
    }

    updateCrystalCount()
  }, [updateCrystalCount])

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a2e)
    scene.fog = new THREE.Fog(0x0a0a2e, 15, 30)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    )
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(0x8899bb, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -10
    directionalLight.shadow.camera.right = 10
    directionalLight.shadow.camera.top = 10
    directionalLight.shadow.camera.bottom = -10
    scene.add(directionalLight)

    const pointLight1 = new THREE.PointLight(0x88ccff, 0.8, 20)
    pointLight1.position.set(-3, 4, 3)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xffaacc, 0.6, 15)
    pointLight2.position.set(3, 2, -3)
    scene.add(pointLight2)

    const baseGeometry = new THREE.CylinderGeometry(5.5, 6, 0.8, 64)
    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x88aacc,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
      clearcoat: 1,
      clearcoatRoughness: 0.3,
    })
    const base = new THREE.Mesh(baseGeometry, baseMaterial)
    base.position.y = -0.4
    base.receiveShadow = true
    scene.add(base)

    const ringGeometry = new THREE.TorusGeometry(5.2, 0.03, 8, 100)
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xaabbdd,
      transparent: true,
      opacity: 0.6,
    })
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(ringGeometry, ringMaterial.clone())
      ring.rotation.x = Math.PI / 2
      ring.position.y = -0.2 + i * 0.2
      ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.6 - i * 0.15
      scene.add(ring)
    }

    const crystalCount_init = 45 + Math.floor(Math.random() * 16)
    const crystals = generateCrystalCluster(crystalCount_init, 4.5)
    crystalsRef.current = crystals

    for (const crystal of crystals) {
      const group = buildCrystalMesh(crystal)
      crystalGroupsRef.current.set(crystal.id, group)
      scene.add(group)
    }

    updateCrystalCount()

    nextSparkTimeRef.current = 2 + Math.random() * 3

    const updateCamera = () => {
      const cam = cameraRef.current
      if (!cam) return

      const damping = 0.9
      cameraThetaRef.current += (cameraTargetThetaRef.current - cameraThetaRef.current) * (1 - damping)
      cameraPhiRef.current += (cameraTargetPhiRef.current - cameraPhiRef.current) * (1 - damping)
      cameraDistanceRef.current += (cameraTargetDistanceRef.current - cameraDistanceRef.current) * (1 - damping)

      const theta = cameraThetaRef.current
      const phi = cameraPhiRef.current
      const distance = cameraDistanceRef.current

      const target = new THREE.Vector3(0, 0.5, 0)
      cam.position.x = target.x + distance * Math.sin(phi) * Math.sin(theta)
      cam.position.y = target.y + distance * Math.cos(phi)
      cam.position.z = target.z + distance * Math.sin(phi) * Math.cos(theta)
      cam.lookAt(target)
    }

    updateCamera()

    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true
      previousMouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      if (isDraggingRef.current) {
        const dx = e.clientX - previousMouseRef.current.x
        const dy = e.clientY - previousMouseRef.current.y

        cameraTargetThetaRef.current -= dx * 0.005
        cameraTargetPhiRef.current = Math.max(
          0.1,
          Math.min(Math.PI / 2 - 0.05, cameraTargetPhiRef.current - dy * 0.005)
        )

        previousMouseRef.current = { x: e.clientX, y: e.clientY }
      }
    }

    const onMouseUp = (e: MouseEvent) => {
      if (!containerRef.current || !sceneRef.current || !cameraRef.current) {
        isDraggingRef.current = false
        return
      }

      const startX = previousMouseRef.current.x
      const startY = previousMouseRef.current.y
      const moved = Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY)

      if (moved < 5) {
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)
        const crystalMeshes: THREE.Mesh[] = []
        for (const crystal of crystalsRef.current) {
          if (crystal.mesh && !crystal.isExploding) {
            crystalMeshes.push(crystal.mesh)
          }
        }
        const intersects = raycasterRef.current.intersectObjects(crystalMeshes)
        if (intersects.length > 0) {
          const mesh = intersects[0].object as THREE.Mesh
          const crystalId = mesh.userData.crystalId
          if (crystalId !== undefined) {
            handleCrystalClick(crystalId)
          }
        }
      }

      isDraggingRef.current = false
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      cameraTargetDistanceRef.current = Math.max(
        3,
        Math.min(20, cameraTargetDistanceRef.current + e.deltaY * 0.01)
      )
    }

    const onResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      cameraRef.current.aspect = width / height
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(width, height)
    }

    const canvas = renderer.domElement
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('resize', onResize)

    const clock = new THREE.Clock()

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)
      const deltaTime = Math.min(clock.getDelta(), 0.1)

      updateCamera()

      const currentScene = sceneRef.current
      if (!currentScene) return

      for (const crystal of crystalsRef.current) {
        if (crystal.isExploding) continue
        const group = crystalGroupsRef.current.get(crystal.id)
        if (group) {
          updateCrystalGrowth(crystal, group, currentScene, (newCrystal) => {
            crystalsRef.current.push(newCrystal)
            const newGroup = buildCrystalMesh(newCrystal)
            crystalGroupsRef.current.set(newCrystal.id, newGroup)
            currentScene.add(newGroup)
            updateCrystalCount()
          })
        }
      }

      shardsRef.current = updateShards(shardsRef.current, deltaTime, currentScene)

      const totalParticles = shardsRef.current.length + sparkBandsRef.current.length * 5
      if (totalParticles < 2000) {
        const now = performance.now() / 1000
        if (now >= nextSparkTimeRef.current) {
          const pair = findSparkPair(crystalsRef.current, 1.5)
          if (pair) {
            const sparkBand = createSparkBand(pair.start, pair.end, currentScene)
            sparkBandsRef.current.push(sparkBand)
          }
          nextSparkTimeRef.current = now + 2 + Math.random() * 3
        }
      }

      sparkBandsRef.current = updateSparkBands(sparkBandsRef.current, deltaTime, currentScene)

      renderer.render(currentScene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationIdRef.current)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)

      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
      }

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose())
          } else {
            obj.material?.dispose()
          }
        }
      })

      renderer.dispose()
    }
  }, [handleCrystalClick, updateCrystalCount])

  return (
    <div className="app-container">
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      <div className="ui-overlay instruction-panel">
        <div>🖱️ 鼠标拖拽：旋转视角</div>
        <div>🔍 滚轮滚动：缩放视野</div>
        <div>💎 点击水晶：使其爆裂</div>
      </div>

      <div className="ui-overlay crystal-counter">
        水晶数量：<span>{crystalCount}</span>
      </div>
    </div>
  )
}

export default App
