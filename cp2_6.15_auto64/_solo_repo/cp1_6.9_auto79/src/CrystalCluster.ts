import * as THREE from 'three'

export interface CrystalData {
  id: number
  position: THREE.Vector3
  rotation: THREE.Euler
  baseHeight: number
  currentHeight: number
  radius: number
  shapeType: 'hexPrism' | 'octahedron'
  opacity: number
  baseColor: THREE.Color
  currentColor: THREE.Color
  growthSpeed: number
  hasBranched: boolean
  mesh: THREE.Mesh | null
  glowMesh: THREE.Mesh | null
  branches: CrystalData[]
  flashIntensity: number
  isExploding: boolean
}

export interface ShardData {
  id: number
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  angularVelocity: THREE.Vector3
  life: number
  maxLife: number
  originalColor: THREE.Color
}

const CRYSTAL_COLORS = [
  new THREE.Color(0xffffff),
  new THREE.Color(0xe8d5ff),
  new THREE.Color(0xd4f0ff),
  new THREE.Color(0xffe4e8),
  new THREE.Color(0xffffcc),
  new THREE.Color(0xe5ffe8),
  new THREE.Color(0xffe0f0),
  new THREE.Color(0xd0f0ff),
]

let crystalIdCounter = 0

function createHexPrismGeometry(radius: number, height: number): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(radius, radius * 0.3, height, 6, 1, false)
  return geometry
}

function createOctahedronGeometry(radius: number, height: number): THREE.BufferGeometry {
  const geometry = new THREE.OctahedronGeometry(radius, 0)
  geometry.scale(1, height / radius / 2, 1)
  return geometry
}

export function createCrystalMaterial(
  color: THREE.Color,
  opacity: number
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: color,
    transparent: true,
    opacity: opacity,
    roughness: 0.1,
    metalness: 0.05,
    transmission: 0.3,
    thickness: 0.5,
    ior: 1.5,
    emissive: color,
    emissiveIntensity: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide,
  })
}

export function createGlowMaterial(opacity: number = 0.1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: opacity,
    side: THREE.BackSide,
    depthWrite: false,
  })
}

export function generateCrystalPosition(
  baseRadius: number,
  existingCrystals: CrystalData[],
  maxAttempts: number = 50
): THREE.Vector3 | null {
  for (let i = 0; i < maxAttempts; i++) {
    const angle = Math.random() * Math.PI
    const r = Math.random() * baseRadius
    const x = Math.cos(angle) * r
    const z = Math.sin(angle) * r
    const y = 0

    const position = new THREE.Vector3(x, y, z)

    let valid = true
    for (const crystal of existingCrystals) {
      const dist = position.distanceTo(crystal.position)
      const minDist = crystal.radius + 0.3
      if (dist < minDist) {
        valid = false
        break
      }
    }

    if (valid) {
      return position
    }
  }
  return null
}

export function createCrystal(
  position: THREE.Vector3,
  baseHeight: number,
  radius: number,
  shapeType: 'hexPrism' | 'octahedron'
): CrystalData {
  const opacity = 0.6 + Math.random() * 0.3
  const baseColor = CRYSTAL_COLORS[Math.floor(Math.random() * CRYSTAL_COLORS.length)].clone()
  const growthSpeed = 0.0001 + Math.random() * 0.0004

  const rotation = new THREE.Euler(
    (Math.random() - 0.5) * 0.1,
    Math.random() * Math.PI * 2,
    (Math.random() - 0.5) * 0.1
  )

  return {
    id: crystalIdCounter++,
    position: position.clone(),
    rotation,
    baseHeight,
    currentHeight: baseHeight,
    radius,
    shapeType,
    opacity,
    baseColor: baseColor.clone(),
    currentColor: baseColor.clone(),
    growthSpeed,
    hasBranched: false,
    mesh: null,
    glowMesh: null,
    branches: [],
    flashIntensity: 0,
    isExploding: false,
  }
}

export function generateCrystalCluster(count: number, baseRadius: number): CrystalData[] {
  const crystals: CrystalData[] = []

  for (let i = 0; i < count; i++) {
    const position = generateCrystalPosition(baseRadius, crystals)
    if (!position) continue

    const height = 0.5 + Math.random() * 2.5
    const radius = 0.2 + Math.random() * 0.6
    const shapeType: 'hexPrism' | 'octahedron' = Math.random() > 0.4 ? 'hexPrism' : 'octahedron'

    const crystal = createCrystal(position, height, radius, shapeType)
    crystals.push(crystal)
  }

  return crystals
}

export function buildCrystalMesh(crystal: CrystalData): THREE.Group {
  const group = new THREE.Group()

  const geometry = crystal.shapeType === 'hexPrism'
    ? createHexPrismGeometry(crystal.radius, crystal.currentHeight)
    : createOctahedronGeometry(crystal.radius, crystal.currentHeight)

  const material = createCrystalMaterial(crystal.currentColor, crystal.opacity)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData.crystalId = crystal.id

  crystal.mesh = mesh
  group.add(mesh)

  const glowGeometry = crystal.shapeType === 'hexPrism'
    ? createHexPrismGeometry(crystal.radius * 1.3, crystal.currentHeight * 1.1)
    : createOctahedronGeometry(crystal.radius * 1.3, crystal.currentHeight * 1.1)
  const glowMaterial = createGlowMaterial(0.1)
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial)
  glowMesh.position.y = 0
  crystal.glowMesh = glowMesh
  group.add(glowMesh)

  group.position.copy(crystal.position)
  group.rotation.copy(crystal.rotation)

  return group
}

export function updateCrystalGrowth(
  crystal: CrystalData,
  crystalGroup: THREE.Group,
  scene: THREE.Scene,
  newCrystalsCallback?: (newCrystal: CrystalData) => void
): void {
  if (crystal.isExploding) return

  crystal.currentHeight += crystal.growthSpeed

  const growthRatio = crystal.currentHeight / crystal.baseHeight
  if (growthRatio >= 1.5 && !crystal.hasBranched && Math.random() < 0.003) {
    crystal.hasBranched = true

    const branchHeight = crystal.currentHeight * 0.3
    const branchRadius = crystal.radius * 0.5

    const branchAngle = 15 + Math.random() * 30
    const branchDir = Math.random() > 0.5 ? 1 : -1
    const branchRotationY = Math.random() * Math.PI * 2

    const branchPosition = new THREE.Vector3(
      crystal.position.x + Math.sin(branchRotationY) * crystal.radius * 0.5 * branchDir,
      crystal.position.y + crystal.currentHeight * 0.4,
      crystal.position.z + Math.cos(branchRotationY) * crystal.radius * 0.5 * branchDir
    )

    const branchShape: 'hexPrism' | 'octahedron' = Math.random() > 0.5 ? 'hexPrism' : 'octahedron'
    const branch = createCrystal(branchPosition, branchHeight, branchRadius, branchShape)
    branch.rotation.x = (branchAngle * Math.PI / 180) * branchDir
    branch.rotation.y = branchRotationY

    crystal.branches.push(branch)
    newCrystalsCallback?.(branch)
  }

  const hsl = { h: 0, s: 0, l: 0 }
  crystal.baseColor.getHSL(hsl)
  const darkenFactor = Math.min(1, (growthRatio - 1) * 2)
  hsl.h = (hsl.h * 360 - 10 * darkenFactor) / 360
  hsl.s = Math.min(1, hsl.s + 0.1 * darkenFactor)
  hsl.l = Math.max(0.3, hsl.l - 0.15 * darkenFactor)
  crystal.currentColor.setHSL(hsl.h, hsl.s, hsl.l)

  if (crystal.mesh) {
    const oldGeom = crystal.mesh.geometry
    const newGeom = crystal.shapeType === 'hexPrism'
      ? createHexPrismGeometry(crystal.radius, crystal.currentHeight)
      : createOctahedronGeometry(crystal.radius, crystal.currentHeight)
    crystal.mesh.geometry.dispose()
    crystal.mesh.geometry = newGeom
    oldGeom.dispose()
    ;(crystal.mesh.material as THREE.MeshPhysicalMaterial).color.copy(crystal.currentColor)
    ;(crystal.mesh.material as THREE.MeshPhysicalMaterial).opacity = crystal.opacity * (1 - 0.15 * darkenFactor)
  }

  if (crystal.glowMesh) {
    const oldGlowGeom = crystal.glowMesh.geometry
    const newGlowGeom = crystal.shapeType === 'hexPrism'
      ? createHexPrismGeometry(crystal.radius * 1.3, crystal.currentHeight * 1.1)
      : createOctahedronGeometry(crystal.radius * 1.3, crystal.currentHeight * 1.1)
    crystal.glowMesh.geometry.dispose()
    crystal.glowMesh.geometry = newGlowGeom
    oldGlowGeom.dispose()
  }

  if (crystal.flashIntensity > 0) {
    crystal.flashIntensity -= 0.02
    if (crystal.flashIntensity < 0) crystal.flashIntensity = 0
    if (crystal.mesh) {
      (crystal.mesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 
        0.3 + crystal.flashIntensity * 1.2
    }
  } else {
    if (crystal.mesh) {
      (crystal.mesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.3
    }
  }
}

export function explodeCrystal(
  crystal: CrystalData,
  scene: THREE.Scene,
  shards: ShardData[],
  allCrystals: CrystalData[]
): ShardData[] {
  if (crystal.isExploding) return []

  crystal.isExploding = true
  const newShards: ShardData[] = []

  const shardCount = 30 + Math.floor(Math.random() * 20)

  if (crystal.mesh) {
    crystalGroupFor(crystal, scene)?.remove(crystal.mesh)
    crystal.mesh.geometry.dispose()
    ;(crystal.mesh.material as THREE.Material).dispose()
  }
  if (crystal.glowMesh) {
    crystalGroupFor(crystal, scene)?.remove(crystal.glowMesh)
    crystal.glowMesh.geometry.dispose()
    ;(crystal.glowMesh.material as THREE.Material).dispose()
  }

  for (let i = 0; i < shardCount; i++) {
    const shardSize = 0.05 + Math.random() * 0.15
    const shardGeom = new THREE.TetrahedronGeometry(shardSize)

    const shardMat = new THREE.MeshPhysicalMaterial({
      color: crystal.currentColor.clone(),
      transparent: true,
      opacity: 0.9,
      roughness: 0.2,
      metalness: 0.1,
      emissive: crystal.currentColor.clone(),
      emissiveIntensity: 0.5,
    })

    const shardMesh = new THREE.Mesh(shardGeom, shardMat)
    shardMesh.position.copy(crystal.position)
    shardMesh.position.y += crystal.currentHeight * 0.3

    const direction = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      Math.random() * 1.5,
      (Math.random() - 0.5) * 2
    ).normalize()

    const speed = 0.5 + Math.random() * 1.5
    const velocity = direction.multiplyScalar(speed)

    const angularVelocity = new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8
    )

    const shard: ShardData = {
      id: crystal.id * 1000 + i,
      mesh: shardMesh,
      velocity,
      angularVelocity,
      life: 0.8,
      maxLife: 0.8,
      originalColor: crystal.currentColor.clone(),
    }

    newShards.push(shard)
    scene.add(shardMesh)
  }

  for (const other of allCrystals) {
    if (other.id === crystal.id || other.isExploding) continue
    const dist = other.position.distanceTo(crystal.position)
    if (dist < 1.5) {
      other.flashIntensity = 1
    }
  }

  for (const branch of crystal.branches) {
    if (!branch.isExploding) {
      newShards.push(...explodeCrystal(branch, scene, shards, allCrystals))
    }
  }

  return newShards
}

function crystalGroupFor(crystal: CrystalData, _scene: THREE.Scene): THREE.Group | null {
  if (crystal.mesh && crystal.mesh.parent instanceof THREE.Group) {
    return crystal.mesh.parent as THREE.Group
  }
  return null
}

export function updateShards(shards: ShardData[], deltaTime: number, scene: THREE.Scene): ShardData[] {
  const gravity = -2
  const activeShards: ShardData[] = []

  for (const shard of shards) {
    shard.life -= deltaTime

    if (shard.life <= 0) {
      scene.remove(shard.mesh)
      shard.mesh.geometry.dispose()
      ;(shard.mesh.material as THREE.Material).dispose()
      continue
    }

    shard.velocity.y += gravity * deltaTime
    shard.mesh.position.add(shard.velocity.clone().multiplyScalar(deltaTime))

    shard.mesh.rotation.x += shard.angularVelocity.x * deltaTime
    shard.mesh.rotation.y += shard.angularVelocity.y * deltaTime
    shard.mesh.rotation.z += shard.angularVelocity.z * deltaTime

    const lifeRatio = shard.life / shard.maxLife

    const whiteColor = new THREE.Color(0xffffff)
    const blendedColor = shard.originalColor.clone().lerp(whiteColor, 1 - lifeRatio)
    ;(shard.mesh.material as THREE.MeshPhysicalMaterial).color.copy(blendedColor)
    ;(shard.mesh.material as THREE.MeshPhysicalMaterial).emissive.copy(blendedColor)
    ;(shard.mesh.material as THREE.MeshPhysicalMaterial).opacity = Math.min(1, lifeRatio * 1.5)

    activeShards.push(shard)
  }

  return activeShards
}
