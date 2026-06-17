import * as THREE from 'three'

export interface RootNode {
  id: string
  position: THREE.Vector3
  children: RootNode[]
  parent: RootNode | null
  depth: number
  mesh: THREE.Mesh
  connections: THREE.Mesh[]
  plantType: 'wheat' | 'corn'
  waterContent: number
  originalColor: THREE.Color
  originalEmissiveIntensity: number
  capillaryCount: number
  highlighted: boolean
}

export interface RootSystem {
  nodes: Map<string, RootNode>
  rootGroup: THREE.Group
  wheatTotalWater: number
  cornTotalWater: number
  wheatWaterRate: number
  cornWaterRate: number
}

const NODE_RADIUS = 0.15
const CONNECTION_RADIUS = 0.05
const WHEAT_COLOR = 0x8B5E3C
const CORN_COLOR = 0x2E8B57
const MIN_DISTANCE = 0.35
const MAX_POSITION_ATTEMPTS = 15

export function addRoots(
  scene: THREE.Scene,
  containerSize: { width: number; height: number; depth: number }
): RootSystem {
  const rootGroup = new THREE.Group()
  const nodes = new Map<string, RootNode>()

  const existingPositions: THREE.Vector3[] = []

  const wheatNodes = generateWheatRoots(containerSize, existingPositions)
  wheatNodes.forEach((node) => nodes.set(node.id, node))

  const cornNodes = generateCornRoots(containerSize, existingPositions)
  cornNodes.forEach((node) => nodes.set(node.id, node))

  wheatNodes.forEach((node) => {
    rootGroup.add(node.mesh)
    node.connections.forEach((conn) => rootGroup.add(conn))
  })
  cornNodes.forEach((node) => {
    rootGroup.add(node.mesh)
    node.connections.forEach((conn) => rootGroup.add(conn))
  })

  scene.add(rootGroup)

  return {
    nodes,
    rootGroup,
    wheatTotalWater: 0,
    cornTotalWater: 0,
    wheatWaterRate: 0,
    cornWaterRate: 0
  }
}

function isPositionValid(
  pos: THREE.Vector3,
  existingPositions: THREE.Vector3[],
  minDistance: number = MIN_DISTANCE
): boolean {
  for (const existing of existingPositions) {
    if (pos.distanceTo(existing) < minDistance) {
      return false
    }
  }
  return true
}

function generateWheatRoots(
  containerSize: { width: number; height: number; depth: number },
  existingPositions: THREE.Vector3[]
): RootNode[] {
  const nodes: RootNode[] = []
  const baseX = -3
  const baseZ = 0
  const surfaceY = 0
  const maxDepth = 6

  const mainRootCount = 3
  for (let i = 0; i < mainRootCount; i++) {
    const angle = (i / mainRootCount) * Math.PI * 2
    const startX = baseX + Math.cos(angle) * 0.5
    const startZ = baseZ + Math.sin(angle) * 0.5

    const startPos = new THREE.Vector3(startX, surfaceY, startZ)
    if (!isPositionValid(startPos, existingPositions, 0.2)) {
      continue
    }
    existingPositions.push(startPos)

    const segments = 12
    let parentNode: RootNode | null = null
    let lastValidPos = startPos.clone()

    for (let j = 1; j <= segments; j++) {
      const t = j / segments
      const depthY = -t * maxDepth
      const wobbleX = Math.sin(t * Math.PI * 2 + i * 1.3) * 0.4 * t
      const wobbleZ = Math.cos(t * Math.PI * 1.5 + i * 0.9) * 0.3 * t

      let newPos: THREE.Vector3 | null = null
      for (let attempt = 0; attempt < MAX_POSITION_ATTEMPTS; attempt++) {
        const attemptWobbleX = wobbleX + (Math.random() - 0.5) * 0.15 * attempt
        const attemptWobbleZ = wobbleZ + (Math.random() - 0.5) * 0.15 * attempt

        const candidatePos = new THREE.Vector3(
          baseX + attemptWobbleX + (startX - baseX) * (1 - t * 0.4),
          depthY,
          baseZ + attemptWobbleZ + (startZ - baseZ) * (1 - t * 0.4)
        )

        const toParent = new THREE.Vector3().subVectors(candidatePos, lastValidPos)
        if (toParent.length() > 0.8) {
          toParent.setLength(0.7)
          candidatePos.copy(lastValidPos).add(toParent)
        }

        if (isPositionValid(candidatePos, existingPositions)) {
          newPos = candidatePos
          break
        }
      }

      if (!newPos) continue

      existingPositions.push(newPos)

      const nodeId = `wheat_main_${i}_${j}`
      const node = createRootNode(nodeId, newPos, 'wheat', parentNode, j)
      nodes.push(node)

      if (parentNode) {
        const connection = createConnection(parentNode.position, newPos, WHEAT_COLOR)
        parentNode.connections.push(connection)
      }

      if (j >= 3 && j <= 10 && j % 2 === 0) {
        const lateralCount = 2 + Math.floor(Math.random() * 2)
        for (let k = 0; k < lateralCount; k++) {
          const lateralAngle = (k / lateralCount) * Math.PI * 2 + i * 0.5 + Math.random() * 0.3
          const lateralLength = 1.0 + Math.random() * 1.2
          const lateralSegments = 3 + Math.floor(Math.random() * 2)

          let latParent = node
          let latLastPos = newPos.clone()

          for (let l = 1; l <= lateralSegments; l++) {
            const latT = l / lateralSegments
            const latDist = lateralLength * latT
            const latDepthOffset = -latDist * 0.4

            let latNodePos: THREE.Vector3 | null = null
            for (let attempt = 0; attempt < MAX_POSITION_ATTEMPTS; attempt++) {
              const angleOffset = (Math.random() - 0.5) * 0.4 * attempt
              const currentAngle = lateralAngle + angleOffset

              const candidateX = newPos.x + Math.cos(currentAngle) * latDist
              const candidateZ = newPos.z + Math.sin(currentAngle) * latDist
              const candidateY = newPos.y + latDepthOffset - Math.random() * 0.1 * attempt

              const clampedX = Math.max(-containerSize.width / 2 + 0.5, Math.min(containerSize.width / 2 - 0.5, candidateX))
              const clampedZ = Math.max(-containerSize.depth / 2 + 0.5, Math.min(containerSize.depth / 2 - 0.5, candidateZ))
              const clampedY = Math.max(-containerSize.height + 0.5, Math.min(0, candidateY))

              const candidatePos = new THREE.Vector3(clampedX, clampedY, clampedZ)

              const toParent = new THREE.Vector3().subVectors(candidatePos, latLastPos)
              if (toParent.length() > 0.6) {
                toParent.setLength(0.5)
                candidatePos.copy(latLastPos).add(toParent)
              }

              if (isPositionValid(candidatePos, existingPositions, 0.3)) {
                latNodePos = candidatePos
                break
              }
            }

            if (!latNodePos) break

            existingPositions.push(latNodePos)

            const latNodeId = `wheat_lat_${i}_${j}_${k}_${l}`
            const latNode = createRootNode(latNodeId, latNodePos, 'wheat', latParent, j + l)
            nodes.push(latNode)

            const latConnection = createConnection(latParent.position, latNodePos, WHEAT_COLOR)
            latParent.connections.push(latConnection)

            latParent = latNode
            latLastPos = latNodePos.clone()
          }
        }
      }

      parentNode = node
      lastValidPos = newPos.clone()
    }
  }

  return nodes
}

function generateCornRoots(
  containerSize: { width: number; height: number; depth: number },
  existingPositions: THREE.Vector3[]
): RootNode[] {
  const nodes: RootNode[] = []
  const baseX = 3
  const baseZ = 0
  const surfaceY = 0
  const maxDepth = 3

  const mainRootCount = 5
  for (let i = 0; i < mainRootCount; i++) {
    const angle = (i / mainRootCount) * Math.PI * 2 + Math.PI / mainRootCount
    const startX = baseX + Math.cos(angle) * 0.5
    const startZ = baseZ + Math.sin(angle) * 0.5

    const startPos = new THREE.Vector3(startX, surfaceY, startZ)
    if (!isPositionValid(startPos, existingPositions, 0.2)) {
      continue
    }
    existingPositions.push(startPos)

    const segments = 8
    let parentNode: RootNode | null = null
    let lastValidPos = startPos.clone()

    for (let j = 1; j <= segments; j++) {
      const t = j / segments
      const depthY = -t * maxDepth

      let newPos: THREE.Vector3 | null = null
      for (let attempt = 0; attempt < MAX_POSITION_ATTEMPTS; attempt++) {
        const horizontalSpread = t * (2.8 + Math.random() * 0.4 * attempt)
        const wobbleY = Math.sin(t * Math.PI * 3 + i + attempt * 0.2) * 0.15

        const candidateX = baseX + Math.cos(angle) * horizontalSpread + (Math.random() - 0.5) * 0.1 * attempt
        const candidateZ = baseZ + Math.sin(angle) * horizontalSpread + (Math.random() - 0.5) * 0.1 * attempt

        const clampedX = Math.max(-containerSize.width / 2 + 0.5, Math.min(containerSize.width / 2 - 0.5, candidateX))
        const clampedZ = Math.max(-containerSize.depth / 2 + 0.5, Math.min(containerSize.depth / 2 - 0.5, candidateZ))
        const clampedY = Math.max(-containerSize.height + 0.5, Math.min(0, depthY + wobbleY))

        const candidatePos = new THREE.Vector3(clampedX, clampedY, clampedZ)

        const toParent = new THREE.Vector3().subVectors(candidatePos, lastValidPos)
        if (toParent.length() > 0.7) {
          toParent.setLength(0.6)
          candidatePos.copy(lastValidPos).add(toParent)
        }

        if (isPositionValid(candidatePos, existingPositions)) {
          newPos = candidatePos
          break
        }
      }

      if (!newPos) continue

      existingPositions.push(newPos)

      const nodeId = `corn_main_${i}_${j}`
      const node = createRootNode(nodeId, newPos, 'corn', parentNode, j)
      nodes.push(node)

      if (parentNode) {
        const connection = createConnection(parentNode.position, newPos, CORN_COLOR)
        parentNode.connections.push(connection)
      }

      if (j >= 2 && j <= 6) {
        const fibrousCount = 3 + Math.floor(Math.random() * 3)
        for (let k = 0; k < fibrousCount; k++) {
          const fibAngle = angle + (k / fibrousCount - 0.5) * Math.PI * 0.9 + (Math.random() - 0.5) * 0.2
          const fibLength = 0.4 + Math.random() * 0.7

          let fibPos: THREE.Vector3 | null = null
          for (let attempt = 0; attempt < MAX_POSITION_ATTEMPTS; attempt++) {
            const angleOffset = (Math.random() - 0.5) * 0.3 * attempt
            const currentAngle = fibAngle + angleOffset
            const lengthVariation = fibLength * (0.8 + Math.random() * 0.4)

            const fibX = newPos.x + Math.cos(currentAngle) * lengthVariation
            const fibZ = newPos.z + Math.sin(currentAngle) * lengthVariation
            const fibY = newPos.y - 0.15 - Math.random() * 0.4

            const clampedFibX = Math.max(-containerSize.width / 2 + 0.3, Math.min(containerSize.width / 2 - 0.3, fibX))
            const clampedFibZ = Math.max(-containerSize.depth / 2 + 0.3, Math.min(containerSize.depth / 2 - 0.3, fibZ))
            const clampedFibY = Math.max(-containerSize.height + 0.3, Math.min(0, fibY))

            const candidatePos = new THREE.Vector3(clampedFibX, clampedFibY, clampedFibZ)

            if (isPositionValid(candidatePos, existingPositions, 0.25)) {
              fibPos = candidatePos
              break
            }
          }

          if (!fibPos) continue

          existingPositions.push(fibPos)

          const fibNodeId = `corn_fib_${i}_${j}_${k}`
          const fibNode = createRootNode(fibNodeId, fibPos, 'corn', node, j + 1)
          nodes.push(fibNode)

          const fibConnection = createConnection(node.position, fibPos, CORN_COLOR)
          node.connections.push(fibConnection)
        }
      }

      parentNode = node
      lastValidPos = newPos.clone()
    }
  }

  return nodes
}

function createRootNode(
  id: string,
  position: THREE.Vector3,
  plantType: 'wheat' | 'corn',
  parent: RootNode | null,
  depth: number
): RootNode {
  const color = plantType === 'wheat' ? WHEAT_COLOR : CORN_COLOR
  const geometry = new THREE.SphereGeometry(NODE_RADIUS, 16, 16)
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.7,
    metalness: 0.1,
    emissive: color,
    emissiveIntensity: 0.05
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(position)
  mesh.castShadow = true
  mesh.receiveShadow = true

  const capillaryCount = 3 + Math.floor(Math.random() * 8)

  const node: RootNode = {
    id,
    position: position.clone(),
    children: [],
    parent,
    depth,
    mesh,
    connections: [],
    plantType,
    waterContent: Math.random() * 20 + 10,
    originalColor: new THREE.Color(color),
    originalEmissiveIntensity: 0.05,
    capillaryCount,
    highlighted: false
  }

  if (parent) {
    parent.children.push(node)
  }

  mesh.userData.node = node

  return node
}

function createConnection(
  start: THREE.Vector3,
  end: THREE.Vector3,
  color: number
): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(end, start)
  const length = direction.length()

  const geometry = new THREE.CylinderGeometry(CONNECTION_RADIUS, CONNECTION_RADIUS, length, 8)
  geometry.translate(0, length / 2, 0)
  geometry.rotateX(Math.PI / 2)

  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.8,
    metalness: 0.05
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(start)
  mesh.lookAt(end)
  mesh.castShadow = true

  return mesh
}

export function highlightRoot(node: RootNode, _scene: THREE.Scene): void {
  const nodesToHighlight: RootNode[] = []

  const collectNodes = (n: RootNode, level: number) => {
    if (level > 2) return
    nodesToHighlight.push(n)
    n.children.forEach((child) => collectNodes(child, level + 1))
  }

  collectNodes(node, 0)

  const RAMP_UP_DURATION = 300
  const HOLD_DURATION = 1200
  const RAMP_DOWN_DURATION = 500
  const TOTAL_DURATION = RAMP_UP_DURATION + HOLD_DURATION + RAMP_DOWN_DURATION
  const MAX_INTENSITY_MULTIPLIER = 1.5

  const originalStates = nodesToHighlight.map((n) => ({
    node: n,
    emissiveIntensity: (n.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity,
    emissive: (n.mesh.material as THREE.MeshStandardMaterial).emissive.clone(),
    color: (n.mesh.material as THREE.MeshStandardMaterial).color.clone()
  }))

  const targetIntensity = 0.05 * MAX_INTENSITY_MULTIPLIER
  const brightColor = node.originalColor.clone().multiplyScalar(1.2)

  nodesToHighlight.forEach((n) => {
    n.highlighted = true
  })

  const startTime = performance.now()

  const animateHighlight = () => {
    const elapsed = performance.now() - startTime

    if (elapsed >= TOTAL_DURATION) {
      originalStates.forEach(({ node, emissiveIntensity, emissive, color }) => {
        const material = node.mesh.material as THREE.MeshStandardMaterial
        material.emissiveIntensity = emissiveIntensity
        material.emissive.copy(emissive)
        material.color.copy(color)
        node.highlighted = false
      })
      return
    }

    let t: number
    if (elapsed < RAMP_UP_DURATION) {
      t = elapsed / RAMP_UP_DURATION
      t = t * t * (3 - 2 * t)
    } else if (elapsed < RAMP_UP_DURATION + HOLD_DURATION) {
      t = 1
    } else {
      const fadeElapsed = elapsed - RAMP_UP_DURATION - HOLD_DURATION
      t = 1 - fadeElapsed / RAMP_DOWN_DURATION
      t = t * t * (3 - 2 * t)
    }

    originalStates.forEach(({ node, emissiveIntensity, emissive, color }) => {
      const material = node.mesh.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = emissiveIntensity + (targetIntensity - emissiveIntensity) * t
      const lerpedEmissive = emissive.clone().lerp(brightColor, t)
      material.emissive.copy(lerpedEmissive)
      const lerpedColor = color.clone().lerp(brightColor, t)
      material.color.copy(lerpedColor)
    })

    requestAnimationFrame(animateHighlight)
  }

  requestAnimationFrame(animateHighlight)
}

export function updateNodeWaterContent(node: RootNode, amount: number): void {
  node.waterContent = Math.min(100, node.waterContent + amount)

  const material = node.mesh.material as THREE.MeshStandardMaterial
  const saturationBoost = 1 + (node.waterContent / 100) * 0.1
  const newColor = node.originalColor.clone()
  newColor.multiplyScalar(saturationBoost)
  material.color.copy(newColor)
  material.emissive.copy(newColor)
}

export function getAllRootMeshes(rootSystem: RootSystem): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  rootSystem.nodes.forEach((node) => {
    meshes.push(node.mesh)
  })
  return meshes
}
