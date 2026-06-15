import * as THREE from 'three'
import { MazeData, WallData, CELL_SIZE, WALL_HEIGHT, GRID_SIZE, hslToHex } from './MazeGenerator'
import { OpticsManager } from './OpticsManager'

export interface SceneHandle {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  goalSphere: THREE.Mesh
  goalLight: THREE.PointLight
  update: (playerPos: THREE.Vector3, playerDir: THREE.Vector3, dt: number) => SceneUpdateResult
  triggerVictory: () => VictoryState
  getWallColliders: () => THREE.Box3[]
  isVictory: () => boolean
  cleanup: () => void
}

export interface SceneUpdateResult {
  particleCount: number
  goalReached: boolean
}

export interface VictoryState {
  running: boolean
  progress: number
}

interface GuideParticle {
  mesh: THREE.Mesh
  baseY: number
  phase: number
}

interface VictoryParticle {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  life: number
  maxLife: number
  startColor: THREE.Color
}

const FOG_COLOR = 0x1A1A2E
const FOG_DENSITY = 0.02
const GUIDE_PARTICLE_SPACING = 15
const MAX_TOTAL_PARTICLES = 5000
const REFLECTION_TEXTURE_SIZE = 512
const VICTORY_PARTICLE_COUNT = 200
const TEXT_PARTICLE_COUNT = 300
const GOAL_TRIGGER_DISTANCE = 2
const WALL_THICKNESS = 0.2

const VICTORY_TEXT_PATTERN: { x: number; y: number }[] = []

function buildVictoryTextPattern(): void {
  const chars = [
    [[0,5],[0,4],[0,3],[0,2],[0,1],[0,0],[1,0],[2,0],[3,0],[4,0],[4,1],[4,2],[4,3],[4,4],[4,5],[1,2.5],[2,2.5],[3,2.5]],
    [[6,0],[7,0],[8,0],[9,0],[10,0],[6,1],[10,1],[6,2],[10,2],[6,3],[10,3],[6,4],[10,4],[6,5],[7,5],[8,5],[9,5],[10,5]],
    [[12,5],[12,4],[12,3],[12,2],[12,1],[12,0],[13,0],[14,0],[15,0],[16,0],[16,1],[16,2],[16,3],[16,4],[16,5],[13,2.5],[14,2.5],[15,2.5]],
    [[18,0],[18,1],[18,2],[18,3],[18,4],[18,5],[19,5],[20,5],[21,4],[21,3],[22,2],[21,1],[20,0],[19,0]],
    [[24,5],[24,4],[24,3],[24,2],[24,1],[24,0],[25,0],[26,0],[27,0],[28,0],[28,1],[28,2],[28,3],[28,4],[28,5],[25,2.5],[26,2.5],[27,2.5]]
  ]
  for (const ch of chars) {
    for (const p of ch) {
      VICTORY_TEXT_PATTERN.push({ x: p[0] * 0.5 - 6, y: p[1] * 0.5 })
    }
  }
}
buildVictoryTextPattern()

export function buildScene(mazeData: MazeData, optics: OpticsManager): SceneHandle {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0A0A0A)
  scene.fog = new THREE.FogExp2(FOG_COLOR, FOG_DENSITY)

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500)
  camera.position.set(mazeData.startPosition.x, 1.5, mazeData.startPosition.z)

  const ambientLight = new THREE.AmbientLight(0x404060, 0.6)
  scene.add(ambientLight)
  const hemiLight = new THREE.HemisphereLight(0x8888ff, 0x222244, 0.4)
  scene.add(hemiLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5)
  dirLight.position.set(10, 30, 10)
  scene.add(dirLight)

  const pmrem = new THREE.PMREMGenerator(new THREE.WebGLRenderer({ alpha: false }))
  const envScene = new THREE.Scene()
  const envColors = [0xff66cc, 0x66ffcc, 0x6688ff, 0xcc66ff, 0xffcc66]
  for (let i = 0; i < 20; i++) {
    const l = new THREE.PointLight(envColors[i % envColors.length], 1.5, 30)
    const a = (i / 20) * Math.PI * 2
    l.position.set(Math.cos(a) * 25, 3 + (i % 5) * 1.2, Math.sin(a) * 25)
    envScene.add(l)
  }
  const envTex = pmrem.fromScene(envScene, 0.04).texture
  scene.environment = envTex
  pmrem.dispose()

  const groundSize = GRID_SIZE * CELL_SIZE + 20
  const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize)
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x12121a,
    roughness: 0.95,
    metalness: 0.05,
    envMapIntensity: 0.3
  })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = 0
  ground.receiveShadow = true
  scene.add(ground)

  const grid = new THREE.GridHelper(groundSize, 60, 0x222244, 0x18182a)
  grid.position.y = 0.01
  scene.add(grid)

  const ceilGeo = new THREE.PlaneGeometry(groundSize, groundSize)
  const ceilMat = new THREE.MeshBasicMaterial({ color: 0x0a0a14, side: THREE.DoubleSide })
  const ceiling = new THREE.Mesh(ceilGeo, ceilMat)
  ceiling.rotation.x = Math.PI / 2
  ceiling.position.y = WALL_HEIGHT + 0.01
  scene.add(ceiling)

  const skyBoxGeo = new THREE.SphereGeometry(200, 32, 32)
  const skyBoxMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x0a0a1a) },
      bottomColor: { value: new THREE.Color(0x1a1a3a) },
      offset: { value: 30 },
      exponent: { value: 0.7 }
    },
    vertexShader: `varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor;
      uniform float offset; uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }`
  })
  const skyBox = new THREE.Mesh(skyBoxGeo, skyBoxMat)
  scene.add(skyBox)

  const wallColliders: THREE.Box3[] = []

  for (const wall of mazeData.walls) {
    createWallMesh(wall, scene, optics, wallColliders)
  }

  optics.initializeAllWalls()

  const goalGeo = new THREE.SphereGeometry(1, 32, 32)
  const goalMat = new THREE.MeshStandardMaterial({
    color: 0xffdd44,
    emissive: 0xffaa00,
    emissiveIntensity: 2,
    metalness: 0.3,
    roughness: 0.4
  })
  const goalSphere = new THREE.Mesh(goalGeo, goalMat)
  goalSphere.position.set(mazeData.goalPosition.x, 1.5, mazeData.goalPosition.z)
  scene.add(goalSphere)

  const goalLight = new THREE.PointLight(0xffdd44, 3, 15, 1.5)
  goalLight.position.copy(goalSphere.position)
  scene.add(goalLight)

  const guideParticles: GuideParticle[] = createGuideParticles(scene, mazeData)

  const victory: VictoryState = { running: false, progress: 0 }
  const victoryParticles: VictoryParticle[] = []
  const textParticles: VictoryParticle[] = []

  function update(playerPos: THREE.Vector3, playerDir: THREE.Vector3, dt: number): SceneUpdateResult {
    for (const gp of guideParticles) {
      gp.phase += dt * 2
      gp.mesh.position.y = gp.baseY + Math.sin(gp.phase) * 0.15
      const scale = 0.8 + Math.sin(gp.phase * 1.3) * 0.2
      gp.mesh.scale.setScalar(scale)
    }

    const time = performance.now() * 0.001
    goalSphere.position.y = 1.5 + Math.sin(time * 2) * 0.25
    goalSphere.rotation.y = time * 0.8
    goalSphere.rotation.x = time * 0.5
    goalLight.intensity = 3 + Math.sin(time * 3) * 0.8
    ;(goalMat as THREE.MeshStandardMaterial).emissiveIntensity = 2 + Math.sin(time * 2.5) * 0.5

    if (victory.running) {
      victory.progress = Math.min(1, victory.progress + dt / 3)
      updateVictoryParticles(dt)
      updateTextParticles(dt)
      if (victory.progress >= 1) {
        victory.running = false
      }
    }

    const distToGoal = playerPos.distanceTo(goalSphere.position)
    const goalReached = distToGoal <= GOAL_TRIGGER_DISTANCE && !victory.running && victory.progress === 0

    const totalParticles = guideParticles.length + victoryParticles.length + textParticles.length

    return {
      particleCount: Math.min(totalParticles, MAX_TOTAL_PARTICLES),
      goalReached
    }
  }

  function updateVictoryParticles(dt: number): void {
    for (let i = victoryParticles.length - 1; i >= 0; i--) {
      const p = victoryParticles[i]
      p.life -= dt
      if (p.life <= 0) {
        scene.remove(p.mesh)
        victoryParticles.splice(i, 1)
        continue
      }
      p.velocity.y -= 9.8 * dt * 0.3
      p.mesh.position.addScaledVector(p.velocity, dt)
      p.mesh.rotation.x += dt * 4
      p.mesh.rotation.y += dt * 6
      const alpha = p.life / p.maxLife
      const t = 1 - alpha
      const color = p.startColor.clone().lerp(new THREE.Color(0xffffff), t)
      const mat = p.mesh.material as THREE.MeshBasicMaterial
      mat.color = color
      mat.opacity = alpha
      p.mesh.scale.setScalar(0.3 + t * 0.5)
    }
  }

  function updateTextParticles(dt: number): void {
    for (let i = textParticles.length - 1; i >= 0; i--) {
      const p = textParticles[i]
      p.life -= dt
      if (p.life <= 0) {
        scene.remove(p.mesh)
        textParticles.splice(i, 1)
        continue
      }
      p.mesh.position.addScaledVector(p.velocity, dt)
      p.velocity.multiplyScalar(0.96)
      const alpha = Math.min(1, p.life / p.maxLife * 2)
      const mat = p.mesh.material as THREE.MeshBasicMaterial
      mat.opacity = alpha
      p.mesh.scale.setScalar(0.6 + (1 - alpha) * 0.3)
    }
  }

  function triggerVictory(): VictoryState {
    victory.running = true
    victory.progress = 0
    spawnVictoryParticles()
    spawnTextParticles()
    goalSphere.scale.setScalar(3)
    setTimeout(() => { goalSphere.visible = false }, 200)
    return { ...victory }
  }

  function spawnVictoryParticles(): void {
    const baseColor = new THREE.Color(0xffdd44)
    const geo = new THREE.IcosahedronGeometry(0.15, 0)
    for (let i = 0; i < VICTORY_PARTICLE_COUNT; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: baseColor.clone().offsetHSL(Math.random() * 0.3 - 0.15, 0, Math.random() * 0.2 - 0.1),
        transparent: true,
        opacity: 1
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.copy(goalSphere.position)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = 2 + Math.random() * 3
      const v = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.abs(Math.cos(phi)) + 0.5,
        Math.sin(phi) * Math.sin(theta)
      ).multiplyScalar(speed)
      scene.add(mesh)
      victoryParticles.push({
        mesh, velocity: v,
        life: 2 + Math.random(),
        maxLife: 3,
        startColor: (mat as THREE.MeshBasicMaterial).color.clone()
      })
    }
  }

  function spawnTextParticles(): void {
    const centerX = mazeData.goalPosition.x
    const centerZ = mazeData.goalPosition.z
    const colors = [0xff4466, 0xffdd44, 0x00ff88, 0x6688ff, 0xff66cc, 0x66ffff]
    for (let i = 0; i < TEXT_PARTICLE_COUNT; i++) {
      const idx = i % VICTORY_TEXT_PATTERN.length
      const pattern = VICTORY_TEXT_PATTERN[idx]
      const jitterX = (Math.random() - 0.5) * 0.25
      const jitterY = (Math.random() - 0.5) * 0.25
      const geo = new THREE.SphereGeometry(0.08, 6, 6)
      const color = colors[Math.floor(Math.random() * colors.length)]
      const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0
      })
      const mesh = new THREE.Mesh(geo, mat)
      const targetY = WALL_HEIGHT + 4 + pattern.y
      const targetX = centerX + pattern.x
      const targetZ = centerZ
      mesh.position.set(
        targetX + (Math.random() - 0.5) * 6,
        1.5 + Math.random() * 3,
        targetZ + (Math.random() - 0.5) * 6
      )
      scene.add(mesh)
      const vx = (targetX - mesh.position.x) * 1.5 + jitterX * 2
      const vy = (targetY - mesh.position.y) * 1.2 + jitterY * 2
      const vz = (targetZ - mesh.position.z) * 1.5
      textParticles.push({
        mesh,
        velocity: new THREE.Vector3(vx, vy, vz),
        life: 3,
        maxLife: 3,
        startColor: new THREE.Color(color)
      })
    }
  }

  function isVictory(): boolean {
    return victory.progress >= 1
  }

  function cleanup(): void {
    scene.traverse(obj => {
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose?.()
      const m = (obj as THREE.Mesh).material
      if (Array.isArray(m)) m.forEach(x => x.dispose?.())
      else m?.dispose?.()
    })
  }

  return {
    scene, camera, goalSphere, goalLight,
    update, triggerVictory,
    getWallColliders: () => wallColliders,
    isVictory, cleanup
  }
}

function createWallMesh(
  wall: WallData,
  scene: THREE.Scene,
  optics: OpticsManager,
  colliders: THREE.Box3[]
): void {
  const isHoriz = wall.orientation === 'horizontal'
  const width = CELL_SIZE + WALL_THICKNESS * 2
  const height = WALL_HEIGHT
  const depth = WALL_THICKNESS

  let geo: THREE.BufferGeometry
  let posX = wall.x
  let posZ = wall.z
  let rotY = 0

  if (isHoriz) {
    geo = new THREE.BoxGeometry(width, height, depth)
  } else {
    geo = new THREE.BoxGeometry(depth, height, width)
    rotY = Math.PI / 2
  }

  const initialColor = hslToHex(wall.colorHue, 70, 55)
  const material = new THREE.MeshPhysicalMaterial({
    color: initialColor,
    metalness: wall.reflectivity,
    roughness: 1 - wall.reflectivity,
    transmission: wall.transparency * 0.7,
    thickness: 0.5,
    transparent: true,
    opacity: 0.92 - wall.transparency * 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: wall.reflectivity * 2,
    ior: 1.4,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(hslToHex(wall.colorHue, 50, 20)),
    emissiveIntensity: 0.1 + wall.reflectivity * 0.25
  })

  const mesh = new THREE.Mesh(geo, material)
  mesh.position.set(posX, height / 2, posZ)
  mesh.rotation.y = rotY
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)

  const edgeGeo = new THREE.EdgesGeometry(geo)
  const edgeMat = new THREE.LineBasicMaterial({
    color: hslToHex(wall.colorHue, 80, 70),
    transparent: true,
    opacity: 0.6
  })
  const edges = new THREE.LineSegments(edgeGeo, edgeMat)
  mesh.add(edges)

  optics.registerWall(wall.id, mesh, wall, material)

  const box = new THREE.Box3().setFromObject(mesh)
  box.expandByScalar(0.02)
  colliders.push(box)
}

function createGuideParticles(scene: THREE.Scene, mazeData: MazeData): GuideParticle[] {
  const result: GuideParticle[] = []
  const totalSize = GRID_SIZE * CELL_SIZE
  const half = totalSize / 2
  const geo = new THREE.SphereGeometry(0.1, 12, 12)
  const colors = [0xff66cc, 0x66ffcc, 0x6688ff, 0xffcc66, 0xcc66ff, 0x66ffff]

  const passableCells: { x: number; z: number }[] = []
  for (let r = 0; r < mazeData.gridSize; r++) {
    for (let c = 0; c < mazeData.gridSize; c++) {
      passableCells.push({
        x: c * CELL_SIZE - half + CELL_SIZE / 2,
        z: r * CELL_SIZE - half + CELL_SIZE / 2
      })
    }
  }

  let step = Math.ceil(passableCells.length / Math.ceil(totalSize / GUIDE_PARTICLE_SPACING))
  for (let i = 0; i < passableCells.length; i += step) {
    if (result.length >= 80) break
    const cell = passableCells[i]
    const dx = cell.x - mazeData.startPosition.x
    const dz = cell.z - mazeData.startPosition.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist < 3) continue

    const mat = new THREE.MeshBasicMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      transparent: true,
      opacity: 0.9
    })
    const mesh = new THREE.Mesh(geo, mat)
    const baseY = 1.0 + Math.random() * 1.5
    mesh.position.set(cell.x, baseY, cell.z)
    mesh.userData.baseColor = (mat as THREE.MeshBasicMaterial).color.clone()

    const light = new THREE.PointLight((mat as THREE.MeshBasicMaterial).color, 0.5, 4)
    mesh.add(light)

    scene.add(mesh)
    result.push({
      mesh,
      baseY,
      phase: Math.random() * Math.PI * 2
    })
  }

  return result
}

export { REFLECTION_TEXTURE_SIZE, MAX_TOTAL_PARTICLES }
