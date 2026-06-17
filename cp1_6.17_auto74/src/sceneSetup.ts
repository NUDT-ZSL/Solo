import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export interface SceneCore {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  soilContainer: THREE.Mesh
  soilMaterial: THREE.MeshStandardMaterial
  containerSize: { width: number; height: number; depth: number }
}

export function initScene(container: HTMLDivElement): SceneCore {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0D0D0D)
  scene.fog = new THREE.Fog(0x0D0D0D, 15, 30)

  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  )
  camera.position.set(0, 2, 20)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  container.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 5
  controls.maxDistance = 30
  controls.maxPolarAngle = Math.PI / 2.1

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const mainLight = new THREE.DirectionalLight(0xffffff, 1.0)
  mainLight.position.set(5, 10, 5)
  mainLight.castShadow = true
  mainLight.shadow.mapSize.width = 2048
  mainLight.shadow.mapSize.height = 2048
  mainLight.shadow.camera.near = 0.5
  mainLight.shadow.camera.far = 50
  mainLight.shadow.camera.left = -10
  mainLight.shadow.camera.right = 10
  mainLight.shadow.camera.top = 10
  mainLight.shadow.camera.bottom = -10
  scene.add(mainLight)

  const fillLight = new THREE.DirectionalLight(0x88aaff, 0.3)
  fillLight.position.set(-5, 3, -5)
  scene.add(fillLight)

  const containerSize = { width: 12, height: 8, depth: 12 }
  const { soilContainer, soilMaterial } = createSoilContainer(containerSize)
  scene.add(soilContainer)

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
      metalness: 0.1
    })
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -containerSize.height / 2 - 0.01
  ground.receiveShadow = true
  scene.add(ground)

  const handleResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', handleResize)

  return {
    scene,
    camera,
    renderer,
    controls,
    soilContainer,
    soilMaterial,
    containerSize
  }
}

function createSoilContainer(size: { width: number; height: number; depth: number }) {
  const group = new THREE.Group()

  const soilGeometry = new THREE.BoxGeometry(size.width, size.height, size.depth)
  const soilMaterial = new THREE.MeshStandardMaterial({
    color: 0x4E342E,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0.0
  })
  const soil = new THREE.Mesh(soilGeometry, soilMaterial)
  soil.position.y = -size.height / 2
  soil.receiveShadow = true
  group.add(soil)

  const wireframeGeometry = new THREE.EdgesGeometry(soilGeometry)
  const wireframeMaterial = new THREE.LineBasicMaterial({
    color: 0xA0A0A0,
    transparent: true,
    opacity: 0.3
  })
  const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial)
  wireframe.position.y = -size.height / 2
  group.add(wireframe)

  const gridHelperXY = new THREE.GridHelper(size.width, 12, 0xA0A0A0, 0xA0A0A0)
  gridHelperXY.material.transparent = true
  gridHelperXY.material.opacity = 0.15
  gridHelperXY.position.y = -size.height / 2
  group.add(gridHelperXY)

  return { soilContainer: group, soilMaterial }
}

export function animateCameraIn(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  duration: number = 2000
): Promise<void> {
  return new Promise((resolve) => {
    const startZ = 20
    const endZ = 8
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      camera.position.z = startZ + (endZ - startZ) * eased

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        resolve()
      }
    }

    requestAnimationFrame(animate)
  })
}
